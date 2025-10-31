import * as React from "react";
import { useState, useMemo } from "react";
// import Header from "./components/Header";
import PhotoGallery from "./components/PhotoGallery";
import ImageEditorModal from "./components/ImageEditorModal";
import FolderList from "./components/FolderList";
import { Image } from "./types";
import { Web } from "sp-pnp-js";

const App: React.FC = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const web = new Web(
    "https://grueneweltweit.sharepoint.com/sites/GrueneWeltweit/Washington/webstudio"
  );
  function guidToNumber(guid: string): number {
    const hex = guid.replace(/-/g, "");
    const num = parseInt(hex.slice(0, 12), 16);
    return num;
  }
  const libraryName = "PublishingImages";
  const siteRelative = "/sites/GrueneWeltweit/Washington/webstudio";

  const fetchData = async () => {
    setLoading(true);
    try {
      const libraryRoot = web.getFolderByServerRelativeUrl(
        `${siteRelative}/${libraryName}`
      );
      const subFolders = await libraryRoot.folders
        .select("Name", "ServerRelativeUrl", "UniqueId")
        .get();
      const filteredFolders = subFolders
        .filter((f: any) => f.Name !== "Forms" && !f.Name.startsWith("_"))
        .map((f: any) => ({ id: guidToNumber(f.UniqueId), name: f.Name }));

      setFolders(filteredFolders);

      const items = await web.lists
        .getById("8a54a424-5c8f-4106-af7f-f5bed7b23c9d")
        .items.select(
          "Id",
          "Title",
          "Description",
          "FileLeafRef",
          "EncodedAbsUrl",
          "ImageWidth",
          "ImageHeight",
          "CopyrightInfo",
          "UniqueId",
          "Modified"
        )
        .getAll();

      const getFolderId = (fileUrl: string) => {
        try {
          const url = new URL(fileUrl);
          const pathSegments = url.pathname.split("/").filter(Boolean);
          for (let i = pathSegments.length - 2; i >= 0; i--) {
            const segment = decodeURIComponent(pathSegments[i]).toLowerCase();
            const folder = filteredFolders.find(
              (f: any) => f.name.toLowerCase() === segment
            );
            if (folder) return folder.id;
          }
          return null;
        } catch (err) {
          console.error("Error parsing folder from URL:", err);
          return null;
        }
      };
      const mappedImages = items
        .map((item: any) => {
          const fileUrl = item.EncodedAbsUrl || item.FileRef;
          if (fileUrl && fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
            // Add version query to bust cache — use Modified date or UniqueId
            const versionParam =
              item.Modified || item.UniqueId || Date.now().toString();
            const cacheBustedUrl = `${fileUrl}?v=${encodeURIComponent(
              versionParam
            )}`;

            return {
              id: item.Id,
              folderId: getFolderId(fileUrl),
              src: cacheBustedUrl,
              name: item.FileLeafRef,
              title: item.Title || item.FileLeafRef,
              description: item.Description || "",
              copyright: item.CopyrightInfo || "",
              UniqueId: item.UniqueId,
            };
          }
          return null;
        })
        .filter(Boolean);
      setImages(mappedImages);
      setLoading(false);
    } catch (error) {
      console.error("Data fetching error:", error);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingImage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (image: Image) => {
    setEditingImage(image);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingImage(null);
  };

  // Utility to convert base64 to Blob
  const base64ToBlob = (base64: string, contentType = "image/jpeg") => {
    const byteCharacters = atob(base64.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  const handleSaveImage = async (
    savedImage: Omit<Image, "id"> & { id?: number; UniqueId?: string }
  ) => {
    try {
      const folder = folders.find((f) => f.id === savedImage.folderId);
      if (!folder) {
        console.error("Folder not found for folderId:", savedImage.folderId);
        return;
      }

      const folderPath = `${siteRelative}/${libraryName}/${folder.name}`;
      const list = web.lists.getById("8a54a424-5c8f-4106-af7f-f5bed7b23c9d");

      if (!savedImage.src.startsWith("data:image")) {
        console.error("Image src is not a base64 string.");
        return;
      }
      const blob = base64ToBlob(savedImage.src);
      if (savedImage.id) {
        try {
          const existingItem = await list.items
            .getById(Number(savedImage.id))
            .select("Id", "FileRef", "FileLeafRef")
            .get();

          if (!existingItem || !existingItem.FileRef) {
            console.warn("No existing item found for ID:", savedImage.id);
            return;
          }

          const oldFileRef = existingItem.FileRef;
          const oldFileName = existingItem.FileLeafRef;
          const file = web.getFileByServerRelativeUrl(oldFileRef);

          // Replace file content
          await file.setContentChunked(blob);

          // Rename file if needed
          if (savedImage.name && savedImage.name !== oldFileName) {
            const newFileUrl = `${folderPath}/${savedImage.name}`;
            await file.moveTo(newFileUrl, 1);
          }

          // Update metadata
          const updatedFile = web.getFileByServerRelativeUrl(
            `${folderPath}/${savedImage.name || oldFileName}`
          );
          const item = await updatedFile.getItem();
          await item.update({
            Title: savedImage.title || "",
            Description: savedImage.description || "",
            CopyrightInfo: savedImage.copyright || "",
            Modified: new Date().toISOString(),
          });
          await fetchData();
        } catch (err) {
          console.error("Error updating image:", err);
        }
      } else {
        const folder = web.getFolderByServerRelativeUrl(folderPath);

        const existingFiles = await folder.files
          .filter(`Name eq '${savedImage.name}'`)
          .select("Name")
          .get();

        let finalFileName = savedImage.name;

        if (existingFiles.length > 0) {
          const extension = savedImage.name.includes(".")
            ? savedImage.name.substring(savedImage.name.lastIndexOf("."))
            : "";
          const baseName = savedImage.name.replace(extension, "");
          finalFileName = `${baseName}_${Date.now()}${extension}`;
        }
        const fileAddResult = await folder.files.add(
          finalFileName,
          blob,
          false
        );

        const file = fileAddResult.file;
        const listItem = await file.listItemAllFields.select("Id").get();

        await list.items.getById(listItem.Id).update({
          Title: savedImage.title || "",
          Description: savedImage.description || "",
          CopyrightInfo: savedImage.copyright || "",
          FileLeafRef: finalFileName, 
        });
      }
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving image to SharePoint:", error);
    }
  };
  const handleSelectFolder = (folderId: number) => {
    setSelectedFolderId(folderId);
  };

  const filteredImages = useMemo(() => {
    if (selectedFolderId === 0) {
      // "All Images"
      return images;
    }
    return images.filter((img) => img.folderId === selectedFolderId);
  }, [images, selectedFolderId]);

  const selectedFolderName = useMemo(() => {
    if (selectedFolderId === 0) return "All Images";
    return folders.find((f) => f.id === selectedFolderId)?.name || "";
  }, [folders, selectedFolderId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading images...</p>
      </div>
    );
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* <Header /> */}
       <main className="container-fluid mt-4" style={{ flex: '1 1 auto', overflowY: 'hidden' }}>
          <div className="row h-100">
              <aside className="col-lg-3 h-100">
            <FolderList
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
            />
          </aside>
          <section className="col-lg-9 h-100">
            <PhotoGallery
              images={filteredImages}
              galleryTitle={selectedFolderName}
              onAddImage={handleOpenAddModal}
              onEditImage={handleOpenEditModal}
            />
          </section>
        </div>
      </main>
    </div>
      {isModalOpen && (
        <ImageEditorModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveImage}
          imageToEdit={editingImage}
          folders={folders}
          images={images}
        />
      )}

    
    </>
  );
};

export default App;

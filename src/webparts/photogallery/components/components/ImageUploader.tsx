import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { Image } from "./../types";

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  images: Image[];
}

type UploadMethod =
  | "selection"
  | "upload"
  | "url"
  | "paste"
  | "gallery";

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  images,
}) => {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("selection");
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetState = useCallback(() => {
    setError(null);
    setIsLoading(false);
    setImageUrl("");
    setIsDragging(false);
  }, []);

  const handleMethodSelect = (method: UploadMethod) => {
    resetState();
    setUploadMethod(method);
  };

  const fetchImageAsFile = useCallback(
    async (url: string, filename: string): Promise<File | null> => {
      try {
        // Use a CORS proxy for external URLs to avoid tainted canvas issues.
        // For data URLs or internal URLs, fetch directly.
        // const fetchUrl = url.startsWith("data:")
        //   ? url
        //   : `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image. Server responded with ${response.status}. Please check the URL and ensure it allows cross-origin requests.`
          );
        }
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) {
          throw new Error(
            "The fetched file is not an image. Please provide a URL to a valid image file."
          );
        }
        return new File([blob], filename, { type: blob.type });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An unknown error occurred while fetching the image.";
        setError(errorMessage);
        console.error("Error fetching image:", err);
        return null;
      }
    },
    []
  );

  // --- Upload Tab Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onImageUpload(e.dataTransfer.files[0]);
      }
    },
    [onImageUpload]
  );

  // --- URL Tab Logic ---
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setError("Please enter an image URL.");
      return;
    }
    setError(null);
    setIsLoading(true);
    const file = await fetchImageAsFile(imageUrl, "image-from-url.png");
    if (file) {
      onImageUpload(file);
    }
    setIsLoading(false);
  };

// --- Paste Tab Logic ---
useEffect(() => {
  if (uploadMethod === "paste") {
    const handlePaste = (e: ClipboardEvent) => {

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            onImageUpload(file);
            break; // stop after first image
          }
        }
      }
    };

    // ✅ Attach listener to `window`
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }
}, [uploadMethod, onImageUpload]);


  // --- Gallery Tab Logic ---
  const handleSelectFromGallery = async (image: Image) => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    const file = await fetchImageAsFile(image.src, image.name);
    if (file) {
      onImageUpload(file);
    }
      // Always stop loading after the operation is complete.
      // fetchImageAsFile handles setting the error state on failure.
      setIsLoading(false);
  };

  const SelectionCard = ({
    icon,
    title,
    description,
    onClick,
  }: {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
  }) => (
    <div className="col">
      <div
        className="card h-100 text-center shadow-sm"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      >
        <div className="card-body d-flex flex-column justify-content-center align-items-center p-4">
          <i
            className={`bi ${icon} text-primary`}
            style={{ fontSize: "2.5rem" }}
          ></i>
          <h6 className="card-title mt-3 mb-1">{title}</h6>
          <p className="card-text small text-muted">{description}</p>
        </div>
      </div>
    </div>
  );

  const renderSelectionScreen = () => (
    <div className="text-center">
      <h5 className="mb-4">How would you like to add an image?</h5>

      <div className="row row-cols-2 row-cols-md-4 g-3">
        <SelectionCard
          icon="bi-upload"
          title="Upload"
          description="From your device"
          onClick={() => handleMethodSelect("upload")}
        />
        <SelectionCard
          icon="bi-link-45deg"
          title="From URL"
          description="Import via link"
          onClick={() => handleMethodSelect("url")}
        />
        <SelectionCard
          icon="bi-clipboard-plus"
          title="Paste"
          description="From clipboard"
          onClick={() => handleMethodSelect("paste")}
        />
        <SelectionCard
          icon="bi-collection"
          title="From Gallery"
          description="Use existing image"
          onClick={() => handleMethodSelect("gallery")}
        />
      </div>
    </div>
  );

  const BackButton = () => (
    <button
      className="btn btn-link ps-0 mb-3"
      onClick={() => handleMethodSelect("selection")}
    >
      <i className="bi bi-arrow-left me-2"></i>Back to options
    </button>
  );

  return (
    <div style={{ minHeight: "300px" }}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {uploadMethod === "selection" && renderSelectionScreen()}

      {uploadMethod === "upload" && (
        <div>
          <BackButton />
          <div
            className={`text-center p-5 border-2 rounded-3 ${
              isDragging
                ? "border-primary bg-primary-subtle"
                : "border-secondary"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ borderStyle: "dashed" }}
          >
            <i
              className="bi bi-cloud-arrow-up-fill text-secondary"
              style={{ fontSize: "4rem" }}
            ></i>
            <h2 className="mt-3">Upload Your Image</h2>
            <p className="text-muted">
              Drag & drop a file here or click to select a file
            </p>
            <input
              type="file"
              id="file-upload"
              className="d-none"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="btn btn-primary mt-3">
              <i className="bi bi-folder2-open me-2"></i>Choose File
            </label>
          </div>
        </div>
      )}

      {uploadMethod === "url" && (
        <div>
          <BackButton />
          <div className="d-flex flex-column justify-content-center align-items-center h-100 p-4">
            <h4 className="mb-3">Load Image from a URL</h4>
            <form
              onSubmit={handleUrlSubmit}
              className="w-100"
              style={{ maxWidth: "600px" }}
            >
              <div className="input-group">
                <input
                  type="url"
                  className="form-control form-control-lg"
                  placeholder="https://example.com/image.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>{" "}
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-down-circle me-2"></i>Load
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {uploadMethod === "paste" && (
  <div
    className="text-center p-5 border-2 border-dashed rounded-3 border-secondary d-flex flex-column justify-content-center align-items-center"
    style={{ height: "250px" }}
  >
    <i
      className="bi bi-clipboard-check-fill text-secondary"
      style={{ fontSize: "4rem" }}
    ></i>
    <h2 className="mt-3">Paste Image</h2>
    <p className="text-muted fs-5">
      Just press <kbd>Ctrl</kbd>+<kbd>V</kbd> (or <kbd>Cmd</kbd>+<kbd>V</kbd>) anywhere on the page.
    </p>
  </div>
)}

      {uploadMethod === "gallery" && (
        <div>
          <BackButton />
          <div className="d-flex flex-column justify-content-center h-100">
            <h4 className="mb-3 text-center">Select from your gallery</h4>
            {isLoading && (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading image...</p>
              </div>
            )}
            {!isLoading && (
              <div
                className="row g-2"
                style={{ maxHeight: "260px", overflowY: "auto" }}
              >
                {images.length > 0 ? (
                  images.map((image) => (
                    <div key={image.id} className="col-4 col-md-3">
                      <img
                        src={image.src}
                        alt={image.title}
                        className="img-fluid rounded"
                        style={{
                          cursor: "pointer",
                          objectFit: "cover",
                          width: "100%",
                          height: "100px",
                        }}
                        onClick={() => handleSelectFromGallery(image)}
                        role="button"
                        aria-label={`Select image: ${image.title}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSelectFromGallery(image);
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-12 text-center text-muted">
                    <p>Your gallery is empty.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

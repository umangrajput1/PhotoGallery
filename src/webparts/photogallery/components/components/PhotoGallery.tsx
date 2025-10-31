import { useState, useMemo } from "react";
import { Image } from "../types";
import * as React from "react";

interface PhotoGalleryProps {
  images: Image[];
  galleryTitle: string;
  onAddImage: () => void;
  onEditImage: (image: Image) => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  images,
  galleryTitle,
  onAddImage,
  onEditImage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) {
      return images;
    }
    return images.filter((image) =>
      image.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0 text-nowrap">
            Gallery: <span className="text-success">{galleryTitle}</span>
          </h4>
          <div
            style={{
              position: "relative",
              minWidth: "350px",
              maxWidth: "450px",
            }}
          >
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingRight: "35px", // space for icon
                boxSizing: "border-box",
              }}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              viewBox="0 0 16 16"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#0b5345",
              }}
            >
              <path
                d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 
                                    3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 
                                    6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
              />
            </svg>
          </div>
        </div>
        <button className="btn btn-success btn-lg" onClick={onAddImage}>
          <i className="bi bi-plus-circle-fill me-2"></i>Add New Image
        </button>
      </div>
      <div className="row g-4 flex-grow-1" style={{ overflowY: "auto" }}>
        {filteredImages.length > 0 ? (
          filteredImages.map((image) => (
            <div key={image.id} className="col-xl-4 col-md-6">
              <div className="card h-120 shadow-sm d-flex flex-column">
                <img
                  src={image.src}
                  className="card-img-top"
                  alt={image.title}
                  style={{ height: "250px", objectFit: "cover" }}
                />
                <div className="card-body">
                  <h5 className="card-title">{image.title || "Untitled"}</h5>
                  <p className="card-text text-muted small">
                    {image.description || ""}
                  </p>
                </div>
                <div className="card-footer bg-transparent border-top-0">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => onEditImage(image)}
                  >
                    <i className="bi bi-pencil-square me-2"></i>Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="text-center p-5 bg-light rounded">
              {searchQuery ? (
                <>
                  <h2>No results found for "{searchQuery}"</h2>
                  <p className="lead text-muted">
                    Please try a different search term.
                  </p>
                </>
              ) : (
                <>
                  <h2>This folder is empty!</h2>
                  <p className="lead text-muted">
                    Click "Add New Image" to upload an image to this folder, or
                    select another folder.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoGallery;

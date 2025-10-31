import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactCrop, {type Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import ImageUploader from './ImageUploader';
import { Image, Folder, FilterType, Dimensions } from '../types';

interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (image: Omit<Image, 'id'> & { id?: number }) => void;
    imageToEdit: Image | null;
    folders: Folder[];
    images: Image[];
    imagesLength: number;
}

const BLANK_IMAGE_STATE: Omit<Image, 'id' | 'folderId'> & { folderId: number | '' } = {
    src: '',
    name: '',
    title: '',
    description: '',
    copyright: '',
    folderId: '',
};

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imagesLength, isOpen, onClose, onSave, imageToEdit, folders, images }) => {
    const [editedImage, setEditedImage] = useState<Omit<Image, 'id' | 'src' | 'folderId'> & { id?: number, src: string | null, folderId: number | '' }>(BLANK_IMAGE_STATE);
    
    const imgRef = useRef<HTMLImageElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [rotation, setRotation] = useState(0);
    const [activeFilter, setActiveFilter] = useState<FilterType>(FilterType.NONE);
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    const [isPreviewHovered, setIsPreviewHovered] = useState(false);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
    console.log("imagess length", imagesLength)


    const resetEditorState = useCallback(() => {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setRotation(0);
        setActiveFilter(FilterType.NONE);
        setDimensions({ width: 0, height: 0 });
        const defaultFolderId = folders.length > 0 ? folders[0].id : '';
        setEditedImage({ ...BLANK_IMAGE_STATE, folderId: defaultFolderId });
        setPreviewDataUrl(null);
    }, [folders]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
            if (imageToEdit) {
                setEditedImage(imageToEdit);
            } else {
                resetEditorState();
            }
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen, imageToEdit, resetEditorState]);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
        setDimensions({ width, height });
        setCrop({
            unit: '%',
            width: 100,
            height: 100,
            x: 0,
            y: 0,
        });
        setCompletedCrop(undefined);
    }, []);
    
    const applyEdits = useCallback(() => {
        const image = imgRef.current;
        const canvas = previewCanvasRef.current;
        if (!image || !canvas || !image.complete || image.naturalWidth === 0) {
            return;
        }
    
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        const cropToUse = completedCrop;
        const targetWidth = cropToUse ? cropToUse.width * scaleX : image.naturalWidth;
        const targetHeight = cropToUse ? cropToUse.height * scaleY : image.naturalHeight;
    
        canvas.width = dimensions.width || targetWidth;
        canvas.height = dimensions.height || targetHeight;
    
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.filter = activeFilter;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
        const sourceX = cropToUse ? cropToUse.x * scaleX : 0;
        const sourceY = cropToUse ? cropToUse.y * scaleY : 0;
        const sourceWidth = cropToUse ? cropToUse.width * scaleX : image.naturalWidth;
        const sourceHeight = cropToUse ? cropToUse.height * scaleY : image.naturalHeight;
    
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }, [completedCrop, rotation, activeFilter, dimensions]);
    
    useEffect(() => {
        if (editedImage.src) {
            applyEdits();
            if (previewCanvasRef.current) {
                setPreviewDataUrl(previewCanvasRef.current.toDataURL('image/png'));
            }
        }
    }, [applyEdits, editedImage.src]);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setEditedImage(prev => ({
              ...prev,
              src: reader.result as string,
              name: file.name,
              title: prev.title || '',
              description: prev.description || '',
              copyright: prev.copyright || '',
          }));
        });
        reader.readAsDataURL(file);
    };

    const handlePropertyChange = (field: string, value: string | number) => {
        setEditedImage(prev => ({ ...prev, [field]: value }));
    };

    const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDimensions(prev => ({...prev, [name]: parseInt(value) || 0}));
    };
    
    const handleFilterChange = (filter: FilterType) => {
      setActiveFilter(filter);
    };

    const handleSave = () => {
        if (!editedImage.src || !previewCanvasRef.current) return;
        if (!imageToEdit && !editedImage.folderId) {
            alert('Please select a folder for the new image.');
            return;
        }
        
        applyEdits();
        const finalImageSrc = previewCanvasRef.current.toDataURL('image/png');
        
        const finalImage: Omit<Image, 'id'> & { id?: number } = {
            ...editedImage,
            src: finalImageSrc || editedImage.src,
            folderId: editedImage.folderId as number, // Cast since we validate it's not empty
        };
        onSave(finalImage);
    };

        const handleCopyAndSave = () => {
        if (!editedImage.src || !previewCanvasRef.current) return;

        applyEdits();
        const finalImageSrc = previewCanvasRef.current.toDataURL('image/png');

        // Create a new image object, but without the ID
        const { id, ...imageWithoutId } = editedImage;

        const finalImage: Omit<Image, 'id'> = {
            ...imageWithoutId,
            src: finalImageSrc || editedImage.src,
            folderId: editedImage.folderId as number,
            title: editedImage.title ? `${editedImage.title}_Copy${imagesLength+1}` : "", // Add (Copy) to title
            name: editedImage.name, // Add prefix to name
        };
        onSave(finalImage);
    };

    if (!isOpen) return null;
    
    const controlsDisabled = !editedImage.src;

    return (
        <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal addNewImageModal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog">
                <div className="modal-dialog custom-modal-width modal-dialog-centered">

                    <div className="modal-content">
                        <div className="modal-header p-3">
                            <h5 className="modal-title">{imageToEdit ? `Editing: ${editedImage.title || editedImage.name}` : 'Add New Image'}</h5>
                            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                        </div>
                        <div className="modal-body addimg">
                            <div className="row g-4 h-100">
                                {/* Left Column: Uploader & Controls */}
                                <div className="col-lg-4 d-flex flex-column">
                                    <div className="mb-4">
                                        <h6>{editedImage.src ? 'Replace Image' : '1. Upload an Image'}</h6>
                                        <ImageUploader onImageUpload={handleImageUpload} images={images} />
                                    </div>
                                    <div className="flex-grow-1" style={{opacity: controlsDisabled ? 0.6 : 1, pointerEvents: controlsDisabled ? 'none' : 'auto'}}>
                                        <h6>2. Adjust & Edit</h6>
                                        <div className="accordion" id="editorControlsAccordion">
                                            {/* Resize */}
                                             <div className="accordion-item">
                                                <h2 className="accordion-header">
                                                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseResize" aria-expanded="true">
                                                        <i className="bi bi-aspect-ratio me-2"></i>Resize
                                                    </button>
                                                </h2>
                                                <div id="collapseResize" className="accordion-collapse collapse" data-bs-parent="#editorControlsAccordion">
                                                    <div className="accordion-body">
                                                        <div className="input-group mb-2">
                                                          <span className="input-group-text" style={{width: '40px'}}>W</span>
                                                          <input type="number" className="form-control" name="width" value={dimensions.width} onChange={handleDimensionChange} />
                                                        </div>
                                                        <div className="input-group">
                                                          <span className="input-group-text" style={{width: '40px'}}>H</span>
                                                          <input type="number" className="form-control" name="height" value={dimensions.height} onChange={handleDimensionChange} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Rotate */}
                                            <div className="accordion-item">
                                                <h2 className="accordion-header">
                                                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseRotate">
                                                       <i className="bi bi-arrow-clockwise me-2"></i>Rotate
                                                    </button>
                                                </h2>
                                                <div id="collapseRotate" className="accordion-collapse collapse" data-bs-parent="#editorControlsAccordion">
                                                    <div className="accordion-body">
                                                        <div className="d-flex gap-2">
                                                          <button className="btn btn-outline-secondary w-100" onClick={() => setRotation(r => r - 90)}><i className="bi bi-arrow-counterclockwise"></i> Left</button>
                                                          <button className="btn btn-outline-secondary w-100" onClick={() => setRotation(r => r + 90)}>Right <i className="bi bi-arrow-clockwise"></i></button>
                                                        </div>
                                                         <p className="text-muted text-center mt-2">Current: {rotation}°</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Filters */}
                                            <div className="accordion-item">
                                                <h2 className="accordion-header">
                                                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFilters">
                                                       <i className="bi bi-palette me-2"></i>Filters
                                                    </button>
                                                </h2>
                                                <div id="collapseFilters" className="accordion-collapse collapse" data-bs-parent="#editorControlsAccordion">
                                                    <div className="accordion-body">
                                                        <div className="btn-group w-100" role="group">
                                                            <button type="button" className={`btn ${activeFilter === FilterType.NONE ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleFilterChange(FilterType.NONE)}>None</button>
                                                            <button type="button" className={`btn ${activeFilter === FilterType.GRAYSCALE ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleFilterChange(FilterType.GRAYSCALE)}>Grayscale</button>
                                                            <button type="button" className={`btn ${activeFilter === FilterType.SEPIA ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleFilterChange(FilterType.SEPIA)}>Sepia</button>
                                                            <button type="button" className={`btn ${activeFilter === FilterType.INVERT ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleFilterChange(FilterType.INVERT)}>Invert</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Image Properties */}
                                            <div className="accordion-item">
                                                <h2 className="accordion-header">
                                                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseProperties" aria-expanded="true">
                                                       <i className="bi bi-card-text me-2"></i>Image Properties
                                                    </button>
                                                </h2>
                                                <div id="collapseProperties" className="accordion-collapse collapse" data-bs-parent="#editorControlsAccordion">
                                                    <div className="accordion-body">
                                                        {!imageToEdit && (
                                                            <div className="mb-3">
                                                                <label htmlFor="folderId" className="form-label small fw-bold text-danger">Select Folder*</label>
                                                                <select
                                                                    id="folderId"
                                                                    className="form-select"
                                                                    value={editedImage.folderId}
                                                                    onChange={(e) => handlePropertyChange('folderId', parseInt(e.target.value))}
                                                                    required
                                                                >
                                                                    <option value="" disabled>Choose a folder...</option>
                                                                    {folders.map(folder => (
                                                                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <div className="mb-2">
                                                            <label htmlFor="imageName" className="form-label small">Name</label>
                                                            <input type="text" id="imageName" className="form-control" value={editedImage.name} onChange={(e) => handlePropertyChange('name', e.target.value)} placeholder="e.g., my-vacation-photo.png"/>
                                                        </div>
                                                        <div className="mb-2">
                                                            <label htmlFor="title" className="form-label small">Title</label>
                                                            <input type="text" id="title" className="form-control" value={editedImage.title} onChange={(e) => handlePropertyChange('title', e.target.value)} placeholder="e.g., Sunset at the Beach"/>
                                                        </div>
                                                        <div className="mb-2">
                                                            <label htmlFor="description" className="form-label small">Description</label>
                                                            <textarea id="description" className="form-control" rows={3} value={editedImage.description} onChange={(e) => handlePropertyChange('description', e.target.value)} placeholder="A brief description of the image."></textarea>
                                                        </div>
                                                        <div>
                                                            <label htmlFor="copyright" className="form-label small">Copyright</label>
                                                            <input type="text" id="copyright" className="form-control" value={editedImage.copyright} onChange={(e) => handlePropertyChange('copyright', e.target.value)} placeholder="e.g., © 2024 Your Name"/>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Right Column: Editor & Preview */}
                                <div className="col-lg-8 d-flex flex-column h-100">
                                    {!editedImage.src ? (
                                        <div className="d-flex justify-content-center align-items-center h-100 border rounded bg-light">
                                            <div className="text-center text-muted">
                                                <i className="bi bi-image" style={{fontSize: '6rem'}}></i>
                                                <h4 className="mt-3">Image Preview Area</h4>
                                                <p>Upload an image to start editing.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-secondary bg-opacity-10 p-3 rounded text-center d-flex align-items-center justify-content-center flex-grow-1" style={{ minHeight: 0 }}>
                                                <ReactCrop
                                                  crop={crop}
                                                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                                                  onComplete={(c) => setCompletedCrop(c)}
                                                >
                                                  <img
                                                    ref={imgRef}
                                                    src={editedImage.src}
                                                    alt="Upload Preview"
                                                    onLoad={onImageLoad}
                                                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                                  />
                                                </ReactCrop>
                                            </div>
                                            <div className="mt-3 flex-shrink-0">
                                                <h6 className="text-muted text-center mb-2">Live Preview</h6>
                                                <div
                                                    className="position-relative text-center"
                                                    onMouseEnter={() => setIsPreviewHovered(true)}
                                                    onMouseLeave={() => setIsPreviewHovered(false)}
                                                >
                                                    <canvas
                                                        ref={previewCanvasRef}
                                                        className="border rounded shadow-sm mx-auto"
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '15vh',
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                    {isPreviewHovered && previewDataUrl && (
                                                        <div
                                                            className="position-absolute p-1 bg-white border rounded shadow-lg"
                                                            style={{
                                                                bottom: '100%',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                marginBottom: '10px',
                                                                width: 'auto',
                                                                maxWidth: '400px',
                                                                zIndex: 1056
                                                            }}
                                                        >
                                                            <img
                                                                src={previewDataUrl}
                                                                alt="Large preview of edits"
                                                                style={{
                                                                    width: '100%',
                                                                    height: 'auto',
                                                                    objectFit: 'contain'
                                                                }}
                                                            />
                                                            <div className="text-center small text-muted bg-light p-1">Large Preview</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer p-3">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            {imageToEdit && (
                                <button type="button" className="btn btn-success" onClick={handleCopyAndSave} disabled={controlsDisabled}>
                                    <i className="bi bi-copy me-2"></i>Copy & Save as New
                                </button>
                            )}
                            <button type="button" className="btn btn-success" onClick={handleSave} disabled={controlsDisabled}>
                                {imageToEdit ? 'Save Changes' : 'Save Image'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImageEditorModal;
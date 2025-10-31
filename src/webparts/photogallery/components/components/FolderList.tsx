import * as React from 'react';
import {Folder } from './../types';

interface FolderListProps {
    folders: (Folder & { imageCount: number })[];
    totalImageCount: number;
    selectedFolderId: number;
    onSelectFolder: (folderId: number) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folders, totalImageCount, selectedFolderId, onSelectFolder }) => {
    return (
        <div className="card h-100 d-flex flex-column">
            <div className="card-header flex-shrink-0">
                <h5 className="mb-0">Folders</h5>
            </div>
             <div className="list-group list-group-flush" style={{ overflowY: 'auto' }}>
                 <button
                    type="button"
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedFolderId === 0 ? 'active' : ''}`}
                    onClick={() => onSelectFolder(0)}
                >
                    <div className="fw-bold">
                        <i className="bi bi-images me-2"></i>All Images
                    </div>
                    <span className="badge bg-success rounded-pill">{totalImageCount}</span>
                </button>
                {folders.map(folder => (
                    <button
                        key={folder.id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedFolderId === folder.id ? 'active' : ''}`}
                        onClick={() => onSelectFolder(folder.id)}
                    >
                        <span>
                            <i className="bi bi-folder me-2"></i>{folder.name}
                        </span>
                        <span className="badge bg-success rounded-pill">{folder.imageCount}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FolderList;

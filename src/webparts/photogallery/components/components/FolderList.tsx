import * as React from 'react';
import {Folder } from './../types';

interface FolderListProps {
    folders: Folder[];
    selectedFolderId: number;
    onSelectFolder: (folderId: number) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folders, selectedFolderId, onSelectFolder }) => {
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
                        {/* You could add a badge with image count here later */}
                        {/* <span className="badge bg-secondary rounded-pill">14</span> */}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FolderList;

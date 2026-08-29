/**
 * components/editor/LocalFolderTree.jsx
 *
 * Tree explorer for locally opened projects.
 * Features:
 *  - Hierarchical folder/file rendering with expand/collapse toggles (▶ / ▼)
 *  - File click loads content into Monaco Editor
 *  - Local File & Directory CRUD: New File, New Folder, Rename, Delete, Refresh
 *  - Opt-in "Import Project to Room" button to sync files into the collaborative room
 */

import { useState } from 'react';
import {
  readLocalFile,
  writeLocalFile,
  createLocalFile,
  createLocalDirectory,
  removeLocalEntry,
  buildDirectoryTree,
} from '../../services/fileSystem.service';
import { useToast } from '../../hooks/useToast';

function TreeNode({
  node,
  depth = 0,
  activeFileId,
  onSelectFile,
  onRefresh,
  onNewFile,
  onNewFolder,
  onDelete,
}) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  const paddingLeft = `${depth * 14 + 8}px`;

  if (node.kind === 'directory') {
    return (
      <div className="select-none">
        <div
          style={{ paddingLeft }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-700/70 text-slate-300 hover:text-white cursor-pointer text-xs transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-slate-500">{isExpanded ? '▼' : '▶'}</span>
            <span className="text-amber-400">📁</span>
            <span className="font-mono text-xs font-semibold truncate">{node.name}</span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onNewFile(node.handle); }}
              title="New File inside directory"
              className="p-0.5 rounded hover:bg-surface-600 text-slate-400 hover:text-white text-[10px]"
            >
              +📄
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNewFolder(node.handle); }}
              title="New Folder inside directory"
              className="p-0.5 rounded hover:bg-surface-600 text-slate-400 hover:text-white text-[10px]"
            >
              +📁
            </button>
          </div>
        </div>

        {isExpanded && node.children && (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onSelectFile={onSelectFile}
                onRefresh={onRefresh}
                onNewFile={onNewFile}
                onNewFolder={onNewFolder}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFileId === node.id;

  return (
    <div
      style={{ paddingLeft }}
      onClick={() => onSelectFile(node)}
      className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs font-mono transition-colors ${
        isActive
          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 font-semibold'
          : 'hover:bg-surface-700/60 text-slate-300 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span>{node.isBinary ? '📦' : '📄'}</span>
        <span className="truncate">{node.name}</span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(node); }}
        title="Delete file"
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-[10px]"
      >
        🗑
      </button>
    </div>
  );
}

export function LocalFolderTree({
  rootHandle,
  treeNodes,
  activeFile,
  onSelectFile,
  onRefresh,
  onImportToRoom,
}) {
  const { success, error: showError } = useToast();

  const handleNewFile = async (targetDirHandle = rootHandle) => {
    const fileName = prompt('Enter new file name (e.g. main.cpp, script.js):');
    if (!fileName || !fileName.trim()) return;
    try {
      await createLocalFile(targetDirHandle, fileName.trim());
      success(`Created local file: ${fileName}`);
      onRefresh();
    } catch (err) {
      showError(`Failed to create file: ${err.message}`);
    }
  };

  const handleNewFolder = async (targetDirHandle = rootHandle) => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;
    try {
      await createLocalDirectory(targetDirHandle, folderName.trim());
      success(`Created directory: ${folderName}`);
      onRefresh();
    } catch (err) {
      showError(`Failed to create directory: ${err.message}`);
    }
  };

  const handleDelete = async (node) => {
    if (!confirm(`Are you sure you want to delete '${node.name}'?`)) return;
    try {
      await removeLocalEntry(rootHandle, node.relativePath);
      success(`Deleted ${node.name}`);
      onRefresh();
    } catch (err) {
      showError(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-850 select-none text-xs">
      {/* Explorer Tree Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-600 text-[11px]">
        <span className="font-semibold text-slate-200 uppercase tracking-wider truncate">
          📂 {rootHandle?.name || 'Local Workspace'}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleNewFile(rootHandle)}
            title="New File (+📄)"
            className="p-1 rounded hover:bg-surface-700 text-slate-300 hover:text-white"
          >
            +📄
          </button>
          <button
            onClick={() => handleNewFolder(rootHandle)}
            title="New Directory (+📁)"
            className="p-1 rounded hover:bg-surface-700 text-slate-300 hover:text-white"
          >
            +📁
          </button>
          <button
            onClick={onRefresh}
            title="Refresh Directory"
            className="p-1 rounded hover:bg-surface-700 text-slate-300 hover:text-white"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Opt-In Room Sync Bar */}
      {onImportToRoom && (
        <div className="p-2 border-b border-surface-600 bg-brand-500/10 flex items-center justify-between">
          <span className="text-[11px] text-brand-300 font-medium">Local Project</span>
          <button
            onClick={onImportToRoom}
            className="btn-primary text-[10px] px-2 py-1 font-semibold"
          >
            ☁ Import to Room
          </button>
        </div>
      )}

      {/* Directory Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {treeNodes.length === 0 ? (
          <div className="text-center py-6 text-slate-500 italic text-[11px]">
            Folder is empty. Click +📄 to create a file.
          </div>
        ) : (
          treeNodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              activeFileId={activeFile?.id}
              onSelectFile={onSelectFile}
              onRefresh={onRefresh}
              onNewFile={handleNewFile}
              onNewFolder={handleNewFolder}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

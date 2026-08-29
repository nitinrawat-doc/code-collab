/**
 * components/editor/LocalFolderTree.jsx
 *
 * Tree explorer for locally opened projects with VS Code-style inline file/folder creation
 * and right-click context menus.
 */

import { useState, useEffect, useRef } from 'react';
import {
  createLocalFile,
  createLocalDirectory,
  removeLocalEntry,
  readLocalFile,
  checkEntryExists,
} from '../../services/fileSystem.service';
import { useToast } from '../../hooks/useToast';

function InlineCreationInput({ type, depth, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleDone = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (name.trim()) {
      onSubmit(name.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDone();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      submittedRef.current = true;
      onCancel();
    }
  };

  const paddingLeft = `${depth * 14 + 8}px`;

  return (
    <div style={{ paddingLeft }} className="flex items-center gap-1.5 py-1 px-2 bg-surface-800 border border-brand-500/60 rounded my-0.5">
      <span className="text-xs">{type === 'file' ? '📄' : '📁'}</span>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleDone}
        placeholder={type === 'file' ? 'filename.ext (e.g. main.cpp)' : 'folder_name'}
        className="bg-surface-900 text-xs font-mono text-white px-1.5 py-0.5 rounded border border-surface-600 outline-none w-full focus:border-brand-400"
      />
    </div>
  );
}

function TreeNode({
  node,
  depth = 0,
  activeFileId,
  onSelectFile,
  onStartCreate,
  onDelete,
  onContextMenu,
  creationState,
  onSubmitCreate,
  onCancelCreate,
}) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const paddingLeft = `${depth * 14 + 8}px`;

  const isCreatingHere = creationState && creationState.parentHandle === node.handle;

  if (node.kind === 'directory') {
    return (
      <div className="select-none">
        <div
          style={{ paddingLeft }}
          onClick={() => setIsExpanded(!isExpanded)}
          onContextMenu={(e) => onContextMenu(e, node)}
          className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-700/70 text-slate-300 hover:text-white cursor-pointer text-xs transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-slate-500">{isExpanded ? '▼' : '▶'}</span>
            <span className="text-amber-400">📁</span>
            <span className="font-mono text-xs font-semibold truncate">{node.name}</span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
                onStartCreate('file', node.handle);
              }}
              title="New File inside directory"
              className="p-0.5 rounded hover:bg-surface-600 text-slate-400 hover:text-white text-[10px]"
            >
              +📄
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
                onStartCreate('folder', node.handle);
              }}
              title="New Folder inside directory"
              className="p-0.5 rounded hover:bg-surface-600 text-slate-400 hover:text-white text-[10px]"
            >
              +📁
            </button>
          </div>
        </div>

        {/* Render Inline Creation Input inside folder if active */}
        {isExpanded && isCreatingHere && (
          <InlineCreationInput
            type={creationState.type}
            depth={depth + 1}
            onSubmit={(name) => onSubmitCreate(name, node.handle)}
            onCancel={onCancelCreate}
          />
        )}

        {isExpanded && node.children && (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onSelectFile={onSelectFile}
                onStartCreate={onStartCreate}
                onDelete={onDelete}
                onContextMenu={onContextMenu}
                creationState={creationState}
                onSubmitCreate={onSubmitCreate}
                onCancelCreate={onCancelCreate}
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
      onContextMenu={(e) => onContextMenu(e, node)}
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
  creationTrigger,
  onClearCreationTrigger,
}) {
  const { success, error: showError } = useToast();
  const [contextMenu, setContextMenu] = useState(null);

  // VS Code-style inline creation state: { type: 'file' | 'folder', parentHandle: FileSystemDirectoryHandle }
  const [creationState, setCreationState] = useState(null);

  // Respond to header creation triggers
  useEffect(() => {
    if (creationTrigger) {
      setCreationState({ type: creationTrigger.type, parentHandle: rootHandle });
      if (onClearCreationTrigger) onClearCreationTrigger();
    }
  }, [creationTrigger, rootHandle, onClearCreationTrigger]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleStartCreate = (type, parentHandle = rootHandle) => {
    setContextMenu(null);
    setCreationState({ type, parentHandle });
  };

  const handleSubmitCreate = async (name, parentHandle = rootHandle) => {
    if (!name || !name.trim()) {
      setCreationState(null);
      return;
    }
    const targetType = creationState?.type || 'file';
    setCreationState(null);

    const cleanName = name.trim();

    try {
      if (targetType === 'file') {
        const fileHandle = await createLocalFile(parentHandle, cleanName);
        success(`Created file: ${cleanName}`);
        await onRefresh();

        // Auto-select and open the newly created file in Monaco Editor
        const ext = cleanName.split('.').pop();
        const relPath = `${parentHandle.name === rootHandle.name ? '' : parentHandle.name + '/'}${cleanName}`;
        onSelectFile({
          id: relPath,
          name: cleanName,
          kind: 'file',
          handle: fileHandle,
          relativePath: relPath,
          language: ext,
        });
      } else {
        await createLocalDirectory(parentHandle, cleanName);
        success(`Created folder: ${cleanName}`);
        await onRefresh();
      }
    } catch (err) {
      showError(err.message || 'Failed to create item');
    }
  };

  const handleDelete = async (node) => {
    setContextMenu(null);
    if (!confirm(`Are you sure you want to delete '${node.name}'?`)) return;
    try {
      await removeLocalEntry(rootHandle, node.relativePath);
      success(`Deleted ${node.name}`);
      await onRefresh();
    } catch (err) {
      showError(`Failed to delete: ${err.message}`);
    }
  };

  const isCreatingAtRoot = creationState && creationState.parentHandle === rootHandle;

  return (
    <div className="flex flex-col h-full bg-surface-850 select-none text-xs relative">
      {/* Explorer Tree Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-600 text-[11px]">
        <span className="font-semibold text-slate-200 uppercase tracking-wider truncate">
          📂 {rootHandle?.name || 'Local Workspace'}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCreate('file', rootHandle)}
            title="New File (+📄)"
            className="p-1 rounded hover:bg-surface-700 text-slate-300 hover:text-white"
          >
            +📄
          </button>
          <button
            onClick={() => handleStartCreate('folder', rootHandle)}
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
      <div
        onContextMenu={(e) => handleContextMenu(e, { kind: 'directory', handle: rootHandle, name: rootHandle?.name })}
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        {/* Inline Creation Input at Root */}
        {isCreatingAtRoot && (
          <InlineCreationInput
            type={creationState.type}
            depth={0}
            onSubmit={(name) => handleSubmitCreate(name, rootHandle)}
            onCancel={() => setCreationState(null)}
          />
        )}

        {treeNodes.length === 0 && !isCreatingAtRoot ? (
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
              onStartCreate={handleStartCreate}
              onDelete={handleDelete}
              onContextMenu={handleContextMenu}
              creationState={creationState}
              onSubmitCreate={handleSubmitCreate}
              onCancelCreate={() => setCreationState(null)}
            />
          ))
        )}
      </div>

      {/* Right-Click Context Menu Floating Portal */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-44 bg-surface-800 border border-surface-600 rounded-lg shadow-2xl py-1 text-slate-200 text-xs font-mono select-none"
        >
          {contextMenu.node.kind === 'directory' ? (
            <>
              <button
                onClick={() => handleStartCreate('file', contextMenu.node.handle)}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>+📄</span> New File
              </button>
              <button
                onClick={() => handleStartCreate('folder', contextMenu.node.handle)}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>+📁</span> New Folder
              </button>
              {contextMenu.node.handle !== rootHandle && (
                <button
                  onClick={() => handleDelete(contextMenu.node)}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2 border-t border-surface-700"
                >
                  <span>🗑</span> Delete Folder
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => { setContextMenu(null); onSelectFile(contextMenu.node); }}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 flex items-center gap-2"
              >
                <span>📄</span> Open File
              </button>
              <button
                onClick={() => handleDelete(contextMenu.node)}
                className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2 border-t border-surface-700"
              >
                <span>🗑</span> Delete File
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

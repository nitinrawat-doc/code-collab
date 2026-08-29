/**
 * components/editor/CreateItemModal.jsx
 *
 * VS Code-style File and Folder Creation Dialog.
 * Shared creation handler for both Enter key and [ Create ] button.
 */

import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import {
  checkEntryExists,
  createLocalFile,
  createLocalDirectory,
  getLanguageFromFileName,
} from '../../services/fileSystem.service';
import { historyService } from '../../services/sessionService';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../../hooks/useToast';

export function CreateItemModal({
  isOpen,
  onClose,
  type = 'file', // 'file' | 'folder'
  mode = 'local', // 'local' | 'room'
  targetDirHandle = null,
  rootHandle = null,
  existingRoomFiles = [],
  onRefreshLocal,
  onRefreshRoomFiles,
  onSelectLocalFile,
}) {
  const { roomCode, setCode, setLanguage, setVersion, emitCodeChange, version } = useRoom();
  const { success, error: showError } = useToast();

  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setValidationError('');
      setSubmitting(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleCreateFile = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;

    setValidationError('');

    // 1. Validation: Empty name check
    if (!name || !name.trim()) {
      setValidationError('Filename cannot be empty.');
      return;
    }

    const cleanName = name.trim();

    // 2. Validation: Invalid character check
    if (/[\\/:*?"<>|]/.test(cleanName)) {
      setValidationError('Filename contains invalid characters (\\ / : * ? " < > |)');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'local' && targetDirHandle) {
        // Local Project Mode
        const exists = await checkEntryExists(targetDirHandle, cleanName);
        if (exists) {
          setValidationError(`A file or folder named '${cleanName}' already exists.`);
          setSubmitting(false);
          return;
        }

        if (type === 'file') {
          const fileHandle = await createLocalFile(targetDirHandle, cleanName);
          success(`Created local file: ${cleanName}`);
          if (onRefreshLocal) await onRefreshLocal();

          const ext = cleanName.split('.').pop();
          const parentName = targetDirHandle.name === rootHandle?.name ? '' : targetDirHandle.name + '/';
          const relPath = `${parentName}${cleanName}`;

          if (onSelectLocalFile) {
            onSelectLocalFile({
              id: relPath,
              name: cleanName,
              kind: 'file',
              handle: fileHandle,
              relativePath: relPath,
              language: ext,
            });
          }
        } else {
          await createLocalDirectory(targetDirHandle, cleanName);
          success(`Created local folder: ${cleanName}`);
          if (onRefreshLocal) await onRefreshLocal();
        }
      } else {
        // Room Files Mode (or fallback when no local folder open)
        const isDuplicate = existingRoomFiles.some(
          (f) => (f.label || '').toLowerCase() === cleanName.toLowerCase()
        );
        if (isDuplicate) {
          setValidationError(`A room file named '${cleanName}' already exists.`);
          setSubmitting(false);
          return;
        }

        const lang = getLanguageFromFileName(cleanName);
        const initialCode = type === 'file' ? `// ${cleanName}\n` : '';

        await historyService.save(roomCode, {
          code: initialCode,
          language: lang,
          label: cleanName,
        });

        const newVer = version + 1;
        setCode(initialCode);
        setLanguage(lang);
        setVersion(newVer);
        emitCodeChange(roomCode, initialCode, lang, newVer);

        if (onRefreshRoomFiles) await onRefreshRoomFiles();
        success(`Created room file: ${cleanName}`);
      }

      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateFile();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const modalTitle = type === 'file' ? 'Create New File' : 'Create New Folder';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`📄 ${modalTitle}`} size="sm">
      <form onSubmit={handleCreateFile} className="space-y-4 text-xs font-mono select-none">
        <div>
          <label className="label text-slate-300 mb-1 block">
            {type === 'file' ? 'File Name (e.g. main.cpp, utils.h, app.py)' : 'Folder Name'}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) setValidationError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={type === 'file' ? 'main.cpp' : 'my_folder'}
            className="input w-full font-mono text-xs text-white bg-surface-900 border-surface-600 focus:border-brand-400"
          />
          {validationError && (
            <p className="text-red-400 text-[11px] mt-1.5 font-sans font-medium flex items-center gap-1">
              <span>⚠️</span> {validationError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-3.5 py-1.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs px-4 py-1.5 font-semibold flex items-center gap-1.5"
          >
            {submitting ? <Spinner size="sm" /> : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

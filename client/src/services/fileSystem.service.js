/**
 * services/fileSystem.service.js
 *
 * Web File System Access API service for local projects.
 * Features:
 *  - Native directory picker (showDirectoryPicker)
 *  - Recursive hierarchical tree construction
 *  - Extension language mapping
 *  - Binary file detection
 *  - Disk read & write handle operations (createWritable)
 *  - Local file & directory CRUD operations
 */

const EXT_LANG_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  cpp: 'cpp',
  c: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  java: 'java',
  html: 'html',
  css: 'css',
  json: 'json',
  md: 'markdown',
  txt: 'plaintext',
  sh: 'shell',
};

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'pdf',
  'zip', 'tar', 'gz', '7z', 'rar', 'exe', 'dll', 'so',
  'dylib', 'bin', 'dat', 'iso', 'mp3', 'mp4', 'wav', 'avi',
]);

export const isFileSystemAccessSupported = () => {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
};

export const getLanguageFromFileName = (fileName = '') => {
  const parts = fileName.split('.');
  if (parts.length < 2) return 'javascript';
  const ext = parts.pop().toLowerCase();
  return EXT_LANG_MAP[ext] || 'plaintext';
};

export const isBinaryFile = (fileName = '') => {
  const parts = fileName.split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop().toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
};

export const checkEntryExists = async (dirHandle, entryName) => {
  if (!dirHandle || !entryName) return false;
  try {
    await dirHandle.getFileHandle(entryName);
    return true;
  } catch {
    try {
      await dirHandle.getDirectoryHandle(entryName);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Recursively builds hierarchical tree from FileSystemDirectoryHandle
 */
export const buildDirectoryTree = async (dirHandle, relativePath = '') => {
  const nodes = [];

  for await (const [name, handle] of dirHandle.entries()) {
    // Ignore hidden files / node_modules for performance
    if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'build') {
      continue;
    }

    const currentPath = relativePath ? `${relativePath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await buildDirectoryTree(handle, currentPath);
      nodes.push({
        id: currentPath,
        name,
        kind: 'directory',
        handle,
        relativePath: currentPath,
        children,
        isExpanded: false,
      });
    } else {
      nodes.push({
        id: currentPath,
        name,
        kind: 'file',
        handle,
        relativePath: currentPath,
        language: getLanguageFromFileName(name),
        isBinary: isBinaryFile(name),
      });
    }
  }

  // Sort directories first, then files alphabetically
  nodes.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });

  return nodes;
};

export const readLocalFile = async (fileHandle) => {
  const file = await fileHandle.getFile();
  const text = await file.text();
  return text;
};

export const writeLocalFile = async (fileHandle, content) => {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

export const createLocalFile = async (dirHandle, fileName) => {
  const exists = await checkEntryExists(dirHandle, fileName);
  if (exists) {
    throw new Error(`A file or folder named '${fileName}' already exists.`);
  }
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write('');
  await writable.close();
  return fileHandle;
};

export const createLocalDirectory = async (dirHandle, dirName) => {
  const exists = await checkEntryExists(dirHandle, dirName);
  if (exists) {
    throw new Error(`A file or folder named '${dirName}' already exists.`);
  }
  const subDirHandle = await dirHandle.getDirectoryHandle(dirName, { create: true });
  return subDirHandle;
};

export const removeLocalEntry = async (dirHandle, entryName) => {
  await dirHandle.removeEntry(entryName, { recursive: true });
};

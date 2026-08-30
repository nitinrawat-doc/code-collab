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
  cc: 'cpp',
  cxx: 'cpp',
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

export const normalizeLanguage = (lang = '') => {
  if (!lang) return 'javascript';
  const l = lang.toLowerCase().trim();
  if (l === 'cpp' || l === 'c++' || l === 'cc' || l === 'cxx' || l === 'c' || l === 'h' || l === 'hpp') return 'cpp';
  if (l === 'py' || l === 'python') return 'python';
  if (l === 'js' || l === 'jsx' || l === 'javascript') return 'javascript';
  if (l === 'ts' || l === 'tsx' || l === 'typescript') return 'typescript';
  if (l === 'java') return 'java';
  if (l === 'html') return 'html';
  if (l === 'css') return 'css';
  if (l === 'json') return 'json';
  if (l === 'md' || l === 'markdown') return 'markdown';
  return l;
};

export const getLanguageFromFileName = (fileName = '') => {
  if (!fileName) return 'javascript';
  const parts = fileName.split('.');
  if (parts.length < 2) return 'javascript';
  const ext = parts.pop().toLowerCase();
  return EXT_LANG_MAP[ext] || 'javascript';
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

export const buildDirectoryTree = async (dirHandle, currentPath = '') => {
  const nodes = [];

  for await (const [name, handle] of dirHandle.entries()) {
    // Ignore hidden files and node_modules / git
    if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'build') {
      continue;
    }

    const nodePath = currentPath ? `${currentPath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await buildDirectoryTree(handle, nodePath);
      nodes.push({
        id: nodePath,
        name,
        kind: 'directory',
        handle,
        relativePath: nodePath,
        children,
      });
    } else {
      nodes.push({
        id: nodePath,
        name,
        kind: 'file',
        handle,
        relativePath: nodePath,
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
  return await dirHandle.getDirectoryHandle(dirName, { create: true });
};

export const removeLocalEntry = async (parentDirHandle, relativePath) => {
  const parts = relativePath.split('/');
  const targetName = parts.pop();

  let currentDir = parentDirHandle;
  for (const dirName of parts) {
    currentDir = await currentDir.getDirectoryHandle(dirName);
  }

  await currentDir.removeEntry(targetName, { recursive: true });
};

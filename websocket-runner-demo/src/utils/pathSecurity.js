const path = require('path');

function sanitizeRelativePath(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('Path file tidak valid');
  }

  const normalizedPath = filePath
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\/+/, '');

  if (
    normalizedPath.includes('\0') ||
    normalizedPath.startsWith('/') ||
    path.isAbsolute(normalizedPath) ||
    /^[a-zA-Z]:/.test(normalizedPath)
  ) {
    throw new Error(`Path file berbahaya: ${filePath}`);
  }

  const parts = normalizedPath.split('/');

  if (parts.some((part) => part === '..' || part === '')) {
    throw new Error(`Path file berbahaya: ${filePath}`);
  }

  return normalizedPath;
}

function isSafeRelativePath(filePath) {
  try {
    sanitizeRelativePath(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveInsideBase(baseDir, relativePath) {
  const safePath = sanitizeRelativePath(relativePath);
  const resolvedBaseDir = path.resolve(baseDir);
  const targetPath = path.resolve(resolvedBaseDir, safePath);

  if (
    targetPath !== resolvedBaseDir &&
    !targetPath.startsWith(resolvedBaseDir + path.sep)
  ) {
    throw new Error(`Path keluar dari folder workspace: ${relativePath}`);
  }

  return targetPath;
}

module.exports = {
  sanitizeRelativePath,
  isSafeRelativePath,
  resolveInsideBase,
};


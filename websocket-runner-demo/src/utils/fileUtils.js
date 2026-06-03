const fs = require('fs');
const path = require('path');

function normalizeProjectPath(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('Path file tidak valid');
  }

  const normalizedPath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');

  if (
    normalizedPath.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalizedPath) ||
    normalizedPath.includes('\0')
  ) {
    throw new Error(`Path file berbahaya: ${filePath}`);
  }

  const parts = normalizedPath.split('/');

  if (parts.includes('..')) {
    throw new Error(`Path file berbahaya: ${filePath}`);
  }

  return normalizedPath;
}

function resolveInsideBase(baseDir, projectPath) {
  const resolvedBaseDir = path.resolve(baseDir);
  const targetPath = path.resolve(resolvedBaseDir, projectPath);

  if (
    targetPath !== resolvedBaseDir &&
    !targetPath.startsWith(resolvedBaseDir + path.sep)
  ) {
    throw new Error(`Path keluar dari folder project: ${projectPath}`);
  }

  return targetPath;
}

function writeProjectFiles(tempDir, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Files kosong');
  }

  const baseDir = path.resolve(tempDir);

  for (const file of files) {
    const safePath = normalizeProjectPath(file.path);
    const targetPath = resolveInsideBase(baseDir, safePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, file.content || '', 'utf8');
  }
}

function getFilesRecursive(dir, extension) {
  let results = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath, extension));
    } else if (item.isFile() && fullPath.endsWith(extension)) {
      results.push(fullPath);
    }
  }

  return results;
}

module.exports = {
  normalizeProjectPath,
  resolveInsideBase,
  writeProjectFiles,
  getFilesRecursive,
};

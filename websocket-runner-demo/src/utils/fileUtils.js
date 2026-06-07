const fs = require('fs');
const path = require('path');
const { resolveInsideBase, sanitizeRelativePath } = require('./pathSecurity');

function writeProjectFiles(workspaceDir, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Files kosong');
  }

  for (const file of files) {
    if (!file || typeof file !== 'object') {
      throw new Error('Format file tidak valid');
    }

    const safePath = sanitizeRelativePath(file.path);
    const targetPath = resolveInsideBase(workspaceDir, safePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, String(file.content ?? ''), 'utf8');
  }
}

function getFilesRecursive(dir, extension) {
  let results = [];

  if (!fs.existsSync(dir)) return results;

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
  writeProjectFiles,
  getFilesRecursive,
};


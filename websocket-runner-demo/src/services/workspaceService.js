const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeProjectFiles } = require('../utils/fileUtils');

function createWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'runner-workspace-'));
}

function writeWorkspaceFiles(workspaceDir, files) {
  writeProjectFiles(workspaceDir, files);
}

function cleanupWorkspace(workspaceDir) {
  if (!workspaceDir || !fs.existsSync(workspaceDir)) return;

  fs.rmSync(workspaceDir, { recursive: true, force: true });
}

module.exports = {
  createWorkspace,
  writeWorkspaceFiles,
  cleanupWorkspace,
};


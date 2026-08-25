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

  try {
    fs.rmSync(workspaceDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (err) {
    console.warn(`[Workspace Cleanup] Retrying cleanup for ${workspaceDir}: ${err.message}`);
    setTimeout(() => {
      try {
        if (fs.existsSync(workspaceDir)) {
          fs.rmSync(workspaceDir, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 500,
          });
        }
      } catch (retryErr) {
        console.error(`[Workspace Cleanup] Gagal menghapus workspace ${workspaceDir}: ${retryErr.message}`);
      }
    }, 1000);
  }
}

module.exports = {
  createWorkspace,
  writeWorkspaceFiles,
  cleanupWorkspace,
};


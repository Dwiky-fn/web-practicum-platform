const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getFilesRecursive } = require('../utils/fileUtils');
const {
  resolveInsideBase,
  sanitizeRelativePath,
} = require('../utils/pathSecurity');

function getPackageName(sourceCode) {
  // Strip BOM jika ada
  const cleaned = sourceCode.replace(/^\uFEFF/, '');

  const match = cleaned.match(
    /^\s*package\s+([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\s*;/m,
  );
  return match?.[1] || '';
}

function getEntryClassInfo(workspaceDir, entryFile) {
  const safeEntryFile = sanitizeRelativePath(entryFile);
  const entryPath = resolveInsideBase(workspaceDir, safeEntryFile);
  const sourceCode = fs.readFileSync(entryPath, 'utf8');
  const packageName = getPackageName(sourceCode);
  const className = path.basename(safeEntryFile, '.java');

  console.log('[DEBUG] packageName:', JSON.stringify(packageName));
  console.log(
    '[DEBUG] mainClass:',
    packageName ? `${packageName}.${className}` : className,
  );

  return {
    className,
    mainClass: packageName ? `${packageName}.${className}` : className,
    packageName,
  };
}

function findCompiledClassFile(dir, className) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = findCompiledClassFile(entryPath, className);
      if (found) return found;
    }

    if (entry.isFile() && entry.name === `${className}.class`) {
      return entryPath;
    }
  }

  return null;
}

function resolveRunTarget(outDir, entryInfo) {
  if (entryInfo.packageName) {
    return {
      classPath: outDir,
      mainClass: entryInfo.mainClass,
    };
  }

  const rootClassFile = path.join(outDir, `${entryInfo.className}.class`);
  if (fs.existsSync(rootClassFile)) {
    return {
      classPath: outDir,
      mainClass: entryInfo.className,
    };
  }

  const compiledClassFile = findCompiledClassFile(outDir, entryInfo.className);
  if (!compiledClassFile) {
    return {
      classPath: outDir,
      mainClass: entryInfo.className,
    };
  }

  // Hitung package dari path relatif antara outDir dan compiledClassFile
  const relativeDir = path.relative(outDir, path.dirname(compiledClassFile));
  const inferredPackage = relativeDir.split(path.sep).join('.');
  const inferredMainClass = inferredPackage
    ? `${inferredPackage}.${entryInfo.className}`
    : entryInfo.className;

  return {
    classPath: outDir, // ← selalu outDir, bukan dirname class
    mainClass: inferredMainClass, // ← "app.BilanganBulat"
  };
}

function runCompile({ workspaceDir, onStdout, onStderr }) {
  return new Promise((resolve, reject) => {
    const javaFiles = getFilesRecursive(workspaceDir, '.java');

    if (javaFiles.length === 0) {
      reject(new Error('Tidak ada file .java yang ditemukan'));
      return;
    }

    const outDir = path.join(workspaceDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });

    const compileProcess = spawn('javac', ['-d', outDir, ...javaFiles], {
      cwd: workspaceDir,
      shell: false,
    });

    compileProcess.stdout.on('data', (data) => onStdout(data.toString()));
    compileProcess.stderr.on('data', (data) => onStderr(data.toString()));
    compileProcess.on('error', (error) => {
      reject(new Error(`Gagal menjalankan javac: ${error.message}`));
    });
    compileProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Compile failed with code ${code}`));
        return;
      }

      resolve(outDir);
    });
  });
}

async function runJava({ workspaceDir, entryFile, onStdout, onStderr }) {
  if (!entryFile || !entryFile.endsWith('.java')) {
    throw new Error('entryFile Java harus berupa file .java');
  }

  const outDir = await runCompile({ workspaceDir, onStdout, onStderr });

  // Debug
  const safeEntryFile = sanitizeRelativePath(entryFile);
  const entryPath = resolveInsideBase(workspaceDir, safeEntryFile);
  const sourceCode = fs.readFileSync(entryPath, 'utf8');
  console.log('[DEBUG] entryFile:', entryFile);
  console.log(
    '[DEBUG] sourceCode awal:',
    JSON.stringify(sourceCode.slice(0, 80)),
  );

  const entryInfo = getEntryClassInfo(workspaceDir, entryFile);
  console.log('[DEBUG] entryInfo:', entryInfo);

  const runTarget = resolveRunTarget(outDir, entryInfo);
  console.log('[DEBUG] runTarget:', runTarget);

  return spawn('java', ['-cp', runTarget.classPath, runTarget.mainClass], {
    cwd: workspaceDir,
    shell: false,
  });
}

module.exports = { runJava };

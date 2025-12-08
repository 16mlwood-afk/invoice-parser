const fs = require('fs');
const path = require('path');

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createBackupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + '.backup';
    let counter = 1;
    let finalBackupPath = backupPath;
    while (fs.existsSync(finalBackupPath)) {
      finalBackupPath = `${backupPath}.${counter}`;
      counter++;
    }
    fs.copyFileSync(filePath, finalBackupPath);
    return finalBackupPath;
  }
  return null;
}

function safeWriteFile(filePath, content, options = {}) {
  const { overwrite = false, backup = false } = options;

  if (!overwrite && fs.existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}. Use --overwrite or --backup options.`);
  }

  if (backup) {
    createBackupFile(filePath);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = {
  ensureDirectoryExists,
  createBackupFile,
  safeWriteFile
};
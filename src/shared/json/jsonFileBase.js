import fs from "fs";
import path from "path";
import {
  atomicWriteFile,
  atomicWriteFileSync,
  cleanupStaleTempFiles,
} from "./atomicWrite.js";

const USER_DATA_ARG_PREFIX = "--nwWrldUserDataDir=";

const getUserDataDirFromArgv = () => {
  const arg = (process.argv || []).find((a) =>
    a.startsWith(USER_DATA_ARG_PREFIX)
  );
  if (!arg) return null;
  const value = arg.slice(USER_DATA_ARG_PREFIX.length);
  return value || null;
};

export const getJsonDir = () => {
  const userDataDir = getUserDataDirFromArgv();
  if (userDataDir) {
    const dir = path.join(userDataDir, "json");
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
    return dir;
  }
  const fallbackDir = path.join(__dirname, "..", "..", "shared", "json");
  return fallbackDir;
};

export const getJsonFilePath = (filename) => path.join(getJsonDir(), filename);

const getLegacyJsonDir = () => {
  const candidates = [
    path.join(process.cwd(), "src", "shared", "json"),
    path.join(__dirname, "..", "..", "shared", "json"),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {}
  }
  return candidates[0];
};

const maybeMigrateLegacyFile = (filename) => {
  const jsonDir = getJsonDir();
  const legacyDir = getLegacyJsonDir();
  if (jsonDir === legacyDir) return;
  const destPath = path.join(jsonDir, filename);
  if (fs.existsSync(destPath)) return;
  const legacyPath = path.join(legacyDir, filename);
  if (!fs.existsSync(legacyPath)) return;
  try {
    fs.copyFileSync(legacyPath, destPath);
    const legacyBackupPath = `${legacyPath}.backup`;
    const destBackupPath = `${destPath}.backup`;
    if (!fs.existsSync(destBackupPath) && fs.existsSync(legacyBackupPath)) {
      fs.copyFileSync(legacyBackupPath, destBackupPath);
    }
  } catch {}
};

cleanupStaleTempFiles(getJsonDir());

export const loadJsonFile = async (filename, defaultValue, warningMsg) => {
  maybeMigrateLegacyFile(filename);
  const filePath = getJsonFilePath(filename);
  try {
    const data = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (warningMsg) console.warn(warningMsg, error);

    try {
      const backupPath = `${filePath}.backup`;
      const backupData = await fs.promises.readFile(backupPath, "utf-8");
      console.warn(`Restored ${filename} from backup`);
      return JSON.parse(backupData);
    } catch (backupError) {
      return defaultValue;
    }
  }
};

export const loadJsonFileSync = (filename, defaultValue, errorMsg) => {
  maybeMigrateLegacyFile(filename);
  const filePath = getJsonFilePath(filename);
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (errorMsg) console.error(errorMsg, error);

    try {
      const backupPath = `${filePath}.backup`;
      const backupData = fs.readFileSync(backupPath, "utf-8");
      console.warn(`Restored ${filename} from backup`);
      return JSON.parse(backupData);
    } catch (backupError) {
      return defaultValue;
    }
  }
};

export const saveJsonFile = async (filename, data) => {
  const filePath = getJsonFilePath(filename);
  try {
    const dataString = JSON.stringify(data, null, 2);
    await atomicWriteFile(filePath, dataString);
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
  }
};

export const saveJsonFileSync = (filename, data) => {
  const filePath = getJsonFilePath(filename);
  try {
    const dataString = JSON.stringify(data, null, 2);
    atomicWriteFileSync(filePath, dataString);
  } catch (error) {
    console.error(`Error writing ${filename} (sync):`, error);
  }
};

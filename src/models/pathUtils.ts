import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// 確保獲取專案資料夾路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "../..");

// 數據文件路徑
export const DATA_DIR = (() => {
  // 優先檢查 WORKSPACE_DATA_DIR_SUB_PATH 環境變量
  if (process.env.WORKSPACE_DATA_DIR_SUB_PATH) {
    if (!process.env.WORKSPACE_FOLDER_PATHS) {
      throw new Error(
        "環境變量 WORKSPACE_DATA_DIR_SUB_PATH 已設置，但未設置 WORKSPACE_FOLDER_PATHS"
      );
    }
    // 使用 path.delimiter 作為分隔符
    const workspacePaths = process.env.WORKSPACE_FOLDER_PATHS.split(path.delimiter);
    return path.resolve(
      workspacePaths[0].trim(),
      process.env.WORKSPACE_DATA_DIR_SUB_PATH
    );
  }
  // 後備邏輯：使用原有 DATA_DIR 或默認路徑
  return process.env.DATA_DIR || path.join(PROJECT_ROOT, "data");
})();

// 確保數據目錄存在
(async () => {
    try {
        await fs.access(DATA_DIR);
    } catch (error) {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
})();
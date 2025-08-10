import { z } from "zod";
import fs from "fs/promises";
import { getWebGuiFilePath } from "../../utils/paths.js";

// 打开 Web GUI 工具（無參）
export const openWebGuiSchema = z.object({}).describe("Open the Task Manager Web GUI in your browser and return the URL");

async function readWebGuiUrlFromFile(): Promise<string | null> {
  try {
    const filePath = await getWebGuiFilePath();
    const content = await fs.readFile(filePath, "utf-8");
    // 內容格式示例: [Task Manager UI](http://localhost:12345?lang=en)
    const match = content.match(/\((https?:\/\/[^\s)]+)\)/);
    if (match && match[1]) {
      return match[1];
    }
    // 退化處理：直接返回內容中的 http 連結片段
    const fallback = content.match(/https?:\/\/[^\s)]+/);
    return fallback ? fallback[0] : null;
  } catch {
    return null;
  }
}

function getLanguageFromTemplateEnv(): string {
  const templatesUse = process.env.TEMPLATES_USE || "en";
  if (templatesUse === "zh") return "zh-TW";
  if (templatesUse === "en") return "en";
  return "en";
}

export async function openWebGui(_: z.infer<typeof openWebGuiSchema>) {
  const lang = getLanguageFromTemplateEnv();
  const urlFromFile = await readWebGuiUrlFromFile();

  // 回退：若尚未取得端口，嘗試使用 WEB_PORT
  const url = urlFromFile || (process.env.WEB_PORT ? `http://localhost:${process.env.WEB_PORT}?lang=${lang}` : null);

  if (!url) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Web GUI 尚未準備完成，請稍後再試或確認已啟用 ENABLE_GUI=true。",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Web GUI 地址: ${url}`,
      },
    ],
  };
} 
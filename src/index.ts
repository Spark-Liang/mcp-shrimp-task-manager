import "dotenv/config";
import { loadPromptFromTemplate } from "./prompts/loader.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { setGlobalServer } from "./utils/paths.js";
import { createWebServer } from "./web/webServer.js";
import { getWebGuiFilePath } from "./utils/paths.js";
import fs from "fs/promises";

// 導入所有工具函數和 schema
import {
  planTask,
  planTaskSchema,
  analyzeTask,
  analyzeTaskSchema,
  reflectTask,
  reflectTaskSchema,
  splitTasks,
  splitTasksSchema,
  splitTasksRaw,
  splitTasksRawSchema,
  listTasksSchema,
  listTasks,
  executeTask,
  executeTaskSchema,
  verifyTask,
  verifyTaskSchema,
  deleteTask,
  deleteTaskSchema,
  clearAllTasks,
  clearAllTasksSchema,
  updateTaskContent,
  updateTaskContentSchema,
  queryTask,
  queryTaskSchema,
  getTaskDetail,
  getTaskDetailSchema,
  processThought,
  processThoughtSchema,
  initProjectRules,
  initProjectRulesSchema,
  researchMode,
  researchModeSchema,
  openWebGui,
  openWebGuiSchema,
} from "./tools/index.js";

async function main() {
  try {
    const ENABLE_GUI = process.env.ENABLE_GUI === "true";
    let webServerInstance: Awaited<ReturnType<typeof createWebServer>> | null =
      null;

    // 創建MCP服務器
    const server = new Server(
      {
        name: "Shrimp Task Manager",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          logging: {},
        },
      }
    );

    // 設置全局 server 實例
    setGlobalServer(server);

    // 監聽 initialized 通知來啟動 web 服務器
    if (ENABLE_GUI) {
      server.setNotificationHandler(InitializedNotificationSchema, async () => {
        try {
          webServerInstance = await createWebServer();
          await webServerInstance.startServer();
        } catch (error) {}
      });
    }

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: "plan_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/planTask.md"
          ),
          inputSchema: zodToJsonSchema(planTaskSchema),
        },
        {
          name: "analyze_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/analyzeTask.md"
          ),
          inputSchema: zodToJsonSchema(analyzeTaskSchema),
        },
        {
          name: "reflect_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/reflectTask.md"
          ),
          inputSchema: zodToJsonSchema(reflectTaskSchema),
        },
        {
          name: "split_tasks",
          description: await loadPromptFromTemplate(
            "toolsDescription/splitTasks.md"
          ),
          inputSchema: zodToJsonSchema(splitTasksRawSchema),
        },
        {
          name: "list_tasks",
          description: await loadPromptFromTemplate(
            "toolsDescription/listTasks.md"
          ),
          inputSchema: zodToJsonSchema(listTasksSchema),
        },
        {
          name: "execute_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/executeTask.md"
          ),
          inputSchema: zodToJsonSchema(executeTaskSchema),
        },
        {
          name: "verify_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/verifyTask.md"
          ),
          inputSchema: zodToJsonSchema(verifyTaskSchema),
        },
        {
          name: "delete_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/deleteTask.md"
          ),
          inputSchema: zodToJsonSchema(deleteTaskSchema),
        },
        {
          name: "clear_all_tasks",
          description: await loadPromptFromTemplate(
            "toolsDescription/clearAllTasks.md"
          ),
          inputSchema: zodToJsonSchema(clearAllTasksSchema),
        },
        {
          name: "update_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/updateTask.md"
          ),
          inputSchema: zodToJsonSchema(updateTaskContentSchema),
        },
        {
          name: "query_task",
          description: await loadPromptFromTemplate(
            "toolsDescription/queryTask.md"
          ),
          inputSchema: zodToJsonSchema(queryTaskSchema),
        },
        {
          name: "get_task_detail",
          description: await loadPromptFromTemplate(
            "toolsDescription/getTaskDetail.md"
          ),
          inputSchema: zodToJsonSchema(getTaskDetailSchema),
        },
        {
          name: "process_thought",
          description: await loadPromptFromTemplate(
            "toolsDescription/processThought.md"
          ),
          inputSchema: zodToJsonSchema(processThoughtSchema),
        },
        {
          name: "init_project_rules",
          description: await loadPromptFromTemplate(
            "toolsDescription/initProjectRules.md"
          ),
          inputSchema: zodToJsonSchema(initProjectRulesSchema),
        },
        {
          name: "research_mode",
          description: await loadPromptFromTemplate(
            "toolsDescription/researchMode.md"
          ),
          inputSchema: zodToJsonSchema(researchModeSchema),
        },
      ];

      // 僅在 GUI 啟用時添加 open_web_gui 工具，並在描述中附帶地址
      if (ENABLE_GUI) {
        let guiUrl = "";
        try {
          const webGuiFile = await getWebGuiFilePath();
          const content = await fs.readFile(webGuiFile, "utf-8");
          const match = content.match(/\((https?:\/\/[^\s)]+)\)/);
          if (match && match[1]) {
            guiUrl = match[1];
          }
        } catch {}
        // 回退：若文件尚未寫入，嘗試組裝基礎地址
        if (!guiUrl && process.env.WEB_PORT) {
          const lang = (process.env.TEMPLATES_USE === "zh" ? "zh-TW" : "en");
          guiUrl = `http://localhost:${process.env.WEB_PORT}?lang=${lang}`;
        }

        const openWebGuiDescription = guiUrl
          ? `Open the Task Manager Web GUI. URL: ${guiUrl}`
          : `Open the Task Manager Web GUI. (Starting... URL will be available shortly)`;

        tools.push({
          name: "open_web_gui",
          description: openWebGuiDescription,
          inputSchema: zodToJsonSchema(openWebGuiSchema),
        });
      }

      return { tools };
    });

    server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        try {
          if (!request.params.arguments) {
            throw new Error("No arguments provided");
          }

          let parsedArgs;
          switch (request.params.name) {
            case "plan_task":
              parsedArgs = await planTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await planTask(parsedArgs.data);
            case "analyze_task":
              parsedArgs = await analyzeTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await analyzeTask(parsedArgs.data);
            case "reflect_task":
              parsedArgs = await reflectTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await reflectTask(parsedArgs.data);
            case "split_tasks":
              parsedArgs = await splitTasksRawSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await splitTasksRaw(parsedArgs.data);
            case "list_tasks":
              parsedArgs = await listTasksSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await listTasks(parsedArgs.data);
            case "execute_task":
              parsedArgs = await executeTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await executeTask(parsedArgs.data);
            case "verify_task":
              parsedArgs = await verifyTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await verifyTask(parsedArgs.data);
            case "delete_task":
              parsedArgs = await deleteTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await deleteTask(parsedArgs.data);
            case "clear_all_tasks":
              parsedArgs = await clearAllTasksSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await clearAllTasks(parsedArgs.data);
            case "update_task":
              parsedArgs = await updateTaskContentSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await updateTaskContent(parsedArgs.data);
            case "query_task":
              parsedArgs = await queryTaskSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await queryTask(parsedArgs.data);
            case "get_task_detail":
              parsedArgs = await getTaskDetailSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await getTaskDetail(parsedArgs.data);
            case "process_thought":
              parsedArgs = await processThoughtSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await processThought(parsedArgs.data);
            case "init_project_rules":
              return await initProjectRules();
            case "research_mode":
              parsedArgs = await researchModeSchema.safeParseAsync(
                request.params.arguments
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await researchMode(parsedArgs.data);
            case "open_web_gui":
              parsedArgs = await openWebGuiSchema.safeParseAsync(
                request.params.arguments || {}
              );
              if (!parsedArgs.success) {
                throw new Error(
                  `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
                );
              }
              return await openWebGui(parsedArgs.data);
            default:
              throw new Error(`Tool ${request.params.name} does not exist`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error occurred: ${errorMsg} \n Please try correcting the error and calling the tool again`,
              },
            ],
          };
        }
      }
    );

    // 建立連接
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.exit(1);
  }
}

main().catch(console.error);

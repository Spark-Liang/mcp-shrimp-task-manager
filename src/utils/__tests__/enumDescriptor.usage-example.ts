import { z } from 'zod';
import { EnumDescriptor } from '../enumDescriptor.js';

/**
 * 此文件展示如何在实际应用场景中使用EnumDescriptor，
 * 包括如何定义枚举、创建描述符和生成Schema
 */

// ===== 枚举定义 =====

// 1. 任务状态枚举
export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  BLOCKED: "BLOCKED"
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

// 使用EnumDescriptor定义状态描述
export const TaskStatusDescriptor = new EnumDescriptor(
  TaskStatus,
  "任务状态",
  {
    PENDING: "待處理",
    IN_PROGRESS: "進行中",
    COMPLETED: "已完成",
    BLOCKED: "被阻擋"
  }
);

// 2. 文件类型枚举
export const FileType = {
  TO_MODIFY: "TO_MODIFY",
  REFERENCE: "REFERENCE",
  CREATE: "CREATE",
  DEPENDENCY: "DEPENDENCY",
  OTHER: "OTHER"
} as const;
export type FileType = typeof FileType[keyof typeof FileType];

// 使用EnumDescriptor定义文件类型描述
export const FileTypeDescriptor = new EnumDescriptor(
  FileType,
  "文件类型",
  {
    TO_MODIFY: "待修改",
    REFERENCE: "參考資料",
    CREATE: "待建立",
    DEPENDENCY: "依賴文件",
    OTHER: "其他"
  }
);

// 3. 复杂度级别枚举
export const ComplexityLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH"
} as const;
export type ComplexityLevel = typeof ComplexityLevel[keyof typeof ComplexityLevel];

// 使用EnumDescriptor定义复杂度级别描述
export const ComplexityLevelDescriptor = new EnumDescriptor(
  ComplexityLevel,
  "任务复杂度级别",
  {
    LOW: "低複雜度",
    MEDIUM: "中等複雜度",
    HIGH: "高複雜度",
    VERY_HIGH: "極高複雜度"
  }
);

// ===== Schema定义 =====

// 1. 列出任务的Schema
export const listTasksSchema = z.object({
  // 使用TaskStatusDescriptor生成Schema，并添加额外值"all"
  status: TaskStatusDescriptor.generateSchema({
    valueMapping: {
      PENDING: "pending",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed"
    },
    extraValues: { 
      "all": "列出所有任務" 
    },
    customDescription: "要列出的任務狀態，可選擇 'all' 列出所有任務，或指定具體狀態"
  })
});

// 2. 文件相关的Schema
export const fileSchema = z.object({
  path: z.string().min(1).describe("文件路径"),
  // 使用FileTypeDescriptor生成Schema
  type: FileTypeDescriptor.generateSchema(),
  description: z.string().optional().describe("文件描述（可选）")
});

// 3. 任务更新Schema
export const updateTaskSchema = z.object({
  taskId: z.string().uuid().describe("任务ID"),
  // 使用TaskStatusDescriptor生成Schema，不包括BLOCKED状态
  status: TaskStatusDescriptor.generateSchema({
    valueMapping: {
      PENDING: "pending",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed"
    }
  }).describe("任务新状态"),
  // 可选的复杂度评估
  complexityLevel: ComplexityLevelDescriptor.generateSchema().optional()
    .describe("任务复杂度评估（可选）")
});

// ===== 使用示例 =====

// 模拟一个任务对象
const task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "实现EnumDescriptor",
  description: "创建通用枚举描述符类",
  status: TaskStatus.IN_PROGRESS as TaskStatus, // 显式类型标注，避免类型错误
  files: [
    { path: "src/utils/enumDescriptor.ts", type: FileType.TO_MODIFY, description: "需要实现的核心类" },
    { path: "src/types/index.ts", type: FileType.REFERENCE, description: "参考现有枚举定义" }
  ],
  complexityLevel: ComplexityLevel.MEDIUM
};

// 使用案例1：状态比较
function checkTaskStatus() {
  const status = task.status;
  // 使用类型守卫进行安全的类型比较
  if (status === TaskStatus.COMPLETED) {
    console.log("任务已完成");
  } else if (status === TaskStatus.IN_PROGRESS) {
    console.log("任务进行中");
  }
}

// 使用案例2：生成UI组件选项
function generateStatusOptions() {
  // 生成下拉选择框选项
  return TaskStatusDescriptor.toSelectOptions();
}

// 使用案例3：验证表单输入
function validateTaskUpdate(input: unknown) {
  // 使用生成的Schema验证输入
  try {
    const result = updateTaskSchema.parse(input);
    console.log("验证通过:", result);
    return result;
  } catch (error) {
    console.error("验证失败:", error);
    throw error;
  }
}

// 使用案例4：获取枚举的本地化文本
function getLocalizedStatusName(status: TaskStatus): string {
  return TaskStatusDescriptor.getValueDescription(status);
}

// 使用案例5：API文档生成
function generateApiDocs() {
  const docs = {
    listTasks: {
      description: "列出任务API",
      parameters: {
        status: TaskStatusDescriptor.generateMarkdownDoc()
      }
    },
    updateTask: {
      description: "更新任务API",
      parameters: {
        taskId: "任务ID (UUID格式)",
        status: TaskStatusDescriptor.generateMarkdownDoc()
      }
    }
  };
  
  return docs;
}

// 演示结果
console.log("Status comparison works?", task.status === TaskStatus.IN_PROGRESS); // true
console.log("Localized status:", getLocalizedStatusName(task.status)); // "進行中"
console.log("Status select options:", generateStatusOptions());
console.log("API docs:", generateApiDocs());

// 测试Schema验证
const validInput = {
  taskId: "123e4567-e89b-12d3-a456-426614174000",
  status: "completed" // 映射后的值
};

try {
  const result = updateTaskSchema.parse(validInput);
  console.log("Schema validation works:", result);
} catch (error) {
  console.error("Schema validation failed:", error);
} 
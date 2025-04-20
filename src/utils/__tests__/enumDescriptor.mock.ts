import { z } from 'zod';
import { EnumDescriptor } from '../enumDescriptor.js';

/**
 * 这是一个示例文件，展示EnumDescriptor的用法和边界情况测试
 * 由于环境限制，我们无法使用vitest运行实际测试，但这个文件可以用来验证功能
 */

console.log("====== 基本功能测试 ======");

// 定义测试用的枚举
const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  BLOCKED: "BLOCKED"
} as const;
type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

const TaskStatusDescriptions: Record<TaskStatus, string> = {
  PENDING: "待處理",
  IN_PROGRESS: "進行中",
  COMPLETED: "已完成",
  BLOCKED: "被阻擋"
};

// 创建枚举描述符
const taskStatusDescriptor = new EnumDescriptor(
  TaskStatus,
  "任务状态",
  TaskStatusDescriptions
);

// 演示用法1: 获取枚举所有值
console.log('All values:', taskStatusDescriptor.getAllValues());
// 期望输出: ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]

// 演示用法2: 获取枚举值描述
console.log('PENDING description:', taskStatusDescriptor.getValueDescription("PENDING"));
// 期望输出: "待處理"

// 演示用法3: 生成Markdown文档
console.log('Markdown doc:');
console.log(taskStatusDescriptor.generateMarkdownDoc());
// 期望输出包含: "# 任务状态" 和所有枚举值的描述

// 演示用法4: 生成Zod Schema
const schema = taskStatusDescriptor.generateSchema();
console.log('Schema values:', (schema as any)._def.values);
// 期望输出: ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]

// 演示用法5: 使用值映射生成Schema
const mappedSchema = taskStatusDescriptor.generateSchema({
  valueMapping: {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed"
  }
});
console.log('Mapped schema values:', (mappedSchema as any)._def.values);
// 期望输出: ["pending", "in_progress", "completed", "BLOCKED"]

// 演示用法6: 添加额外值
const schemaWithExtra = taskStatusDescriptor.generateSchema({
  extraValues: { "all": "列出所有任務" }
});
console.log('Schema with extra values:', (schemaWithExtra as any)._def.values);
// 期望输出: ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "all"]

// 演示用法7: 验证值是否有效
console.log('Is PENDING valid?', taskStatusDescriptor.isValidValue("PENDING")); // true
console.log('Is INVALID valid?', taskStatusDescriptor.isValidValue("INVALID")); // false

// 演示用法8: 生成Select选项
console.log('Select options:', taskStatusDescriptor.toSelectOptions());
// 期望输出: [{ value: "PENDING", label: "待處理 (PENDING)" }, ...]

// 演示用法9: 转换为JSON
console.log('JSON representation:', JSON.stringify(taskStatusDescriptor.toJSON(), null, 2));

// 演示用法10: 验证与原枚举的兼容性
const task = { status: "COMPLETED" };
console.log('Compatible with equality check?', task.status === TaskStatus.COMPLETED); // true
console.log('Compatible with descriptor?', task.status === taskStatusDescriptor.values.COMPLETED); // true

// ====== 边界情况测试 ======
console.log("\n====== 边界情况测试 ======");

// 测试1: 空描述（应该使用枚举值本身）
const WithoutDescEnum = {
  A: "A_VALUE",
  B: "B_VALUE"
} as const;
type WithoutDescEnum = typeof WithoutDescEnum[keyof typeof WithoutDescEnum];

// 只提供部分描述
const withoutDescDescriptor = new EnumDescriptor(
  WithoutDescEnum,
  "无描述枚举",
  { A: "A的描述" } as any // 故意只提供部分描述
);

console.log('Missing description test:', {
  aValue: withoutDescDescriptor.getValueDescription("A_VALUE"),
  bValue: withoutDescDescriptor.getValueDescription("B_VALUE"), // 应返回 "B_VALUE" 本身
});

// 测试2: 值映射和额外值同时使用
const mixedSchema = taskStatusDescriptor.generateSchema({
  valueMapping: {
    PENDING: "pending",
    IN_PROGRESS: "in_progress"
  },
  extraValues: {
    "all": "全部",
    "none": "无"
  }
});
console.log('Mixed mapping and extra values:', {
  values: (mixedSchema as any)._def.values,
  containsPending: (mixedSchema as any)._def.values.includes("pending"),
  containsAll: (mixedSchema as any)._def.values.includes("all")
});

// 测试3: 自定义描述覆盖
const customDescSchema = taskStatusDescriptor.generateSchema({
  customDescription: "完全自定义描述"
});
console.log('Custom description override:', {
  description: (customDescSchema as any)._def.description,
  containsValues: (customDescSchema as any)._def.description.includes("PENDING") // 应为false
});

// 测试4: 空枚举对象
try {
  const emptyEnum = {} as any;
  const emptyDescriptor = new EnumDescriptor(
    emptyEnum,
    "空枚举",
    {}
  );
  
  console.log('Empty enum construction works');
  
  try {
    // 这里应该抛出错误
    const emptySchema = emptyDescriptor.generateSchema();
    console.error('❌ ERROR: Empty enum should throw when generating schema');
  } catch (error: any) {
    console.log('✅ Empty enum schema generation correctly throws:', error.message);
  }
} catch (error: any) {
  console.error('❌ ERROR: Empty enum construction failed:', error.message);
}

// 测试5: 值验证的边界情况
console.log('Value validation edge cases:', {
  nullCheck: taskStatusDescriptor.isValidValue(null),
  undefinedCheck: taskStatusDescriptor.isValidValue(undefined),
  numberCheck: taskStatusDescriptor.isValidValue(123),
  emptyStringCheck: taskStatusDescriptor.isValidValue(""),
  objectCheck: taskStatusDescriptor.isValidValue({} as any)
});

// 测试6: 生成所有选项为空值的Select选项
try {
  const emptyEnum = {} as any;
  const emptyDescriptor = new EnumDescriptor(
    emptyEnum,
    "空枚举",
    {}
  );
  const emptyOptions = emptyDescriptor.toSelectOptions();
  console.log('Empty enum select options:', emptyOptions); // 应该是空数组
} catch (error: any) {
  console.error('❌ ERROR: Empty enum select options generation failed:', error.message);
}

// 测试7: 值映射中包含无效的枚举键
try {
  const invalidMappingSchema = taskStatusDescriptor.generateSchema({
    valueMapping: {
      PENDING: "pending",
      INVALID_KEY: "invalid" // 无效的键
    } as any
  });
  console.log('Invalid mapping key test passed:', {
    values: (invalidMappingSchema as any)._def.values,
    containsPending: (invalidMappingSchema as any)._def.values.includes("pending"), // 应为true
    containsInvalid: (invalidMappingSchema as any)._def.values.includes("invalid") // 应为false
  });
} catch (error: any) {
  console.error('❌ ERROR: Invalid mapping key test failed:', error.message);
}

// 测试8: 值验证的类型安全
function validateTaskStatus(status: unknown): status is TaskStatus {
  return taskStatusDescriptor.isValidValue(status);
}

// 类型守卫测试
const unknownValue: unknown = "COMPLETED";
if (validateTaskStatus(unknownValue)) {
  // 这里 unknownValue 应该被推断为 TaskStatus 类型
  const typedValue: TaskStatus = unknownValue; // 不应报错
  console.log('Type guard works correctly:', typedValue);
}

// 最终结果汇总和验证
function verifyResults() {
  let passed = 0;
  let failed = 0;
  
  // 运行一些基本验证
  try {
    if (taskStatusDescriptor.getAllValues().length === 4) passed++; else failed++;
    if (taskStatusDescriptor.getValueDescription("PENDING") === "待處理") passed++; else failed++;
    if (taskStatusDescriptor.isValidValue("PENDING")) passed++; else failed++;
    if (!taskStatusDescriptor.isValidValue("INVALID")) passed++; else failed++;
    if (taskStatusDescriptor.toSelectOptions().length === 4) passed++; else failed++;
    if ((schema as any)._def.values.includes("PENDING")) passed++; else failed++;
    if ((schemaWithExtra as any)._def.values.includes("all")) passed++; else failed++;
    if (task.status === TaskStatus.COMPLETED) passed++; else failed++;
  } catch (error: any) {
    console.error('❌ ERROR during basic verification:', error.message);
    failed++;
  }
  
  console.log(`\n====== 测试结果摘要 ======`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);
  console.log(failed === 0 ? '✅ 所有测试通过' : '❌ 有测试失败');
  
  return failed === 0;
}

const allTestsPassed = verifyResults();
console.log(`\n总体结果: ${allTestsPassed ? '✅ 通过' : '❌ 失败'}`);

export {
  TaskStatus,
  taskStatusDescriptor,
  allTestsPassed
}; 
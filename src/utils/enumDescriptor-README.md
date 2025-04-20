# EnumDescriptor - 枚举描述符工具类

`EnumDescriptor` 是一个通用的枚举描述工具类，用于管理枚举值的元数据并生成带有中文描述的 Zod Schema。这个工具类解决了以下问题：

1. 使用英文代码作为枚举值，同时保留中文描述
2. 在 MCP 工具的 Schema 中自动生成枚举值的中文描述
3. 提供通用的 Schema 生成方法，避免重复代码
4. 保持与现有代码的兼容性（如 `task.status === TaskStatus.COMPLETED`）

## 基本用法

### 1. 定义枚举和枚举描述符

```typescript
enum Priority {
  HIGH = "HIGH_PRIORITY",
  MEDIUM = "MEDIUM_PRIORITY",
  LOW = "LOW_PRIORITY"
}

// 创建描述符
const PriorityDescriptor = new EnumDescriptor(
  Priority,                    // 直接传入枚举类型
  "任务优先级",                // 枚举整体描述
  {                           // 各枚举值的描述
    [Priority.HIGH]: "高优先级",
    [Priority.MEDIUM]: "中优先级",
    [Priority.LOW]: "低优先级"
  }
);
```

### 2. 生成 Zod Schema

```typescript
// 基本用法 - 直接生成 Schema
const schema = TaskStatusDescriptor.generateSchema();

// 高级用法 - 使用值映射
const mappedSchema = TaskStatusDescriptor.generateSchema({
  valueMapping: {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed"
  }
});

// 添加额外值
const schemaWithExtra = TaskStatusDescriptor.generateSchema({
  extraValues: { 
    "all": "列出所有任务" 
  }
});

// 自定义顶层描述
const customDescSchema = TaskStatusDescriptor.generateSchema({
  customDescription: "自定义描述文本"
});
```

## 主要特性

### 1. 枚举值获取与描述

```typescript
// 获取所有枚举值
const allValues = TaskStatusDescriptor.getAllValues();
// → ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]

// 获取单个枚举值的描述
const desc = TaskStatusDescriptor.getValueDescription("PENDING");
// → "待處理"
```

### 2. 生成文档

```typescript
// 生成 Markdown 格式文档
const markdown = TaskStatusDescriptor.generateMarkdownDoc();
/*
# 任务状态

## 可选值

- `PENDING`: 待處理
- `IN_PROGRESS`: 進行中
- `COMPLETED`: 已完成
- `BLOCKED`: 被阻擋
*/
```

### 3. UI 组件集成

```typescript
// 生成下拉选择框选项
const options = TaskStatusDescriptor.toSelectOptions();
/*
[
  { value: "PENDING", label: "待處理 (PENDING)" },
  { value: "IN_PROGRESS", label: "進行中 (IN_PROGRESS)" },
  { value: "COMPLETED", label: "已完成 (COMPLETED)" },
  { value: "BLOCKED", label: "被阻擋 (BLOCKED)" }
]
*/
```

### 4. 值验证

```typescript
// 验证值是否有效
const isValid = TaskStatusDescriptor.isValidValue("PENDING"); // true
const isInvalid = TaskStatusDescriptor.isValidValue("UNKNOWN"); // false
```

## 与现有代码兼容性

`EnumDescriptor` 设计为完全兼容现有代码。例如，以下代码仍然可以正常工作：

```typescript
if (task.status === TaskStatus.COMPLETED) {
  // 做某些操作...
}
```

## 实际应用示例

查看 `src/utils/__tests__/enumDescriptor.usage-example.ts` 获取完整的实际应用示例，包括：

1. 定义多种类型的枚举
2. 创建和使用枚举描述符
3. 生成和使用 Schema
4. 实现各种实用功能（如 UI 选项生成、本地化等）

## API 参考

### 构造函数

```typescript
constructor(
  values: T,                  // 枚举对象
  enumDescription: string,    // 枚举整体描述
  valueDescriptions: Record<V, string>   // 枚举值描述对象
)
```

### 方法

| 方法 | 描述 |
|------|------|
| `getAllValues()` | 获取所有枚举值数组 |
| `getValueDescription(value)` | 获取指定枚举值的描述 |
| `generateMarkdownDoc()` | 生成 Markdown 格式文档 |
| `generateSchema(options?)` | 生成 Zod 枚举 Schema |
| `toJSON()` | 转换为 JSON 对象 |
| `toSelectOptions()` | 转换为选择框选项数组 |
| `isValidValue(value)` | 验证值是否是有效枚举值 |
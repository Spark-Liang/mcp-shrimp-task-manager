import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EnumDescriptor } from '../enumDescriptor.js';

describe('EnumDescriptor', () => {
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
  
  let taskStatusDescriptor: EnumDescriptor<typeof TaskStatus, TaskStatus>;
  
  beforeEach(() => {
    taskStatusDescriptor = new EnumDescriptor(
      TaskStatus,
      "任务状态",
      TaskStatusDescriptions
    );
  });
  
  describe('constructor', () => {
    it('should correctly initialize with values, description and valueDescriptions', () => {
      expect(taskStatusDescriptor.values).toEqual(TaskStatus);
      expect(taskStatusDescriptor.enumDescription).toBe("任务状态");
      expect(taskStatusDescriptor.valueDescriptions).toEqual(TaskStatusDescriptions);
    });
  });
  
  describe('getAllValues', () => {
    it('should return all enum values as an array', () => {
      const values = taskStatusDescriptor.getAllValues();
      expect(values).toEqual(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]);
    });
  });
  
  describe('getValueDescription', () => {
    it('should return the description for a given enum value', () => {
      expect(taskStatusDescriptor.getValueDescription("PENDING")).toBe("待處理");
      expect(taskStatusDescriptor.getValueDescription("COMPLETED")).toBe("已完成");
    });
    
    it('should return the value itself if no description exists', () => {
      // @ts-ignore - testing with undefined description
      expect(taskStatusDescriptor.getValueDescription("UNKNOWN_VALUE" as any)).toBe("UNKNOWN_VALUE");
    });
  });
  
  describe('generateMarkdownDoc', () => {
    it('should generate a markdown document with enum description and values', () => {
      const markdown = taskStatusDescriptor.generateMarkdownDoc();
      expect(markdown).toContain('# 任务状态');
      expect(markdown).toContain('## 可选值');
      expect(markdown).toContain('- `PENDING`: 待處理');
      expect(markdown).toContain('- `IN_PROGRESS`: 進行中');
      expect(markdown).toContain('- `COMPLETED`: 已完成');
      expect(markdown).toContain('- `BLOCKED`: 被阻擋');
    });
  });
  
  describe('generateSchema', () => {
    it('should generate a Zod enum schema with descriptions', () => {
      const schema = taskStatusDescriptor.generateSchema();
      
      // Check schema values
      const enumValues = (schema as any)._def.values;
      expect(enumValues).toEqual(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]);
      
      // Check description
      const description = (schema as any)._def.description;
      expect(description).toContain('任务状态');
      expect(description).toContain('可选值：');
      expect(description).toContain('- PENDING: 待處理');
      expect(description).toContain('- IN_PROGRESS: 進行中');
      expect(description).toContain('- COMPLETED: 已完成');
      expect(description).toContain('- BLOCKED: 被阻擋');
    });
    
    it('should handle value mapping', () => {
      const valueMapping = {
        PENDING: "pending",
        IN_PROGRESS: "in_progress",
        COMPLETED: "completed",
      };
      
      const schema = taskStatusDescriptor.generateSchema({ valueMapping });
      
      // Check schema values
      const enumValues = (schema as any)._def.values;
      expect(enumValues).toEqual(["pending", "in_progress", "completed", "BLOCKED"]);
      
      // Check description
      const description = (schema as any)._def.description;
      expect(description).toContain('- pending: 待處理');
      expect(description).toContain('- in_progress: 進行中');
      expect(description).toContain('- completed: 已完成');
      expect(description).toContain('- BLOCKED: 被阻擋');
    });
    
    it('should handle extra values', () => {
      const extraValues = {
        "all": "列出所有任務"
      };
      
      const schema = taskStatusDescriptor.generateSchema({ extraValues });
      
      // Check schema values
      const enumValues = (schema as any)._def.values;
      expect(enumValues).toEqual(["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "all"]);
      
      // Check description
      const description = (schema as any)._def.description;
      expect(description).toContain('- all: 列出所有任務');
    });
    
    it('should handle custom description', () => {
      const customDescription = "自定义描述";
      
      const schema = taskStatusDescriptor.generateSchema({ customDescription });
      
      // Check description
      const description = (schema as any)._def.description;
      expect(description).toBe(customDescription);
    });
    
    it('should throw an error if no values are provided', () => {
      // Create an empty enum descriptor
      const emptyEnum = {} as any;
      const emptyDescriptor = new EnumDescriptor(
        emptyEnum,
        "Empty Enum",
        {}
      );
      
      expect(() => emptyDescriptor.generateSchema()).toThrow("Enum schema must have at least one value");
    });
    
    it('should support validation', () => {
      const schema = taskStatusDescriptor.generateSchema();
      
      // Valid values should parse correctly
      expect(schema.parse("PENDING")).toBe("PENDING");
      expect(schema.parse("COMPLETED")).toBe("COMPLETED");
      
      // Invalid values should throw
      expect(() => schema.parse("INVALID")).toThrow();
    });
  });
  
  describe('isValidValue', () => {
    it('should return true for valid enum values', () => {
      expect(taskStatusDescriptor.isValidValue("PENDING")).toBe(true);
      expect(taskStatusDescriptor.isValidValue("IN_PROGRESS")).toBe(true);
      expect(taskStatusDescriptor.isValidValue("COMPLETED")).toBe(true);
      expect(taskStatusDescriptor.isValidValue("BLOCKED")).toBe(true);
    });
    
    it('should return false for invalid enum values', () => {
      expect(taskStatusDescriptor.isValidValue("INVALID")).toBe(false);
      expect(taskStatusDescriptor.isValidValue(null)).toBe(false);
      expect(taskStatusDescriptor.isValidValue(undefined)).toBe(false);
      expect(taskStatusDescriptor.isValidValue(123)).toBe(false);
    });
  });
  
  describe('toSelectOptions', () => {
    it('should convert enum values to select options', () => {
      const options = taskStatusDescriptor.toSelectOptions();
      
      expect(options).toEqual([
        { value: "PENDING", label: "待處理 (PENDING)" },
        { value: "IN_PROGRESS", label: "進行中 (IN_PROGRESS)" },
        { value: "COMPLETED", label: "已完成 (COMPLETED)" },
        { value: "BLOCKED", label: "被阻擋 (BLOCKED)" },
      ]);
    });
  });
  
  describe('toJSON', () => {
    it('should return a JSON representation of the enum descriptor', () => {
      const json = taskStatusDescriptor.toJSON();
      
      expect(json).toEqual({
        enumDescription: "任务状态",
        values: TaskStatus,
        valueDescriptions: TaskStatusDescriptions
      });
    });
  });
  
  describe('Compatibility with TaskStatus equality checks', () => {
    it('should work with equality checks using enum values', () => {
      // Simulating task.status === TaskStatus.COMPLETED
      const task = { status: "COMPLETED" };
      expect(task.status === TaskStatus.COMPLETED).toBe(true);
      
      // Ensure this still works when using the descriptor
      expect(task.status === taskStatusDescriptor.values.COMPLETED).toBe(true);
    });
  });
  
  // 测试 TypeScript 字符串枚举类型
  describe('String Enum Support', () => {
    // 定义 TypeScript 字符串枚举
    enum Priority {
      HIGH = "HIGH_PRIORITY",
      MEDIUM = "MEDIUM_PRIORITY",
      LOW = "LOW_PRIORITY"
    }
    
    const PriorityDescriptions: Record<string, string> = {
      [Priority.HIGH]: "高优先级",
      [Priority.MEDIUM]: "中优先级",
      [Priority.LOW]: "低优先级"
    };
    
    let priorityDescriptor: EnumDescriptor<typeof Priority, string>;
    
    beforeEach(() => {
      priorityDescriptor = new EnumDescriptor(
        Priority,
        "任务优先级",
        PriorityDescriptions
      );
    });
    
    it('should correctly initialize with string enum values', () => {
      expect(priorityDescriptor.enumDescription).toBe("任务优先级");
      expect(priorityDescriptor.values).toEqual(Priority);
    });
    
    it('should get all string enum values correctly', () => {
      const values = priorityDescriptor.getAllValues();
      expect(values).toEqual(["HIGH_PRIORITY", "MEDIUM_PRIORITY", "LOW_PRIORITY"]);
      expect(values).not.toContain("HIGH"); // 不应包含枚举键名
    });
    
    it('should get value descriptions for string enum values', () => {
      expect(priorityDescriptor.getValueDescription(Priority.HIGH)).toBe("高优先级");
      expect(priorityDescriptor.getValueDescription(Priority.MEDIUM)).toBe("中优先级");
      expect(priorityDescriptor.getValueDescription(Priority.LOW)).toBe("低优先级");
    });
    
    it('should generate schema with string enum values', () => {
      const schema = priorityDescriptor.generateSchema();
      
      const enumValues = (schema as any)._def.values;
      expect(enumValues).toEqual(["HIGH_PRIORITY", "MEDIUM_PRIORITY", "LOW_PRIORITY"]);
      
      const description = (schema as any)._def.description;
      expect(description).toContain("任务优先级");
      expect(description).toContain("- HIGH_PRIORITY: 高优先级");
    });
    
    it('should validate string enum values correctly', () => {
      expect(priorityDescriptor.isValidValue(Priority.HIGH)).toBe(true);
      expect(priorityDescriptor.isValidValue("INVALID")).toBe(false);
    });
    
    it('should work with equality checks using string enum values', () => {
      const task = { priority: Priority.HIGH };
      expect(task.priority === Priority.HIGH).toBe(true);
      expect(task.priority === priorityDescriptor.values.HIGH).toBe(true);
    });
  });
  
  // 测试 TypeScript 数字枚举类型
  describe('Numeric Enum Support', () => {
    // 定义 TypeScript 数字枚举
    enum Status {
      PENDING = 0,
      ACTIVE = 1,
      COMPLETED = 2
    }
    
    // 为数字枚举值创建描述
    const StatusDescriptions: Record<string, string> = {
      // 使用字符串形式的数字作为键
      "0": "待处理", 
      "1": "进行中",
      "2": "已完成"
    };
    
    let statusDescriptor: EnumDescriptor<typeof Status, string>;
    
    beforeEach(() => {
      statusDescriptor = new EnumDescriptor(
        Status,
        "状态",
        StatusDescriptions
      );
    });
    
    it('should correctly filter out numeric values and only keep string keys', () => {
      const values = statusDescriptor.getAllValues();
      // 应该为空数组，因为所有值都是数字
      expect(values).toEqual([]);
    });
    
    it('should handle numeric enum in schema generation', () => {
      // 由于数字枚举没有字符串值，所以应该抛出错误
      expect(() => statusDescriptor.generateSchema()).toThrow("Enum schema must have at least one value");
    });
  });
}); 
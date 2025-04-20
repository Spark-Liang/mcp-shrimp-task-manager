import { z } from 'zod';

/**
 * 通用枚举描述符类 - 用于管理枚举的元数据和生成带描述的Schema
 * 
 * @template T 枚举对象类型 (如 typeof TaskStatus 或 enum 类型)
 * @template V 枚举值的联合类型 (如 TaskStatus)
 */
export class EnumDescriptor<
  T extends Record<string, string | number>, 
  V extends string = Extract<T[keyof T], string>
> {
  /**
   * @param values 枚举对象 (例如 TaskStatus 或 enum TaskStatus)
   * @param enumDescription 枚举本身的描述 (例如 "任务状态")
   * @param valueDescriptions 每个枚举值对应的描述 (例如 { PENDING: "待处理", ... })
   */
  constructor(
    public readonly values: T, 
    public readonly enumDescription: string,
    public readonly valueDescriptions: Record<V, string> 
  ) {}

  /**
   * 获取所有枚举值
   * @returns 枚举所有值的数组（过滤掉数字枚举的反向映射）
   */
  getAllValues(): V[] {
    // 过滤出字符串值，并去除可能的数字枚举反向映射
    const entries = Object.entries(this.values);
    
    const stringEnumValues = entries
      .filter(([key, value]) => {
        // 数字枚举的特点是: 同时存在 Name->Value 和 Value->Name 的双向映射
        // 例如：{ PENDING: 0, 0: "PENDING" }
        // 我们只需要保留 value 是字符串且不是反向映射的值（即键不是数字）的项
        return typeof value === 'string' && isNaN(Number(key));
      })
      .map(([_, value]) => value as V);
      
    return stringEnumValues;
  }

  /**
   * 获取枚举值对应的描述
   * @param value 枚举值
   * @returns 对应的描述，如果未找到则返回原值
   */
  getValueDescription(value: V): string {
    return this.valueDescriptions[value] || value;
  }

  /**
   * 生成带有描述的Markdown格式文档
   * @returns Markdown格式的枚举文档
   */
  generateMarkdownDoc(): string {
    let markdown = `# ${this.enumDescription}\n\n`;
    markdown += `## 可选值\n\n`;
    
    const values = this.getAllValues();
    values.forEach(value => {
      markdown += `- \`${value}\`: ${this.getValueDescription(value)}\n`;
    });
    
    return markdown;
  }

  /**
   * 生成 Zod 枚举 Schema
   * @param options 可选参数，用于处理特殊情况 (如值映射、额外值)
   * @param options.valueMapping - 将枚举键映射到不同的 Schema 值 (例如 { PENDING: "pending" })
   * @param options.extraValues - 在 Schema 中添加额外的枚举值及其描述 (例如 { "all": "列出所有任务" })
   * @returns 带有描述的 Zod 枚举 Schema
   */
  generateSchema(options?: {
    valueMapping?: Partial<Record<keyof T, string>>; // 允许部分映射
    extraValues?: Record<string, string>;
    customDescription?: string; // 可选的自定义顶层描述，覆盖自动生成的描述
  }): z.ZodEnum<[string, ...string[]]> { // 返回类型为 string 以适应映射和额外值

    let schemaValues: string[] = [];
    const finalDescriptions: Record<string, string> = {};
    
    // 获取所有有效的字符串枚举值
    const enumEntries = Object.entries(this.values)
      .filter(([key, value]) => isNaN(Number(key)) && typeof value === 'string');

    // 处理基础枚举值和可能的映射
    enumEntries.forEach(([key, enumValue]) => {
        const enumValueStr = String(enumValue); // 确保是字符串
        const schemaValue = options?.valueMapping?.[key as keyof T] ?? enumValueStr; 
        if (!schemaValues.includes(schemaValue)) { // 避免重复添加（如果多个键映射到同一个值）
            schemaValues.push(schemaValue);
        }
        // 描述始终与 Schema 中使用的值关联
        finalDescriptions[schemaValue] = this.valueDescriptions[enumValueStr as V] || enumValueStr;
    });

    // 处理额外值
    if (options?.extraValues) {
        Object.entries(options.extraValues).forEach(([value, description]) => {
            if (!schemaValues.includes(value)) {
                schemaValues.push(value);
            }
            finalDescriptions[value] = description;
        });
    }

    // 确保至少有一个值
    if (schemaValues.length === 0) {
      throw new Error("Enum schema must have at least one value.");
    }

    // 创建基础 Zod 枚举 Schema
    const baseSchema = z.enum(schemaValues as [string, ...string[]]);

    // 构建描述字符串，使用自定义描述或生成默认描述
    let descriptionText = options?.customDescription ?? `${this.enumDescription}\n\n可选值：\n`;
    
    // 如果使用默认描述，添加所有值的描述
    if (!options?.customDescription) {
      // 确保按 schemaValues 的顺序生成描述
      schemaValues.forEach(value => {
        descriptionText += `- ${value}: ${finalDescriptions[value] || value}\n`;
      });
    }

    // 返回带有描述的 Schema
    const schema = baseSchema.describe(descriptionText.trim());
    console.debug(schema);
    return schema;
  }

  /**
   * 将枚举值和对应的描述转换为对象
   * 主要用于JSON序列化和展示
   */
  toJSON() {
    return {
      enumDescription: this.enumDescription,
      values: this.values,
      valueDescriptions: this.valueDescriptions
    };
  }
  
  /**
   * 将枚举值转换为Select选项数组
   * 可用于UI组件的Select/Dropdown选择框
   * @returns {Array<{value: string, label: string}>} 选项数组
   */
  toSelectOptions(): Array<{value: string, label: string}> {
    return this.getAllValues().map(value => ({
      value,
      label: `${this.getValueDescription(value)} (${value})`
    }));
  }
  
  /**
   * 验证是否是有效的枚举值
   * @param value 要验证的值
   * @returns 是否是有效的枚举值
   */
  isValidValue(value: any): value is V {
    return this.getAllValues().includes(value as V);
  }
}

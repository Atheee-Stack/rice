// rice/libs/_core/kernel/src/utils/spec-validator.util.ts

import Ajv from 'ajv';
import type { ErrorObject, SchemaObject, Options as AjvOptions } from 'ajv';
import addFormats from 'ajv-formats';
import {
  isString,
  isDate
} from './primitive.util';

/**
 * Schema validation specification properties
 * 
 * 模式验证规范属性定义
 * @domain Core
 */
export interface SpecSchema {
  schema: SchemaObject;
  messages?: Record<string, string>;
  transform?: SpecTransform[];
}

/**
 * 支持的数据转换操作类型
 * 
 * @domain Core
 */
export type SpecTransform =
  | 'trim'
  | 'toLowerCase'
  | 'toUpperCase'
  | 'trimStart'
  | 'trimEnd'
  | 'toISOString'
  | 'toLocaleString'
  | 'parseInt'
  | 'parseFloat';

/**
 * 验证结果结构定义
 * 
 * @domain Core
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  normalized?: T;
  errors: string[];
}

/**
 * 基于 JSON Schema 的验证器（支持值转换和自定义错误）
 * 
 * 功能特点：
 * 1. 集成 AJV 实现高效验证
 * 2. 支持预处理转换（trim/大小写转换/日期格式化等）
 * 3. 多层级自定义错误消息
 * 4. 内置常用格式扩展（username/password/objectId/uuid）
 * 
 * 使用示例：
 * ```typescript
 * const validator = new SpecValidator();
 * const result = validator.validate(data, {
 *   schema: { type: 'string', minLength: 3 },
 *   transform: ['trim'],
 *   messages: { minLength: "长度至少为 3 字符" }
 * });
 * ```
 * 
 * @domain Core
 */
export class SpecValidator {
  private ajv: Ajv;

  constructor(options: AjvOptions = {}) {
    this.ajv = new Ajv({
      allErrors: true,      // 收集所有错误
      coerceTypes: true,    // 自动类型转换
      useDefaults: true,   // 使用默认值填充
      strict: false,        // 兼容模式（允许额外属性）
      messages: true,       // 内置错误消息
      ...options            // 允许传入自定义选项
    });

    // 添加标准格式支持（email/url 等）
    addFormats(this.ajv);

    /** 添加自定义格式校验规则 */
    this.ajv.addFormat('username', {
      validate: (value: string) => /^[a-zA-Z0-9_-]{3,24}$/.test(value),
      async: false
    } as const);

    this.ajv.addFormat('password', {
      validate: (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(value),
      async: false
    } as const);

    this.ajv.addFormat('objectId', {
      validate: (value: string) => /^[0-9a-fA-F]{24}$/.test(value),
      async: false
    } as const);

    this.ajv.addFormat('uuid', {
      validate: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
      async: false
    } as const);
  }

  /**
   * 执行数据验证和转换
   * 
   * 处理流程：
   * 1. 应用预处理转换规则
   * 2. 执行 JSON Schema 校验
   * 3. 生成可读性错误消息
   * 
   * @param value - 待验证的原始数据
   * @param spec - 验证规范（schema/transforms/messages）
   * @param options - 配置选项（默认启用转换）
   * @returns 标准化验证结果
   * 
   * @domain Core
   */
  validate<T>(
    value: unknown,
    spec: SpecSchema,
    options: { applyTransformations?: boolean } = { applyTransformations: true }
  ): ValidationResult<T> {
    try {
      // 步骤1: 应用预处理转换
      const normalizedValue = this.normalize(
        value,
        spec.transform,
        options.applyTransformations
      );

      // 步骤2: 编译并执行验证
      const validateFn = this.ajv.compile(spec.schema);
      const valid = validateFn(normalizedValue);

      return {
        valid,
        normalized: normalizedValue as T,
        errors: valid ? [] : this.formatErrors(validateFn.errors, spec)
      };
    } catch {
      // 验证过程发生致命错误
      return {
        valid: false,
        normalized: value as T,
        errors: ['数据校验过程异常']
      };
    }
  }

  /**
   * 数据标准化处理（按转换规则处理原始值）
   * 
   * 支持转换操作:
   * - 字符串: trim/大小写转换
   * - 日期: ISO8601/本地化格式
   * - 数字: 整型/浮点转换
   * 
   * @param value - 原始输入值
   * @param transforms - 转换规则序列
   * @param apply - 是否启用转换
   * @returns 处理后的标准化值
   * 
   * @domain Core
   */
  normalize(
    value: unknown,
    transforms: SpecTransform[] = [],
    apply = true
  ): unknown {
    if (!apply || !transforms?.length) return value;

    // 按顺序应用转换规则
    return transforms.reduce((currentValue, transformOp) => {
      try {
        switch (transformOp) {
          case 'trim':
            return isString(currentValue) ? currentValue.trim() : currentValue;
          case 'toLowerCase':
            return isString(currentValue) ? currentValue.toLowerCase() : currentValue;
          case 'toUpperCase':
            return isString(currentValue) ? currentValue.toUpperCase() : currentValue;
          case 'trimStart':
            return isString(currentValue) ? currentValue.trimStart() : currentValue;
          case 'trimEnd':
            return isString(currentValue) ? currentValue.trimEnd() : currentValue;
          case 'toISOString':
            return handleDateTransform(currentValue, d => d.toISOString());
          case 'toLocaleString':
            return handleDateTransform(currentValue, d => d.toLocaleString());
          case 'parseInt':
            return convertNumeric(currentValue, parseInt);
          case 'parseFloat':
            return convertNumeric(currentValue, parseFloat);
          default:
            return currentValue;
        }
      } catch {
        return currentValue; // 静默处理转换错误
      }
    }, value);

    /** 日期转换辅助函数 */
    function handleDateTransform(
      val: unknown,
      converter: (date: Date) => string
    ): unknown {
      if (isDate(val)) return converter(val);
      if (!isString(val)) return val;

      const date = new Date(val);
      return isNaN(date.getTime()) ? val : converter(date);
    }

    /** 数字转换辅助函数 */
    function convertNumeric(
      val: unknown,
      converter: (s: string) => number
    ): unknown {
      return typeof val === 'string' && !isNaN(converter(val))
        ? converter(val)
        : val;
    }
  }

  /**
   * 生成可读性错误消息（优先自定义消息）
   * 
   * 消息查找顺序:
   * 1. 完整路径消息（error.instancePath.error.keyword）
   * 2. 全局关键字消息（error.keyword）
   * 3. 内置语义化消息（类型/长度/范围等）
   * 4. AJV 原始错误消息（移除前缀）
   * 
   * @param error - AJV错误对象
   * @param spec - 包含自定义消息的规范
   * @returns 可读性错误文本
   * 
   * @domain Core
   */
  private getReadableError(
    error: ErrorObject,
    spec: SpecSchema
  ): string {
    // 构造实例路径键（path.keyword）
    const pathKey = `${error.instancePath.replace(/\//g, '.')}.${error.keyword}`
      .replace(/^\./, '');

    // 优先匹配完整路径消息
    if (spec.messages?.[pathKey]) return spec.messages[pathKey];

    // 次优匹配关键字全局消息
    if (spec.messages?.[error.keyword]) return spec.messages[error.keyword];

    // 内置语义化消息（类型/长度/范围等）
    switch (error.keyword) {
      case 'type':
        return `要求类型：${error.params.type}`;
      case 'required':
        return `缺少必需属性：${error.params.missingProperty}`;
      case 'minLength':
        return `长度至少为 ${error.params.limit} 字符`;
      case 'maxLength':
        return `长度不可超过 ${error.params.limit} 字符`;
      case 'minimum':
        return `最小值为 ${error.params.limit}`;
      case 'maximum':
        return `最大值为 ${error.params.limit}`;
      case 'format':
        return `需要符合 ${error.params.format} 格式`;
      case 'uniqueItems':
        return '数组元素不能重复';
      case 'additionalProperties':
        return `不允许的额外属性: ${error.params.additionalProperty}`;
      case 'pattern':
        return '格式不符合要求';
      default:
        // 移除AJV原始消息的前缀
        return this.ajv.errorsText([error], { dataVar: '' });
    }
  }

  /**
   * 转换AJV原生错误为可读消息列表
   * 
   * @param errors - AJV错误对象数组
   * @param spec - 验证规范
   * @returns 可读错误消息数组
   * 
   * @domain Core
   */
  private formatErrors(
    errors: Array<ErrorObject> | null | undefined,
    spec: SpecSchema
  ): string[] {
    return (errors || []).map(err => this.getReadableError(err, spec));
  }
}

// 暴露AJV SchemaObject类型
export type { SchemaObject } from 'ajv';
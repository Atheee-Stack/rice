// rice/libs/_core/kernel/src/domain/primitive-value-object.base.ts
import {
  Primitive,
  isPrimitive,
  primitiveEquals,
  primitiveHash,
  primitiveCompare
} from '../utils/primitive.util';
import { SpecSchema, SpecValidator } from '../utils/spec-validator.util';
import { fail, ok, type Result } from '../utils/result.util';
import { pipe } from '../utils/functional.util';

/**
 • PrimitiveValueObject - 不可变原始值对象基类（函数式风格）
 • 
 • 特点:
 • 1. 封装单个原始类型值（Primitive）
 • 2. 值相等性比较（而非引用）
 • 3. 基于规范验证（JSON Schema）
 • 4. 支持转换和标准化
 • 5. 完全的不可变性和纯函数操作
 • 
 • 使用示例：
 • ```typescript
 • const emailSpec: SpecSchema = {
 •   schema: {
 •     type: 'string',
 •     pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
 •   },
 •   transforms: ['trim', 'toLowerCase']
 • };
 • 
 • const createEmail = PrimitiveValueObject.factory(emailSpec);
 • const emailResult = createEmail(' User@Example.COM ');
 • 
 • if (emailResult.isOk()) {
 •   console.log(emailResult.unwrap().value); // 'user@example.com'
 • }
 • ```
 • 
 • @domain Core Domain
 */

// ===================== 值对象定义 =====================
export interface PrimitiveValueObject<T extends Primitive> {
  readonly value: T;
  readonly isValid: boolean;
  readonly validationErrors: string[];
  toString(): string;
  [Symbol.toPrimitive](): T;
}

// ===================== 工厂函数类型 =====================
/**
 • 值对象工厂函数
 • 
 • @template T - 原始值类型
 • 
 • @param input - 原始输入值
 • 
 • @returns Result包装的值对象
 */
export type ValueObjectFactory<T extends Primitive> = (
  input: unknown
) => Result<PrimitiveValueObject<T>, Error>;

// ===================== 核心功能 =====================
/**
 • 创建值对象工厂
 • 
 • 功能：
 • 1. 验证输入值
 • 2. 应用转换规则
 • 3. 创建不可变值对象
 • 
 • @template T - 原始值类型
 • 
 • @param spec - 验证规范
 • 
 • @returns 值对象工厂函数
 */
export function createValueObjectFactory<T extends Primitive>(
  spec: SpecSchema
): ValueObjectFactory<T> {
  const validator = new SpecValidator();

  return (input: unknown) => {
    // 应用规范转换和验证
    const result = validator.validate<T>(input, spec, {
      applyTransformations: true
    });

    if (!result.valid) {
      return fail(
        new Error(`值对象验证失败: ${result.errors.join('; ')}`)
      );
    }

    // 验证转换后是否为原始类型
    if (!isPrimitive(result.normalized)) {
      return fail(
        new Error('转换后的值不是有效原始类型')
      );
    }

    // 成功创建值对象
    return ok({
      value: result.normalized as T,
      isValid: true,
      validationErrors: [],
      [Symbol.toPrimitive]: () => result.normalized as T,
      toString: () => String(result.normalized)
    });
  };
}

/**
 • 值对象相等性比较
 • 
 • @param a - 第一个值对象
 • @param b - 第二个值对象
 • 
 • @returns 是否值相等
 */
export function voEquals<T extends Primitive>(
  a: PrimitiveValueObject<T>,
  b: PrimitiveValueObject<T>
): boolean {
  return primitiveEquals(a.value, b.value);
}

/**
 • 值对象哈希值计算
 • 
 • @param vo - 值对象
 * 
 * @returns 唯一哈希字符串
 */
export function voHash<T extends Primitive>(
  vo: PrimitiveValueObject<T>
): string {
  return primitiveHash(vo.value);
}

/**
 • 值对象排序比较
 • 
 • @param a - 第一个值对象
 • @param b - 第二个值对象
 * 
 * @returns 排序结果 (-1, 0, 1)
 */
export function voCompare<T extends Primitive>(
  a: PrimitiveValueObject<T>,
  b: PrimitiveValueObject<T>
): number {
  return primitiveCompare(a.value, b.value);
}

// ===================== 实用函数 =====================
/**
 • 解包值对象值 (安全方式)
 • 
 • @param result - 值对象结果
 • @param defaultValue - 验证失败时的默认值
 • 
 • @returns 原始值或默认值
 */
export function unpackValue<T extends Primitive>(
  result: Result<PrimitiveValueObject<T>, Error>,
  defaultValue: T
): T {
  return result.isOk() ? result.unwrap().value : defaultValue;
}

/**
 • 链式值对象转换
 • 
 • 功能：
 • 1. 按顺序应用多个转换函数
 • 2. 类型安全
 • 
 • 示例：
 • ```typescript
 • const toUpperCase = (s: string) => s.toUpperCase();
 • const trim = (s: string) => s.trim();
 • 
 • const processor = chainTransform(
 •   createEmailFactory,
 •   (vo) => toUpperCase(vo.value),
 •   createNameFactory
 • );
 • ```
 • 
 • @param factories - 转换函数序列
 • 
 • @returns 最终值对象工厂函数
 */
export function chainTransform<T extends Primitive>(
  ...factories: ValueObjectFactory<T>[]
): ValueObjectFactory<T> {
  return (input: unknown) => {
    let current: unknown = input;

    for (const factory of factories) {
      const result = factory(current);
      if (result.isFail()) return result;
      current = result.unwrap().value;
    }

    return factories[factories.length - 1](current);
  };
}

// ===================== 静态构造函数 =====================
/**
 • 创建值对象静态工厂
 • 
 • 提供更便捷的创建方式：
 • 1. 柯里化参数
 • 2. 自动推断类型
 • 
 • 使用示例：
 • ```typescript
 • const createEmail = PrimitiveValueObject.factory(emailSpec);
 • ```
 */
export const PrimitiveValueObject = {
  /**
   • 创建值对象工厂函数
   • 
   • @param spec - 验证规范
   • 
   • @returns 值对象工厂函数
   */
  factory: <T extends Primitive>(
    spec: SpecSchema
  ): ValueObjectFactory<T> => {
    return pipe(
      createValueObjectFactory<T>,
      // 可选：添加日志记录
      // logInputOutput('ValueObjectFactory')
    )(spec);
  },

  /**
   • 直接创建值对象 (简便方法)
   • 
   • 注意：忽略验证错误
   • 
   • @param value - 原始值
   • 
   • @returns 值对象实例
   */
  of: <T extends Primitive>(value: T): PrimitiveValueObject<T> => ({
    value,
    isValid: true,
    validationErrors: [],
    toString: () => String(value),
    [Symbol.toPrimitive]: () => value
  }),

  /**
   • 严格创建值对象
   • 
   • @param spec - 验证规范
   • @param value - 原始值
   • 
   • @returns 验证后的值对象
   */
  from: <T extends Primitive>(
    spec: SpecSchema,
    value: unknown
  ): Result<PrimitiveValueObject<T>, Error> => {
    return createValueObjectFactory<T>(spec)(value);
  }
};
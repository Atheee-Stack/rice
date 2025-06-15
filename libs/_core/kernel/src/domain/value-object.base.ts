// rice/libs/_core/kernel/src/domain/value-object.base.ts

import {
  Mapper,
  Predicate,
} from '../utils/functional.util';
import {
  Primitive,
  primitiveEquals,
  primitiveHash,
  primitiveCompare,
  toPrimitive,
  isPrimitive
} from '../utils/primitive.util';
import {
  Result,
  ok,
  fail
} from '../utils/result.util';
import {
  SpecSchema,
  SpecValidator
} from '../utils/spec-validator.util';

/**
 * 值对象基类（函数式编程风格）
 * 
 * 核心特性：
 * 1. 严格不可变性（Immutable）
 * 2. 基于规范的自动验证
 * 3. 函数式组合支持
 * 4. 类型安全的创建模式
 * 
 * @template T - 值对象的内部值类型
 * 
 * @domain Domain-Driven Design (Core Domain)
 */
export abstract class ValueObject<T> {
  /**
   * 受保护的值对象内部状态
   * 外部只能通过访问器获取，无法直接修改
   */
  protected readonly _value: T;

  /**
   * 构造函数（受保护）
   * 强制通过工厂方法创建实例
   * 
   * @param value - 内部状态值
   */
  protected constructor(value: T) {
    this._value = Object.freeze(value) as T;
  }

  /**
   * 值对象的值访问器
   * 
   * @returns 内部值的只读副本
   */
  get value(): Readonly<T> {
    return this.deepFreeze(this._value);
  }

  /**
   * 深度冻结对象（确保不可变性）
   * 
   * @param obj - 需要冻结的对象
   * @returns 深度冻结后的只读对象
   */
  private deepFreeze<U>(obj: U): Readonly<U> {
    if (obj === null || typeof obj !== 'object') return obj as Readonly<U>;

    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (
        // 使用安全的属性检查
        Object.prototype.hasOwnProperty.call(obj, prop) &&
        typeof (obj as Record<string, unknown>)[prop] === 'object' &&
        (obj as Record<string, unknown>)[prop] !== null
      ) {
        this.deepFreeze((obj as Record<string, unknown>)[prop]);
      }
    });

    return obj as Readonly<U>;
  }

  /**
   * 值对象相等性比较
   * 
   * @param other - 另一个值对象
   * @returns 两个值对象是否相等
   */
  equals(other: ValueObject<T>): boolean {
    if (this === other) return true;

    // 原始类型直接比较
    if (isPrimitive(this._value)) {
      return primitiveEquals(
        toPrimitive(this._value) as Primitive,
        toPrimitive(other._value) as Primitive
      );
    }

    // 非原始类型使用深度比较
    return this.deepEqual(this._value, other._value);
  }

  /**
   * 深度对象比较
   * 
   * @param a - 第一个对象
   * @param b - 第二个对象
   * @returns 两个对象是否深度相等
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    // 基本类型比较
    if (a === b) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

    // 数组比较
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.deepEqual(val, b[i]));
    }

    // 对象比较
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keysA = Object.keys(aObj);
    const keysB = Object.keys(bObj);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key =>
      Object.prototype.hasOwnProperty.call(bObj, key) &&
      this.deepEqual(aObj[key], bObj[key])
    );
  }

  /**
   * 获取值对象的哈希表示
   * 
   * @returns 唯一哈希字符串
   */
  hashCode(): string {
    // 原始类型直接哈希
    if (isPrimitive(this._value)) {
      return primitiveHash(toPrimitive(this._value) as Primitive);
    }

    // 复杂对象使用JSON序列化哈希
    try {
      return primitiveHash(JSON.stringify(this._value));
    } catch {
      return 'complex_object_hash_fallback';
    }
  }

  /**
   * 值对象比较（用于排序）
   * 
   * @param other - 另一个值对象
   * @returns 比较结果（-1, 0, 1）
   */
  compare(other: ValueObject<T>): number {
    // 原始类型直接比较
    if (isPrimitive(this._value)) {
      return primitiveCompare(
        toPrimitive(this._value) as Primitive,
        toPrimitive(other._value) as Primitive
      );
    }

    // 默认比较哈希值
    return primitiveCompare(this.hashCode(), other.hashCode());
  }

  /**
   * 值对象验证规范
   * 子类必须实现此方法定义验证规则
   * 
   * @returns 验证规范对象
   */
  protected abstract getSpec(): SpecSchema;

  /**
   * 创建值对象的工厂方法（核心）
   * 
   * @param rawValue - 原始输入值
   * @param specOverride - 可选的验证规范覆盖
   * @returns 创建结果（成功或失败）
   */
  static create<U, T extends ValueObject<U>>(
    this: (new (value: U) => T) & Pick<typeof ValueObject, 'create' | 'createAsync'>,
    rawValue: unknown,
    specOverride?: SpecSchema
  ): Result<T> {
    // 获取规范而不创建实例
    const prototype = this.prototype as ValueObject<U>;
    const spec = specOverride || prototype.getSpec();
    const validator = new SpecValidator();

    // 执行验证
    const validation = validator.validate<U>(rawValue, spec);

    if (!validation.valid) {
      return fail(new Error(validation.errors.join('; ')));
    }

    // 创建值对象实例
    try {
      // 修复：确保只实例化具体子类
      const ConcreteClass = this as new (value: U) => T;
      return ok(new ConcreteClass(validation.normalized as U));
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 异步创建值对象的工厂方法
   * 
   * @param rawValue - 原始输入值
   * @param specOverride - 可选的验证规范覆盖
   * @returns Promise包装的创建结果
   */
  static async createAsync<U, T extends ValueObject<U>>(
    this: new (value: U) => T,
    rawValue: unknown,
    specOverride?: SpecSchema
  ): Promise<Result<T>> {
    // 直接实现异步创建逻辑，不依赖 create 方法
    const prototype = this.prototype as ValueObject<U>;
    const spec = specOverride || prototype.getSpec();
    const validator = new SpecValidator();

    // 执行验证
    const validation = validator.validate<U>(rawValue, spec);

    if (!validation.valid) {
      return fail(new Error(validation.errors.join('; ')));
    }

    // 创建值对象实例
    try {
      return ok(new this(validation.normalized as U));
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  }


  /**
   * 函数式值对象转换
   * 
   * @param mapper - 映射函数
   * @returns 转换后的新值对象
   */
  map<U>(mapper: Mapper<T, U>): ValueObject<U> {
    // 使用泛型构造函数避免any
    const Constructor = this.constructor as new (value: U) => ValueObject<U>;
    return new Constructor(mapper(this._value));
  }

  /**
   * 函数式值对象过滤
   * 
   * @param predicate - 断言函数
   * @returns 符合条件时返回自身，否则返回错误
   */
  filter(predicate: Predicate<T>): Result<this> {
    return predicate(this._value)
      ? ok(this)
      : fail(new Error('ValueObject filter condition not satisfied'));
  }

  /**
   * 柯里化值对象创建函数
   * 
   * @returns 柯里化的创建函数
   */
  static curriedCreate<U, T extends ValueObject<U>>(
    this: new (value: U) => T
  ): (value: unknown) => Result<T> {
    // 直接使用构造函数实现柯里化
    return (val: unknown) => {
      const prototype = this.prototype as ValueObject<U>;
      const spec = prototype.getSpec();
      const validator = new SpecValidator();

      const validation = validator.validate<U>(val, spec);

      if (!validation.valid) {
        return fail(new Error(validation.errors.join('; ')));
      }

      try {
        return ok(new this(validation.normalized as U));
      } catch (error) {
        return fail(error instanceof Error ? error : new Error(String(error)));
      }
    };
  }


  /**
   * 管道式值对象转换
   * 
   * @param fns - 转换函数序列
   * @returns 转换后的新值对象
   */
  pipe(...fns: Array<Mapper<T, T>>): ValueObject<T> {
    // 确保至少有一个函数
    if (fns.length === 0) return this;

    // 创建管道函数
    const pipeline = fns.reduce((prev, current) =>
      (x: T) => current(prev(x)),
      (x: T) => x
    );

    return this.map(pipeline);
  }

  /**
   * 异步管道式值对象转换
   * 
   * @param fns - 异步转换函数序列
   * @returns Promise包装的转换结果
   */
  async asyncPipe(...fns: Array<Mapper<T, Promise<T>>>): Promise<ValueObject<T>> {
    // 确保至少有一个函数
    if (fns.length === 0) return this;

    // 创建异步管道函数
    const asyncPipeline = fns.reduce((prev, current) =>
      async (x: T) => current(await prev(x)),
      async (x: T) => x
    );

    const newValue = await asyncPipeline(this._value);
    return new (this.constructor as new (value: T) => ValueObject<T>)(newValue);
  }

  /**
   * 值对象的JSON序列化表示
   * 
   * @returns 可序列化的值
   */
  toJSON(): unknown {
    return isPrimitive(this._value)
      ? toPrimitive(this._value)
      : this._value;
  }

  /**
   * 值对象的字符串表示
   * 
   * @returns 字符串描述
   */
  toString(): string {
    return String(this.toJSON());
  }
}

// ===================== 函数式工具扩展 =====================

/**
 * 值对象验证管道
 * 
 * @param spec - 验证规范
 * @returns 验证管道函数
 */
export const validationPipe = <T>(spec: SpecSchema): Mapper<unknown, Result<T>> => {
  const validator = new SpecValidator();

  return (value: unknown) => {
    const result = validator.validate<T>(value, spec);
    return result.valid
      ? ok(result.normalized as T)
      : fail(new Error(result.errors.join('; ')));
  };
};

/**
 * 值对象转换管道
 * 
 * @param fns - 转换函数序列
 * @returns 转换管道函数
 */
export const valueObjectPipe = <T>(
  ...fns: Array<Mapper<T, T>>
): Mapper<ValueObject<T>, ValueObject<T>> => {
  return (vo: ValueObject<T>) => vo.pipe(...fns);
};

/**
 * 值对象异步转换管道
 * 
 * @param fns - 异步转换函数序列
 * @returns 异步转换管道函数
 */
export const asyncValueObjectPipe = <T>(
  ...fns: Array<Mapper<T, Promise<T>>>
): Mapper<ValueObject<T>, Promise<ValueObject<T>>> => {
  return (vo: ValueObject<T>) => vo.asyncPipe(...fns);
};

/**
 * 值对象相等性比较函数
 * 
 * @returns 比较函数
 */
export const valueObjectEquals = <T>(): Mapper<ValueObject<T>, Predicate<ValueObject<T>>> => {
  return (a: ValueObject<T>) => (b: ValueObject<T>) => a.equals(b);
};

/**
 * 值对象哈希函数
 * 
 * @returns 哈希生成函数
 */
export const valueObjectHash = <T>(): Mapper<ValueObject<T>, string> => {
  return (vo: ValueObject<T>) => vo.hashCode();
};

/**
 * 值对象比较函数（用于排序）
 * 
 * @returns 比较函数
 */
export const valueObjectCompare = <T>(): Mapper<ValueObject<T>, (other: ValueObject<T>) => number> => {
  return (a: ValueObject<T>) => (b: ValueObject<T>) => a.compare(b);
};

// ===================== 类型扩展 =====================

/**
 * 从值对象类型提取原始值类型
 * 
 * @template V - 值对象类型
 */
export type ValueType<V> = V extends ValueObject<infer T> ? T : never;

/**
 * 值对象创建结果类型
 * 
 * @template V - 值对象类型
 */
export type ValueObjectResult<V> = Result<V, Error>;

/**
 * 值对象异步创建结果类型
 * 
 * @template V - 值对象类型
 */
export type AsyncValueObjectResult<V> = Promise<ValueObjectResult<V>>;
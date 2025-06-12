// rice/libs/_core/kernel/src/utils/functional.util.ts
/**
 * 函数式编程工具模块：提供函数类型定义、组合、柯里化、记忆化等核心函数式工具
 * 遵循函数式编程范式，提升代码的可组合性、可测试性和可维护性
 */

// ===================== 函数类型定义 =====================
/**
 * 谓词函数类型 - 接收一个值并返回布尔值
 * @template T 输入值类型
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * 映射函数类型 - 接收一个值并转换为另一种类型
 * @template T 输入值类型
 * @template U 输出值类型
 */
export type Mapper<T, U> = (value: T) => U;

/**
 * 归约函数类型 - 用于累加器模式
 * @template T 输入值类型
 * @template U 输出/累加器类型
 */
export type Reducer<T, U> = (accumulator: U, value: T) => U;

// 任意函数的通用类型（用于处理不确定参数和返回值的函数组合）
type AnyFunction = (...args: unknown[]) => unknown;

// ===================== 函数组合工具 =====================
/**
 * 管道函数 (pipe) - 从左到右执行函数组合
 * 支持1-4个函数的组合（可通过扩展支持更多），返回的函数类型与输入函数链的输入输出类型严格匹配
 * @example pipe(fn1, fn2)(x) 等价于 fn2(fn1(x))
 */
// 重载声明（合并为一个函数声明）
export function pipe<T, U>(fn1: (arg: T) => U): (arg: T) => U;
export function pipe<T, U, V>(fn1: (arg: T) => U, fn2: (arg: U) => V): (arg: T) => V;
export function pipe<T, U, V, W>(fn1: (arg: T) => U, fn2: (arg: U) => V, fn3: (arg: V) => W): (arg: T) => W;
export function pipe<T, U, V, W, X>(fn1: (arg: T) => U, fn2: (arg: U) => V, fn3: (arg: V) => W, fn4: (arg: W) => X): (arg: T) => X;
// 通用实现
export function pipe(...fns: AnyFunction[]): AnyFunction {
  return (value: unknown) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * 组合函数 (compose) - 从右到左执行函数组合（与pipe方向相反）
 * 支持1-4个函数的组合（可通过扩展支持更多），返回的函数类型与输入函数链的输入输出类型严格匹配
 * @example compose(fn1, fn2)(x) 等价于 fn1(fn2(x))
 */
// 重载声明（合并为一个函数声明）
export function compose<U, V>(fn1: (arg: U) => V): (arg: U) => V;
export function compose<T, U, V>(fn1: (arg: U) => V, fn2: (arg: T) => U): (arg: T) => V;
export function compose<S, T, U, V>(fn1: (arg: U) => V, fn2: (arg: T) => U, fn3: (arg: S) => T): (arg: S) => V;
export function compose<R, S, T, U, V>(fn1: (arg: U) => V, fn2: (arg: T) => U, fn3: (arg: S) => T, fn4: (arg: R) => S): (arg: R) => V;
// 通用实现
export function compose(...fns: AnyFunction[]): AnyFunction {
  return (value: unknown) => fns.reduceRight((acc, fn) => fn(acc), value);
}

// ===================== 柯里化工具 =====================
/**
 * 将二元函数柯里化（Currying）
 * 柯里化是将多参数函数转换为一系列单参数函数的技术，支持延迟执行和部分应用
 * @template T 第一个参数的类型
 * @template U 第二个参数的类型
 * @template V 函数返回值的类型
 * @param fn 要柯里化的二元函数（接收两个参数）
 * @returns 柯里化后的函数（分两步接收参数，最终返回原函数结果）
 * @example const add = curry((a, b) => a + b); add(1)(2) → 3
 */
export const curry = <T, U, V>(fn: (x: T, y: U) => V) => {
  return (x: T) => (y: U) => fn(x, y);
};

// ===================== 记忆化工具 =====================
/**
 * 创建记忆化版本的函数（Memoization）
 * 记忆化通过缓存函数的历史调用结果，避免重复计算，提升性能
 * 支持基本类型（自动序列化）和对象类型（通过WeakMap引用标识）的参数缓存
 * @template T 函数参数类型的元组（用于类型推断）
 * @template U 函数返回值的类型
 * @param fn 要记忆化的原始函数
 * @returns 记忆化后的函数（相同参数调用时直接返回缓存结果）
 * @example const factorial = memoize(n => n <= 1 ? 1 : n * factorial(n-1)); factorial(5) → 120（第二次调用更快）
 */
export const memoize = <T extends unknown[], U>(fn: (...args: T) => U): (...args: T) => U => {
  // 缓存容器：存储基本类型参数的缓存结果（类型明确为U，避免undefined）
  const cache = new Map<string, U>();
  // 对象参数缓存：使用WeakMap（键为对象引用，值为唯一标识）避免内存泄漏
  const argCache = new WeakMap<object, string>();
  let counter = 0; // 用于生成对象参数的唯一标识

  return (...args: T) => {
    // 生成缓存键（处理不同类型的参数）
    const key = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // 对象类型：使用WeakMap生成唯一标识（避免深比较）
        let objId = argCache.get(arg);
        if (objId === undefined) {
          objId = `obj_${counter++}`;
          argCache.set(arg, objId);
        }
        return objId;
      }
      // 基本类型（字符串、数字、布尔等）：直接序列化为JSON字符串
      return JSON.stringify(arg);
    }).join('|'); // 用"|"连接所有参数的键，生成唯一缓存键

    // 检查缓存是否存在（安全方式，避免非空断言）
    if (cache.has(key)) {
      // 由于已通过cache.has检查，TypeScript可推断cache.get(key)为U类型（非undefined）
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache.get(key)!; // 此处使用非空断言是安全的（因已确认键存在）
    }

    // 缓存未命中：调用原函数并缓存结果
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};
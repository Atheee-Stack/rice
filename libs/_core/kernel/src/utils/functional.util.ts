// rice/libs/_core/kernel/src/utils/functional.util.ts

/**
 * 函数式编程工具（严格模式兼容）
 * 
 * @core Functional Programming Utilities (Strict Mode)
 */

// ===================== 核心类型定义 =====================
export type Predicate<T> = (value: T) => boolean;
export type Mapper<T, U> = (value: T) => U;
export type Reducer<T, U> = (acc: U, value: T) => U;
export type SideEffect<T> = (value: T) => void;

// 函数类型约束（严格模式）
type AnyFunction = (...args: unknown[]) => unknown;

// ===================== 高级函数组合 =====================
/**
 * 安全管道函数（类型严格版）
 */
export function pipe<T>(value: T): T;
export function pipe<T1, R1>(value: T1, fn1: (arg: T1) => R1): R1;
export function pipe<T1, R1, R2>(value: T1, fn1: (arg: T1) => R1, fn2: (arg: R1) => R2): R2;
export function pipe<T1, R1, R2, R3>(value: T1, fn1: (arg: T1) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3): R3;
export function pipe(value: unknown, ...fns: AnyFunction[]): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * 函数组合器（执行顺序：从右到左）
 * 
 * @returns 组合后的函数
 */
export function compose<F1 extends AnyFunction>(fn1: F1): F1;
export function compose<F1 extends AnyFunction, F2 extends (arg: ReturnType<F1>) => unknown>(
  fn2: F2,
  fn1: F1
): (arg: Parameters<F1>[0]) => ReturnType<F2>;
export function compose<F1 extends AnyFunction, F2 extends (arg: ReturnType<F1>) => unknown, F3 extends (arg: ReturnType<F2>) => unknown>(
  fn3: F3,
  fn2: F2,
  fn1: F1
): (arg: Parameters<F1>[0]) => ReturnType<F3>;
export function compose(...fns: AnyFunction[]): AnyFunction {
  return (input: unknown) =>
    fns.reduceRight((acc, fn) => fn(acc), input);
}

// ===================== 实用函数 =====================
/**
 * 恒等函数（Identity Function）
 * 
 * @returns 输入值本身
 */
export const identity = <T>(x: T): T => x;

/**
 * 常量函数（Constant Function）
 * 
 * @returns 总是返回固定值的函数
 */
export const constant = <T>(c: T) => (): T => c;

/**
 * 空操作（No-op Function）
 */
export const noop = (): void => {
  // 显式空函数
};

/**
 * 逻辑否定（Predicate Negation）
 */
export const not = <T>(predicate: Predicate<T>): Predicate<T> =>
  (x: T) => !predicate(x);

/**
 * 参数反转（Flip Arguments）
 */
export const flip = <A, B, R>(fn: (a: A, b: B) => R): (b: B, a: A) => R =>
  (b: B, a: A) => fn(a, b);

// ===================== 部分应用 =====================
/**
 * 左部分应用（Partial Application Left）
 */
export const partialL = <A, B, R>(
  fn: (a: A, b: B) => R,
  a: A
): ((b: B) => R) =>
  (b: B) => fn(a, b);

/**
 * 右部分应用（Partial Application Right）
 */
export const partialR = <A, B, R>(
  fn: (a: A, b: B) => R,
  b: B
): ((a: A) => R) =>
  (a: A) => fn(a, b);

// ===================== 类型安全柯里化 =====================
/**
 * 双参数柯里化（Curry）
 */
export function curry<A, B, R>(fn: (a: A, b: B) => R): (a: A) => (b: B) => R {
  return (a: A) => (b: B) => fn(a, b);
}

/**
 * 三参数柯里化（Curry）
 */
export function curry3<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R
): (a: A) => (b: B) => (c: C) => R {
  return (a: A) => (b: B) => (c: C) => fn(a, b, c);
}

// ===================== 类型增强 =====================
/**
 * 函数组合类型
 * 
 * @template F - 函数类型序列
 */
export type FunctionComposition<F extends AnyFunction[]> =
  F extends [(arg: infer T1) => infer R1, ...infer Rest]
  ? Rest extends AnyFunction[]
  ? (arg: T1) => FunctionComposition<Rest>
  : R1
  : never;

/**
 * 管道类型推断
 * 
 * @template T - 输入类型
 * @template F - 函数序列
 */
export type PipeType<T, F extends AnyFunction[]> =
  F extends []
  ? T
  : F extends [(arg: T) => infer R1, ...infer Rest]
  ? Rest extends AnyFunction[]
  ? PipeType<R1, Rest>
  : R1
  : never;
// rice/libs/_core/kernel/src/utils/functional.util.ts
/**
 * 函数式编程工具（严格模式兼容）
 */

// ===================== 核心类型定义 =====================
export type Predicate<T> = (value: T) => boolean;
export type Mapper<T, U> = (value: T) => U;
export type Reducer<T, U> = (acc: U, value: T) => U;

// 严格函数类型（禁止any）
type AnyFunction = (...args: never[]) => unknown;

// ===================== Result模式实现 =====================
/**
 * 结果封装类型（Either模式）
 * @template T - 成功值类型
 * @template E - 错误类型（默认Error）
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly value: T | E,
    private readonly isSuccess: boolean
  ) { }

  /**
   * 创建成功结果
   */
  static ok<T>(value: T): Result<T, Error> {
    return new Result<T, Error>(value, true);
  }

  /**
   * 创建失败结果
   */
  static fail<E extends Error>(error: E): Result<never, E> {
    return new Result<never, E>(error, false);
  }

  /**
   * 检查是否成功
   */
  get isOk(): boolean {
    return this.isSuccess;
  }

  /**
   * 获取值（成功时）
   * @throws 如果结果是失败
   */
  getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Cannot get value from failed result");
    }
    return this.value as T;
  }

  /**
   * 获取错误（失败时）
   * @throws 如果结果是成功
   */
  getError(): E {
    if (this.isSuccess) {
      throw new Error("Cannot get error from successful result");
    }
    return this.value as E;
  }

  /**
   * 模式匹配处理
   */
  match<U>(patterns: {
    ok: (value: T) => U;
    fail: (error: E) => U;
  }): U {
    return this.isSuccess
      ? patterns.ok(this.value as T)
      : patterns.fail(this.value as E);
  }
}

// ===================== 高级函数组合 =====================
/**
 * 安全管道函数（类型严格版）
 * @template T1 - 初始输入类型
 * @template T2 - 第一个函数输出类型
 */
export function pipe<T1, T2>(fn1: (arg: T1) => T2): (arg: T1) => T2;
/**
 * 三函数管道重载
 */
export function pipe<T1, R1>(fn1: (arg: T1) => R1): (arg: T1) => R1;
export function pipe<T1, R1, R2>(
  fn1: (arg: T1) => R1,
  fn2: (arg: R1) => R2
): (arg: T1) => R2;
export function pipe<T1, R1, R2, R3>(
  fn1: (arg: T1) => R1,
  fn2: (arg: R1) => R2,
  fn3: (arg: R2) => R3
): (arg: T1) => R3;
export function pipe(...fns: AnyFunction[]): AnyFunction {
  return (input: unknown) => {
    let result = input;
    for (const fn of fns) {
      result = fn(result as never);
    }
    return result;
  };
}

/**
 * 异步管道（支持Promise）
 */
export function asyncPipe<T1, R1>(
  fn1: (arg: T1) => Promise<R1>
): (arg: T1) => Promise<R1>;
export function asyncPipe<T1, R1, R2>(
  fn1: (arg: T1) => Promise<R1>,
  fn2: (arg: R1) => Promise<R2>
): (arg: T1) => Promise<R2>;
export function asyncPipe<T1, R1, R2, R3>(
  fn1: (arg: T1) => Promise<R1>,
  fn2: (arg: R1) => Promise<R2>,
  fn3: (arg: R2) => Promise<R3>
): (arg: T1) => Promise<R3>;
export function asyncPipe(...fns: AnyFunction[]): AnyFunction {
  return async (input: unknown) => {
    let result = input;
    for (const fn of fns) {
      result = await fn(result as never);
    }
    return result;
  };
}

// ===================== 柯里化工具 =====================
/**
 * 严格类型柯里化函数
 */
export function curry<T1, T2, TResult>(
  fn: (a: T1, b: T2) => TResult
): (a: T1) => (b: T2) => TResult {
  return (a: T1) => (b: T2) => fn(a, b);
}

/**
 * 异步函数柯里化
 */
export function asyncCurry<T1, T2, TResult>(
  fn: (a: T1, b: T2) => Promise<TResult>
): (a: T1) => (b: T2) => Promise<TResult> {
  return (a: T1) => async (b: T2) => await fn(a, b);
}
/**
 * 表示操作可能成功或失败的通用结果类型
 * 
 * @template T - 成功结果的数据类型
 * @template E - 错误类型（默认为Error）
 */
type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * 表示操作成功的具体类型
 * 
 * @template T - 成功结果的数据类型
 */
class Ok<T> {
  readonly kind = 'success' as const;

  constructor(readonly value: T) { }

  /**
   * 类型保护 - 检查是否为成功结果
   */
  isOk(): this is Ok<T> {
    return true;
  }
  /**
 * 解包成功值（安全方法）
 */
  unwrap(): T {
    return this.value;
  }

  /**
   * 解包错误（在成功情况下抛出错误）
   */
  unwrapErr(): never {
    throw new Error("Called unwrapErr on Ok");
  }
}

/**
 * 表示操作失败的具体类型
 * 
 * @template E - 错误类型
 */
class Err<E> {
  readonly kind = 'error' as const;

  constructor(readonly error: E) { }

  /**
   * 类型保护 - 检查是否为失败结果
   */
  isOk(): this is never {
    return false;
  }
  /**
  * 解包成功值（在错误情况下抛出错误）
  */
  unwrap(): never {
    throw this.error;
  }

  /**
   * 解包错误值（安全方法）
   */
  unwrapErr(): E {
    return this.error;
  }
}

/**
 * 创建成功结果
 * 
 * @param value - 成功时的返回值
 * @returns 封装成功结果的对象
 */
function ok<T>(value: T): Result<T, never> {
  return new Ok(value);
}

/**
 * 创建失败结果
 * 
 * @param error - 错误信息
 * @returns 封装错误结果的对象
 */
function err<E>(error: E): Result<never, E> {
  return new Err(error);
}

/**
 * 从Result类型中提取成功值的类型
 * 
 * @template R - Result类型
 */
type UnwrapResult<R> = R extends Result<infer T, unknown> ? T : never;

/**
 * 从Result类型中提取错误值的类型
 * 
 * @template R - Result类型
 */
type UnwrapError<R> = R extends Result<unknown, infer E> ? E : never;

export { Ok, Err, ok, err };
export type { Result, UnwrapResult, UnwrapError };

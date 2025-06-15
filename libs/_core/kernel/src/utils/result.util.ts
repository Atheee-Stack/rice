// rice/libs/_core/kernel/src/utils/result.util.ts

/**
 * 表示操作可能成功或失败的通用结果类型
 * 
 * @template T - 成功结果的数据类型
 * @template E - 错误类型（默认为Error）
 */
type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

/**
 * 表示操作成功的具体类型
 */
class Ok<T, E> {
  readonly kind = 'success' as const;

  constructor(readonly value: T) { }

  /**
   * 类型保护 - 检查是否为成功结果
   */
  isOk(): this is Ok<T, E> {
    return true;
  }

  /**
   * 检查是否为失败结果
   */
  isFail(): this is never {
    return false;
  }

  /**
   * 解包成功值
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * 解包错误
   */
  unwrapErr(): never {
    throw new Error("Called unwrapErr on Ok");
  }

  /**
  * 转换成功值
  */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value));
  }

  /**
   * 链式操作
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }
}

/**
 * 表示操作失败的具体类型
 */
class Err<T, E> {
  readonly kind = 'error' as const;

  constructor(readonly error: E) { }

  /**
   * 类型保护 - 检查是否为成功结果
   */
  isOk(): this is never {
    return false;
  }

  /**
   * 检查是否为失败结果
   */
  isFail(): this is Err<T, E> {
    return true;
  }

  /**
   * 解包成功值
   */
  unwrap(): never {
    throw this.error;
  }

  /**
   * 解包错误值
   */
  unwrapErr(): E {
    return this.error;
  }

  /**
   * 转换值（在错误情况下无操作）
   */
  map<U>(): Err<U, E> {
    return this as unknown as Err<U, E>;
  }

  /**
   * 链式操作（错误情况）
   */
  flatMap<U>(): Err<U, E> {
    return this as unknown as Err<U, E>;
  }
}

/**
 * 创建成功结果
 */
function ok<T, E = never>(value: T): Result<T, E> {
  return new Ok(value);
}

/**
 * 创建失败结果
 */
function err<T, E>(error: E): Result<T, E> {
  return new Err(error);
}

/**
 * 创建失败结果（err的别名）
 */
function fail<T, E>(error: E): Result<T, E> {
  return new Err(error);
}

// ===================== 结果操作方法 =====================

/**
 * 结果处理工具方法
 */
const ResultMethods = {
  /**
   * 映射结果值
   */
  map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    return result.isOk() ? ok(fn(result.value)) : fail(result.error);
  },

  /**
   * 映射错误值
   */
  mapError<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    return result.isFail() ? fail(fn(result.error)) : ok(result.value as T);
  },

  /**
   * 链式操作（扁平映射）
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    return result.isOk() ? fn(result.value) : fail(result.error);
  },

  /**
   * 扁平嵌套结果
   */
  flatten<T, E>(
    result: Result<Result<T, E>, E>
  ): Result<T, E> {
    if (result.isFail()) {
      return fail(result.error);
    }
    return result.value;
  },

  /**
   * 结果转换
   */
  transform<T, U, E, F>(
    result: Result<T, E>,
    successFn: (value: T) => U,
    errorFn: (error: E) => F
  ): Result<U, F> {
    return result.isOk()
      ? ok(successFn(result.value))
      : fail(errorFn(result.error));
  },

  /**
   * 尝试执行函数并捕获错误
   */
  tryCatch<T>(
    fn: () => T
  ): Result<T, Error> {
    try {
      return ok(fn());
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return fail(err);
    }
  },

  /**
   * 尝试异步执行函数并捕获错误
   */
  async tryCatchAsync<T>(
    fn: () => Promise<T>
  ): Promise<Result<T, Error>> {
    try {
      const value = await fn();
      return ok(value);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return fail(err);
    }
  }
};

// ===================== 类型工具 =====================

/**
 * 从Result类型中提取成功值的类型
 */
type UnwrapResult<R> = R extends Result<infer T, unknown> ? T : never;

/**
 * 从Result类型中提取错误值的类型
 */
type UnwrapError<R> = R extends Result<unknown, infer E> ? E : never;

/**
 * 从Result类型中提取完整类型信息
 */
type UnwrapFullResult<R> =
  R extends Result<infer T, infer E>
  ? { success: T; error: E }
  : never;

/**
 * 安全解包结果值
 * 
 * @template T - 成功值的类型
 * @template E - 错误类型
 * @param result - 结果对象
 * @param defaultValue - 错误时返回的默认值
 * @returns 解包后的值或默认值
 */
function unwrapOrDefault<T, E>(
  result: Result<T, E>,
  defaultValue: T
): T {
  return result.isOk() ? result.unwrap() : defaultValue;
}

// 导出所有内容
export { Ok, Err, ok, err, fail, ResultMethods, unwrapOrDefault };
export type { Result, UnwrapResult, UnwrapError, UnwrapFullResult };
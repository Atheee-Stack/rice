import {
  ok,
  err,
  fail,
  ResultMethods,
  unwrapOrDefault
} from '../result.util';
import type { Result } from '../result.util';

// ===================== 测试工厂函数 =====================
test('ok() 创建成功结果', () => {
  const result = ok(42);
  expect(result.kind).toBe('success');
  expect(result.isOk()).toBe(true);
  expect(result.unwrap()).toBe(42);
});

test('err() 创建失败结果', () => {
  const result = err('Error!');
  expect(result.kind).toBe('error');
  expect(result.isFail()).toBe(true);
  expect(() => result.unwrap()).toThrow('Error!');
});

test('fail() 是 err() 的别名', () => {
  const result1 = err('Error');
  const result2 = fail('Error');
  expect(result2.kind).toBe('error');
  expect(result2).toEqual(result1);
});

// ===================== 测试 Ok 实例方法 =====================
describe('Ok 实例方法', () => {
  const success = ok(10);

  test('isOk() 返回 true', () => {
    expect(success.isOk()).toBe(true);
  });

  test('isFail() 返回 false', () => {
    expect(success.isFail()).toBe(false);
  });

  test('unwrap() 返回包装值', () => {
    expect(success.unwrap()).toBe(10);
  });

  test('unwrapErr() 抛出错误', () => {
    expect(() => success.unwrapErr()).toThrow("Called unwrapErr on Ok");
  });

  test('map() 转换值', () => {
    const doubled = success.map(v => v * 2);
    expect(doubled.unwrap()).toBe(20);
  });

  test('flatMap() 链式操作', () => {
    const chainResult = success.flatMap(v => ok(v.toString()));
    expect(chainResult.unwrap()).toBe('10');
  });
});

// ===================== 测试 Err 实例方法 =====================
describe('Err 实例方法', () => {
  // 修复类型声明 - 明确指定Result类型参数
  const error: Result<number, string> = err('Failed!');

  test('isOk() 返回 false', () => {
    expect(error.isOk()).toBe(false);
  });

  test('isFail() 返回 true', () => {
    expect(error.isFail()).toBe(true);
  });

  test('unwrap() 抛出错误', () => {
    expect(() => error.unwrap()).toThrow('Failed!');
  });

  test('unwrapErr() 返回错误', () => {
    expect(error.unwrapErr()).toBe('Failed!');
  });

  test('map() 保留错误', () => {
    const mapped = error.map(v => v * 2);
    expect(mapped.unwrapErr()).toBe('Failed!');
  });

  test('flatMap() 保留错误', () => {
    const chainResult = error.flatMap(() => ok('Should not happen'));
    expect(chainResult.unwrapErr()).toBe('Failed!');
  });
});

// ===================== 测试 ResultMethods =====================
describe('ResultMethods', () => {
  const success = ok(5);
  // 修复类型声明 - 明确指定Result类型参数
  const failure: Result<number, string> = err('Error');

  test('map() 转换成功值', () => {
    const mapped = ResultMethods.map(success, v => v + 1);
    expect(mapped.unwrap()).toBe(6);
  });

  test('map() 保留失败状态', () => {
    const mapped = ResultMethods.map(failure, v => v + 1);
    expect(mapped.unwrapErr()).toBe('Error');
  });

  test('mapError() 转换错误', () => {
    const mappedError = ResultMethods.mapError(failure, e => `Mapped: ${e}`);
    expect(mappedError.unwrapErr()).toBe('Mapped: Error');
  });

  test('mapError() 保留成功状态', () => {
    const mapped = ResultMethods.mapError(success, e => `Mapped: ${e}`);
    expect(mapped.unwrap()).toBe(5);
  });

  test('flatMap() 链式成功操作', () => {
    const chained = ResultMethods.flatMap(success, v => ok(v * 2));
    expect(chained.unwrap()).toBe(10);
  });

  test('flatMap() 保留失败状态', () => {
    const chained = ResultMethods.flatMap(failure, () => ok('Success'));
    expect(chained.unwrapErr()).toBe('Error');
  });

  test('flatten() 展开嵌套结果', () => {
    const nestedSuccess = ok(ok(42));
    const flattened = ResultMethods.flatten(nestedSuccess);
    expect(flattened.unwrap()).toBe(42);

    const nestedError = ok(err('Nested error'));
    const flattenedError = ResultMethods.flatten(nestedError);
    expect(flattenedError.unwrapErr()).toBe('Nested error');

    const topLevelError: Result<Result<number, string>, string> = err('Top error');
    const flattenedTopError = ResultMethods.flatten(topLevelError);
    expect(flattenedTopError.unwrapErr()).toBe('Top error');
  });

  test('transform() 成功转换', () => {
    const transformed = ResultMethods.transform(
      success,
      v => `Value: ${v}`,
      // 添加下划线前缀表示未使用参数
      () => 'Error: fallback'
    );
    expect(transformed.unwrap()).toBe('Value: 5');
  });

  test('transform() 失败转换', () => {
    const transformed = ResultMethods.transform(
      failure,
      // 添加下划线前缀表示未使用参数
      () => 'Value: fallback',
      e => `Error: ${e}`
    );
    expect(transformed.unwrapErr()).toBe('Error: Error');
  });

  test('tryCatch() 捕获同步错误', () => {
    const safeResult = ResultMethods.tryCatch(() => {
      throw new Error('Boom!');
    });
    expect(safeResult.isFail()).toBe(true);
    expect(safeResult.unwrapErr()).toBeInstanceOf(Error);
    expect(safeResult.unwrapErr().message).toBe('Boom!');
  });

  test('tryCatch() 返回成功结果', () => {
    const safeResult = ResultMethods.tryCatch(() => 'Success');
    expect(safeResult.unwrap()).toBe('Success');
  });

  test('tryCatchAsync() 捕获异步错误', async () => {
    const asyncResult = await ResultMethods.tryCatchAsync(async () => {
      throw new Error('Async boom!');
    });
    expect(asyncResult.isFail()).toBe(true);
    expect(asyncResult.unwrapErr().message).toBe('Async boom!');
  });

  test('tryCatchAsync() 返回异步成功结果', async () => {
    const asyncResult = await ResultMethods.tryCatchAsync(async () => {
      return 'Async success';
    });
    expect(asyncResult.unwrap()).toBe('Async success');
  });
});

// ===================== 测试工具函数 =====================
test('unwrapOrDefault() 返回成功值', () => {
  const result = ok(100);
  expect(unwrapOrDefault(result, 0)).toBe(100);
});

test('unwrapOrDefault() 返回默认值', () => {
  // 修复类型声明 - 明确指定Result类型
  const result: Result<number, string> = err('Error');
  expect(unwrapOrDefault(result, 0)).toBe(0);
});

// ===================== 类型安全测试 =====================
test('类型保护正常工作', () => {
  const processResult = (result: Result<number, string>) => {
    if (result.isOk()) {
      // 在此分支中 TypeScript 应该知道 value 存在
      return `Value: ${result.value}`;
    } else {
      // 在此分支中 TypeScript 应该知道 error 存在
      return `Error: ${result.error}`;
    }
  };

  expect(processResult(ok(42))).toBe('Value: 42');
  expect(processResult(err('Fail'))).toBe('Error: Fail');
});

// ===================== 边缘案例测试 =====================
test('包装undefined和null值', () => {
  const undefResult = ok(undefined);
  expect(undefResult.unwrap()).toBeUndefined();

  const nullResult = ok(null);
  expect(nullResult.unwrap()).toBeNull();
});

test('错误类型可以是任意值', () => {
  // 修复类型声明 - 明确指定类型参数
  const numberError: Result<number, number> = err(404);
  expect(numberError.unwrapErr()).toBe(404);

  const objectError: Result<number, { code: number }> = err({ code: 500 });
  expect(objectError.unwrapErr()).toEqual({ code: 500 });
});
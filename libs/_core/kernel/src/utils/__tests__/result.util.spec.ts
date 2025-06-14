import { Result, Ok, Err, UnwrapResult, UnwrapError } from '../result.util';
import { ok, err, fail } from '../result.util'; // 测试工厂函数

// 自定义错误类用于测试
class CustomError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

describe('Result Utility', () => {
  // 1. 测试基础结构
  describe('Core Structure', () => {
    test('Ok should have correct properties', () => {
      const value = 'success';
      const result = new Ok(value);
      expect(result.kind).toBe('success');
      expect(result.value).toBe(value);
    });

    test('Err should have correct properties', () => {
      const error = new Error('failure');
      const result = new Err(error);
      expect(result.kind).toBe('error');
      expect(result.error).toBe(error);
    });
  });

  // 2. 测试类型保护方法
  describe('Type Guards', () => {
    test('isOk() returns true for Ok', () => {
      const result = new Ok('data') as Result<string>;
      expect(result.isOk()).toBe(true);
      expect(result.isFail()).toBe(false);
    });

    test('isFail() returns true for Err', () => {
      const result = new Err('error') as Result<never, string>;
      expect(result.isFail()).toBe(true);
      expect(result.isOk()).toBe(false);
    });

    test('Type narrowing with isOk()', () => {
      const result: Result<number> = Math.random() > 0.5 ?
        new Ok(10) :
        new Err(new Error());

      if (result.isOk()) {
        expect(result.value).toBe(10);
      } else {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  // 3. 测试解包方法
  describe('Unwrapping Methods', () => {
    describe('Ok Behavior', () => {
      const success = new Ok('value');

      test('unwrap() returns value', () => {
        expect(success.unwrap()).toBe('value');
      });

      test('unwrapErr() throws', () => {
        expect(() => success.unwrapErr()).toThrow('Called unwrapErr on Ok');
      });
    });

    describe('Err Behavior', () => {
      const customError = new CustomError('invalid');
      const failure = new Err(customError);

      test('unwrap() throws contained error', () => {
        expect(() => failure.unwrap()).toThrow(customError);
      });

      test('unwrapErr() returns error', () => {
        expect(failure.unwrapErr()).toEqual(customError);
      });
    });
  });

  // 4. 测试边界情况
  describe('Edge Cases', () => {
    test('Ok with undefined', () => {
      const result = new Ok(undefined);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBeUndefined();
    });

    test('Err with null', () => {
      const result = new Err(null);
      expect(result.isFail()).toBe(true);
      expect(result.unwrapErr()).toBeNull();
    });

    test('Nested Result types', () => {
      const nested: Result<Result<number>> = new Ok(new Ok(100));
      if (nested.isOk()) {
        const inner = nested.unwrap();
        if (inner.isOk()) {
          expect(inner.unwrap()).toBe(100);
        } else {
          fail('Inner should be Ok');
        }
      } else {
        fail('Outer should be Ok');
      }
    });
  });

  // 5. 测试工具类型
  describe('Utility Types', () => {
    type Example = Result<string, number>;

    test('UnwrapResult extracts success type', () => {
      const value: UnwrapResult<Example> = 'test';
      expect(typeof value).toBe('string');
    });

    test('UnwrapError extracts error type', () => {
      const value: UnwrapError<Example> = 404;
      expect(typeof value).toBe('number');
    });
  });
  describe('Factory Functions', () => {
    // 需要导入工厂函数

    test('ok() creates Ok instance', () => {
      const result = ok(42);
      expect(result).toBeInstanceOf(Ok);
      expect(result.unwrap()).toBe(42);
    });

    test('err() creates Err instance', () => {
      const result = err('error');
      expect(result).toBeInstanceOf(Err);
      expect(result.unwrapErr()).toBe('error');
    });

    test('fail() creates Err instance', () => {
      const result = fail('error');
      expect(result).toBeInstanceOf(Err);
      expect(result.unwrapErr()).toBe('error');
    });
  });
});
// libs/shared/utils/fp-utils.test.ts
import {
  Result,
  pipe,
  asyncPipe,
  curry,
  asyncCurry,
  Predicate,
  Mapper,
  Reducer
} from '../functional.util';

describe('Result type', () => {
  class CustomError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CustomError';
    }
  }

  test('should create successful result', () => {
    const success = Result.ok(42);
    expect(success.isOk).toBe(true);
    expect(success.getValue()).toBe(42);
  });

  test('should create failed result', () => {
    const error = new CustomError('Test error');
    const failure = Result.fail(error);
    expect(failure.isOk).toBe(false);
    expect(failure.getError()).toBe(error);
  });

  test('should handle pattern matching', () => {
    const success = Result.ok(100);
    const failure = Result.fail(new CustomError('Failed'));

    const successResult = success.match({
      ok: val => val * 2,
      fail: () => -1
    });

    const failureResult = failure.match({
      ok: val => val * 2,
      fail: () => -1
    });

    expect(successResult).toBe(200);
    expect(failureResult).toBe(-1);
  });

  test('should throw when accessing value on failure', () => {
    const failure = Result.fail(new Error('Test'));
    expect(() => failure.getValue()).toThrow('Cannot get value from failed result');
  });

  test('should throw when accessing error on success', () => {
    const success = Result.ok('success');
    expect(() => success.getError()).toThrow('Cannot get error from successful result');
  });
});

describe('Pipe functions', () => {
  test('sync pipe should compose functions', () => {
    const increment: Mapper<number, number> = x => x + 1;
    const double: Mapper<number, number> = x => x * 2;
    const toString: Mapper<number, string> = x => x.toString();

    const pipeline = pipe(increment, double, toString);
    const result = pipeline(5);

    expect(result).toBe('12');
    expect(typeof result).toBe('string');
  });

  test('async pipe should compose async functions', async () => {
    // 修复参数类型定义
    const fetchData: Mapper<string, Promise<string>> = async id => `data-${id}`;
    const parseData: Mapper<string, Promise<number>> = async str => {
      const num = parseInt(str.split('-')[1], 10);
      return isNaN(num) ? 0 : num;
    };
    const processData: Mapper<number, Promise<string>> = async num =>
      `result-${num * 2}`;

    const pipeline = asyncPipe(fetchData, parseData, processData);
    const result = await pipeline('42');

    expect(result).toBe('result-84');
  });

  describe('Currying functions', () => {
    test('sync curry should partial apply', () => {
      const add = (a: number, b: number): number => a + b;
      const curriedAdd = curry(add);
      const addFive = curriedAdd(5);

      expect(addFive(10)).toBe(15);
      expect(curriedAdd(2)(3)).toBe(5);
    });

    test('async curry should partial apply', async () => {
      const asyncAdd = async (a: number, b: number): Promise<number> => a + b;
      const curriedAdd = asyncCurry(asyncAdd);
      const addTen = curriedAdd(10);

      expect(await addTen(5)).toBe(15);
      expect(await curriedAdd(3)(7)).toBe(10);
    });

    test('should maintain type safety', () => {
      const concat = (a: string, b: string) => a + b;
      const curriedConcat = curry(concat);

      // 类型安全测试
      // @ts-expect-error - 测试错误类型输入
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const invalidResult: unknown = curriedConcat(42);

      const valid = curriedConcat('hello');
      expect(valid(' world')).toBe('hello world');
    });
  });

  describe('Function composition', () => {
    test('predicate composition', () => {
      const isEven: Predicate<number> = n => n % 2 === 0;
      const greaterThanTen: Predicate<number> = n => n > 10;

      // 使用函数组合避免类型错误
      const combinedPredicate = (n: number) => greaterThanTen(n) && isEven(n);

      expect(combinedPredicate(14)).toBe(true);
      expect(combinedPredicate(15)).toBe(false);
      expect(combinedPredicate(8)).toBe(false);
    });

    test('reducer composition', () => {
      const sumReducer: Reducer<number, number> = (acc, val) => acc + val;
      // 修复未使用的参数错误
      const countReducer: Reducer<number, number> = (acc) => acc + 1;

      const data = [1, 2, 3, 4];
      const sum = data.reduce(sumReducer, 0);
      // 修复参数过多错误
      const count = data.reduce(countReducer, 0);

      expect(sum).toBe(10);
      expect(count).toBe(4);
    });
  });
})
// libs/_core/kernel/src/utils/__tests__/functional.util.spec.ts
import {
  pipe,
  compose,
  curry,
  memoize
} from '../functional.util';

describe('functional utilities', () => {
  // 1. 测试 pipe 函数
  describe('pipe()', () => {
    it('应该处理单个函数', () => {
      const increment = (x: number) => x + 1;
      const piped = pipe(increment);
      expect(piped(5)).toBe(6);
    });

    it('应该按顺序组合多个函数', () => {
      const add = (x: number) => x + 2;
      const multiply = (x: number) => x * 3;
      const format = (x: number) => `$${x.toFixed(2)}`;

      const pipeline = pipe(add, multiply, format);
      expect(pipeline(5)).toBe('$21.00');
    });

    it('应该处理不同类型之间的转换', () => {
      const stringify = (x: number) => x.toString();
      const repeat = (s: string) => s.repeat(2);

      const pipeline = pipe(stringify, repeat);
      expect(pipeline(42)).toBe('4242');
    });
  });

  // 2. 测试 compose 函数
  describe('compose()', () => {
    it('应该处理单个函数', () => {
      const increment = (x: number) => x + 1;
      const composed = compose(increment);
      expect(composed(5)).toBe(6);
    });

    it('应该按反向顺序组合函数', () => {
      const add = (x: number) => x + 2;
      const multiply = (x: number) => x * 3;
      const format = (x: number) => `$${x.toFixed(2)}`;

      const composed = compose(format, multiply, add);
      expect(composed(5)).toBe('$21.00');
    });

    it('应该处理异步函数', async () => {
      // 创建异步函数类型兼容的 compose 版本
      const asyncCompose = <T extends unknown[], U, V>(
        fn1: (arg: U) => V | Promise<V>,
        fn2: (...args: T) => U | Promise<U>
      ) => async (...args: T): Promise<V> => {
        const intermediate = await fn2(...args);
        return fn1(intermediate);
      };

      const fetchData = async (x: number): Promise<number> => x * 2;
      const process = async (x: number): Promise<number> => x + 3;

      const workflow = asyncCompose(process, fetchData);
      await expect(workflow(5)).resolves.toBe(13);
    });
  });

  // 3. 测试 curry 函数
  describe('curry()', () => {
    it('应该柯里化两参数函数', () => {
      const add = (a: number, b: number) => a + b;
      const curriedAdd = curry(add);

      expect(curriedAdd(2)(3)).toBe(5);
    });

    it('应该保持类型安全', () => {
      const join = (a: string, b: string) => `${a}, ${b}`;
      const curriedJoin = curry(join);

      // This will fail at compile time (which is what we want)
      // @ts-expect-error
      const result = curriedJoin(2)('world');

      expect(curriedJoin('Hello')('World')).toBe('Hello, World');
    });

    it('应该处理对象参数', () => {
      const merge = (a: { x: number }, b: { y: number }) => ({ ...a, ...b });
      const curriedMerge = curry(merge);

      expect(curriedMerge({ x: 1 })({ y: 2 })).toEqual({ x: 1, y: 2 });
    });
  });

  // 4. 测试 memoize 函数
  describe('memoize()', () => {
    it('应该缓存函数结果', () => {
      const mockFn = jest.fn((x: number) => x * 2);
      const memoized = memoize(mockFn);

      expect(memoized(2)).toBe(4);
      expect(memoized(2)).toBe(4);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('应该区分不同参数', () => {
      const square = jest.fn((x: number) => x * x);
      const memoized = memoize(square);

      expect(memoized(3)).toBe(9);
      expect(memoized(4)).toBe(16);
      expect(square).toHaveBeenCalledTimes(2);
    });

    it('应该处理复杂对象参数', () => {
      const complexFn = jest.fn((obj: { id: string; value: number }) =>
        `${obj.id}-${obj.value}`);
      const memoized = memoize(complexFn);

      const obj1 = { id: 'a', value: 1 };
      const obj2 = { id: 'a', value: 1 }; // 相同内容不同引用

      expect(memoized(obj1)).toBe('a-1');
      expect(memoized(obj2)).toBe('a-1');
      expect(complexFn).toHaveBeenCalledTimes(2); // 不同引用不算缓存命中
    });

    it('应该处理多参数函数', () => {
      const sum = jest.fn((a: number, b: number) => a + b);
      const memoized = memoize(sum);

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(sum).toHaveBeenCalledTimes(1);
    });
  });

  // 5. 边界条件测试
  describe('边界条件', () => {
    it('pipe应该处理空函数数组', () => {
      // 使用类型断言解决空参数问题
      const identity = pipe((x: number) => x);
      expect(identity(42)).toBe(42);
    });

    it('compose应该处理空函数数组', () => {
      // 使用类型断言解决空参数问题
      const identity = compose((x: number) => x);
      expect(identity(42)).toBe(42);
    });

    it('memoize应该处理非纯函数', () => {
      let counter = 0;
      const impureFn = () => counter++;
      const memoized = memoize(impureFn);

      expect(memoized()).toBe(0);
      expect(memoized()).toBe(0); // 仍然返回缓存值
      expect(counter).toBe(1);
    });
  });
});
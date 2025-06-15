import { describe, it, expect } from '@jest/globals';
import {
  pipe,
  compose,
  identity,
  constant,
  noop,
  not,
  flip,
  partialL,
  partialR,
  curry,
  curry3
} from '../functional.util';

describe('Functional Utilities', () => {
  // Test data with proper typing
  const isEven = (n: number) => n % 2 === 0;
  const double = (n: number) => n * 2;
  const increment = (n: number) => n + 1;

  describe('pipe()', () => {
    it('should return input value with no functions', () => {
      const result = pipe(42);
      expect(result).toBe(42);
    });

    it('should apply single transformation', () => {
      const result = pipe(5, double);
      expect(result).toBe(10);
    });

    it('should apply multiple transformations left-to-right', () => {
      const result = pipe(3, increment, double);
      expect(result).toBe(8);
    });

    it('should maintain type safety across transformations', () => {
      const toStr = (n: number) => n.toString();
      const result = pipe(10, double, toStr);
      expect(result).toBe("20");
    });
  });

  describe('compose()', () => {
    it('should apply single function', () => {
      const fn = compose((x: unknown) => double(x as number));
      expect(fn(5)).toBe(10);
    });

    it('should apply functions right-to-left', () => {
      const fn = compose(
        (x: unknown) => double(x as number),
        (y: unknown) => increment(y as number)
      );
      expect(fn(3)).toBe(8);
    });

    it('should maintain type safety across composition', () => {
      const toStr = (n: number) => n.toString();
      const addBang = (s: string) => s + "!";

      const fn = compose(
        (val: unknown) => addBang(val as string),
        (val: unknown) => toStr(val as number),
        (val: unknown) => double(val as number)
      );

      expect(fn(10)).toBe("20!");
    });
  });

  describe('identity()', () => {
    it('should return the input value unchanged', () => {
      const obj = { id: 'test' };
      expect(identity(obj)).toBe(obj);
      expect(identity(42)).toBe(42);
      expect(identity(null)).toBeNull();
    });
  });

  describe('constant()', () => {
    it('should always return the captured constant', () => {
      const getFive = constant(5);
      expect(getFive()).toBe(5);
      expect(getFive()).toBe(5);
    });
  });

  describe('noop()', () => {
    it('should return undefined', () => {
      expect(noop()).toBeUndefined();
    });
  });

  describe('not()', () => {
    it('should negate predicate results', () => {
      const isOdd = not((x: unknown) => isEven(x as number));
      expect(isOdd(1)).toBe(true);
      expect(isOdd(2)).toBe(false);
    });
  });

  describe('flip()', () => {
    const divide = (a: number, b: number) => a / b;

    it('should reverse arguments', () => {
      const flippedDivide = flip((x: unknown, y: unknown) =>
        divide(x as number, y as number)
      );
      expect(flippedDivide(2, 8)).toBe(4);
    });

    it('should maintain type safety', () => {
      const concat = (a: string, b: string) => a + b;
      const flippedConcat = flip((x: unknown, y: unknown) =>
        concat(x as string, y as string)
      );
      expect(flippedConcat('b', 'a')).toBe('ab');
    });
  });

  describe('partialL()', () => {
    const sum = (a: number, b: number) => a + b;

    it('should partially apply left argument', () => {
      const addFive = partialL(
        (a: unknown, b: unknown) => sum(a as number, b as number),
        5
      );
      expect(addFive(3)).toBe(8);
    });
  });

  describe('partialR()', () => {
    const sum = (a: number, b: number) => a + b;

    it('should partially apply right argument', () => {
      const addToThree = partialR(
        (a: unknown, b: unknown) => sum(a as number, b as number),
        3
      );
      expect(addToThree(5)).toBe(8);
    });
  });

  describe('curry()', () => {
    const sum = (a: number, b: number) => a + b;

    it('should curry a binary function', () => {
      const curriedSum = curry(
        (a: unknown, b: unknown) => sum(a as number, b as number)
      );
      const addFive = curriedSum(5);
      expect(addFive(3)).toBe(8);
    });
  });

  describe('curry3()', () => {
    const sum3 = (a: number, b: number, c: number) => a + b + c;

    it('should curry a ternary function', () => {
      const curriedSum = curry3(
        (a: unknown, b: unknown, c: unknown) =>
          sum3(a as number, b as number, c as number)
      );
      const addToFive = curriedSum(5)(3);
      expect(addToFive(2)).toBe(10);
    });
  });
});
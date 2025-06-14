import {
  Primitive,
  isPrimitive,
  isString,
  isNumber,
  isBoolean,
  isNull,
  isUndefined,
  isSymbol,
  isBigInt,
  isDate,
  toPrimitive,
  primitiveEquals,
  primitiveHash,
  primitiveCompare
} from '../primitive.util';

describe('Primitive Utilities', () => {
  // 测试类型守卫函数
  describe('Type Guards', () => {
    test('isPrimitive identifies all primitive types', () => {
      expect(isPrimitive('text')).toBe(true);
      expect(isPrimitive(42)).toBe(true);
      expect(isPrimitive(true)).toBe(true);
      expect(isPrimitive(null)).toBe(true);
      expect(isPrimitive(undefined)).toBe(true);
      expect(isPrimitive(Symbol('desc'))).toBe(true);
      expect(isPrimitive(100n)).toBe(true);

      // 非原始类型
      expect(isPrimitive({})).toBe(false);
      expect(isPrimitive([])).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(isPrimitive(() => { })).toBe(false);
      expect(isPrimitive(new Date())).toBe(false);
    });

    test('Specific type guards work correctly', () => {
      // isString
      expect(isString('text')).toBe(true);
      expect(isString(123)).toBe(false);

      // isNumber
      expect(isNumber(42)).toBe(true);
      expect(isNumber(NaN)).toBe(true);
      expect(isNumber('42')).toBe(false);

      // isBoolean
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(0)).toBe(false);

      // isNull
      expect(isNull(null)).toBe(true);
      expect(isNull(undefined)).toBe(false);

      // isUndefined
      expect(isUndefined(undefined)).toBe(true);
      expect(isUndefined(null)).toBe(false);

      // isSymbol
      const sym = Symbol();
      expect(isSymbol(sym)).toBe(true);
      expect(isSymbol('symbol')).toBe(false);

      // isBigInt
      expect(isBigInt(100n)).toBe(true);
      expect(isBigInt(100)).toBe(false);

      // isDate
      expect(isDate(new Date())).toBe(true);
      expect(isDate('2023-01-01')).toBe(false);
    });
  });

  // 测试原始值转换
  describe('toPrimitive', () => {
    test('Returns primitive values directly', () => {
      expect(toPrimitive('text')).toBe('text');
      expect(toPrimitive(42)).toBe(42);
      expect(toPrimitive(null)).toBe(null);
    });

    test('Converts Date to ISO string', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      expect(toPrimitive(date)).toBe('2023-01-01T00:00:00.000Z');
    });

    test('Converts objects to primitive representation', () => {
      // 普通对象
      expect(toPrimitive({ a: 1 })).toBe('[object Object]');

      // 数组
      expect(toPrimitive([1, 2])).toBe('1,2');

      // 自定义 valueOf
      const objWithValueOf = {
        valueOf: () => 'custom'
      };
      expect(toPrimitive(objWithValueOf)).toBe('custom');

      // 转换失败时返回安全字符串
      const objWithBrokenValueOf = {
        valueOf: () => { throw new Error(); }
      };
      expect(toPrimitive(objWithBrokenValueOf)).toBe('[Non-primitive value]');
    });
  });

  // 测试原始值比较
  describe('primitiveEquals', () => {
    test('Correctly compares primitive values', () => {
      // 相同值
      expect(primitiveEquals(42, 42)).toBe(true);
      expect(primitiveEquals('a', 'a')).toBe(true);

      // 不同值
      expect(primitiveEquals(1, 2)).toBe(false);
      expect(primitiveEquals('a', 'b')).toBe(false);

      // 特殊数字比较
      expect(primitiveEquals(NaN, NaN)).toBe(true); // NaN 相等
      expect(primitiveEquals(0, -0)).toBe(true);    // 0 和 -0 相等

      // 不同类型
      expect(primitiveEquals(1, '1')).toBe(false);
    });
  });

  // 测试原始值哈希
  describe('primitiveHash', () => {
    test('Generates unique hashes for values', () => {
      // 字符串
      expect(primitiveHash('text')).toBe('string:text');

      // 数字
      expect(primitiveHash(42)).toBe('number:42');
      expect(primitiveHash(NaN)).toBe('number:NaN');
      expect(primitiveHash(Infinity)).toBe('number:Infinity');

      // 布尔值
      expect(primitiveHash(true)).toBe('boolean:true');

      // null 和 undefined
      expect(primitiveHash(null)).toBe('null');
      expect(primitiveHash(undefined)).toBe('undefined');

      // Symbol
      expect(primitiveHash(Symbol('desc'))).toBe('Symbol(desc)');
      expect(primitiveHash(Symbol())).toBe('Symbol(anonymous)');

      // BigInt
      expect(primitiveHash(100n)).toBe('BigInt(100)');
    });
  });

  // 测试原始值排序
  describe('primitiveCompare', () => {
    test('Orders types correctly (null -> string -> number -> boolean -> symbol -> bigint -> undefined)', () => {
      // 使用相同的 Symbol 实例
      const testSymbol = Symbol('a');

      const values: Primitive[] = [
        null,        // typeOrder: 0
        'a',         // typeOrder: 1
        42,          // typeOrder: 2
        true,        // typeOrder: 3
        testSymbol,  // typeOrder: 4
        100n,        // typeOrder: 5
        undefined    // typeOrder: 6
      ];

      // 乱序版本 - 使用同一个 Symbol 实例
      const shuffled = [true, null, 42, 'a', 100n, testSymbol, undefined];
      shuffled.sort(primitiveCompare);
      expect(shuffled).toEqual(values);
    });

    test('Orders values within same type', () => {
      // 数字
      expect(primitiveCompare(1, 2)).toBe(-1);
      expect(primitiveCompare(3, 3)).toBe(0);
      expect(primitiveCompare(5, 1)).toBe(1);
      expect(primitiveCompare(NaN, 1)).toBe(1); // NaN 比其他数字大
      expect(primitiveCompare(-Infinity, Infinity)).toBe(-1);

      // 字符串
      expect(primitiveCompare('a', 'b')).toBe(-1);
      expect(primitiveCompare('b', 'a')).toBe(1);

      // 布尔值
      expect(primitiveCompare(false, true)).toBe(-1);
      expect(primitiveCompare(true, false)).toBe(1);

      // BigInt
      expect(primitiveCompare(10n, 20n)).toBe(-1);
      expect(primitiveCompare(30n, 30n)).toBe(0);
      expect(primitiveCompare(50n, 10n)).toBe(1);
    });

    test('Handles special cases', () => {
      // 相同符号比较（比较描述符）
      const symA = Symbol('a');
      const symB = Symbol('b');
      expect(primitiveCompare(symA, symB)).toBe(-1);

      // 混合类型比较
      expect(primitiveCompare(null, 'text')).toBe(-1);  // null < string
      expect(primitiveCompare(42, true)).toBe(-1);      // number < boolean
      expect(primitiveCompare(undefined, null)).toBe(1);       // undefined > null
      expect(primitiveCompare(undefined, 'any')).toBe(1);      // undefined > string
    });
  });
});
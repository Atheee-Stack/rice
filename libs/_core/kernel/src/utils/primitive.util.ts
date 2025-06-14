// rice/libs/_core/kernel/src/utils/primitive.util.ts

/**
 * Primitive 类型模块：定义 JavaScript 基础原始类型
 * 这些类型是语言内置的基本数据类型，不可再分，没有方法
 * 
 * @domain core
 */

/**
 * 所有原始类型的联合类型
 * 
 * 包含：
 * - string: 字符串类型
 * - number: 数字类型（包括整数和浮点数）
 * - boolean: 布尔类型（true/false）
 * - null: 空值类型
 * - undefined: 未定义类型
 * - symbol: ES6 引入的唯一符号类型
 * - bigint: ES2020 引入的大整数类型
 */
export type Primitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | symbol
  | bigint;

/**
 * 类型守卫：检查值是否为原始类型
 * 
 * @param value 待检查的值
 * @returns 如果值是原始类型返回 true，否则返回 false
 */
export const isPrimitive = (value: unknown): value is Primitive => {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  );
};

/**
 * 类型守卫：检查值是否为字符串
 * 
 * @param value 待检查的值
 * @returns 如果值是 string 类型返回 true
 */
export const isString = (value: unknown): value is string =>
  typeof value === 'string';

/**
 * 类型守卫：检查值是否为数字
 * 
 * @param value 待检查的值
 * @returns 如果值是 number 类型返回 true
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number';

/**
 * 类型守卫：检查值是否为布尔值
 * 
 * @param value 待检查的值
 * @returns 如果值是 boolean 类型返回 true
 */
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

/**
 * 类型守卫：检查值是否为 null
 * 
 * @param value 待检查的值
 * @returns 如果值是 null 返回 true
 */
export const isNull = (value: unknown): value is null =>
  value === null;

/**
 * 类型守卫：检查值是否为 undefined
 * 
 * @param value 待检查的值
 * @returns 如果值是 undefined 返回 true
 */
export const isUndefined = (value: unknown): value is undefined =>
  value === undefined;

/**
 * 类型守卫：检查值是否为 symbol
 * 
 * @param value 待检查的值
 * @returns 如果值是 symbol 类型返回 true
 */
export const isSymbol = (value: unknown): value is symbol =>
  typeof value === 'symbol';

/**
 * 类型守卫：检查值是否为 bigint
 * 
 * @param value 待检查的值
 * @returns 如果值是 bigint 类型返回 true
 */
export const isBigInt = (value: unknown): value is bigint =>
  typeof value === 'bigint';

/**
 * 类型守卫：检查值是否为日期对象
 * 
 * @param value 待检查的值
 * @returns 如果值是 Date 对象返回 true
 */
export const isDate = (value: unknown): value is Date => {
  return value instanceof Date;
};

/**
 * 安全转换为原始类型
 * 
 * @param value 待转换的值
 * @returns 如果值是原始类型直接返回，否则转换为字符串表示
 */
export const toPrimitive = (value: unknown): Primitive => {
  if (isPrimitive(value)) return value;

  // 特殊处理 Date 对象
  if (isDate(value)) {
    return value.toISOString();
  }

  // 尝试转换为原始值
  try {
    const primitiveValue = value.valueOf();
    if (isPrimitive(primitiveValue)) return primitiveValue;

    // 最后手段：转换为字符串
    return String(value);
  } catch {
    // 如果转换失败，返回默认值
    return '[Non-primitive value]';
  }
};

/**
 * 严格原始类型比较（适用于函数式编程）
 * 
 * @param a 第一个值
 * @param b 第二个值
 * @returns 如果值相同返回 true（按值比较而非引用）
 */
export const primitiveEquals = (a: Primitive, b: Primitive): boolean => {
  if (typeof a === 'number' && isNaN(a) && typeof b === 'number' && isNaN(b)) {
    return true; // NaN 比较特殊情况
  }

  return a === b;
};

/**
 * 原始类型哈希函数（生成唯一标识符）
 * 
 * @param value 原始值
 * @returns 基于值的哈希字符串
 */
export const primitiveHash = (value: Primitive): string => {
  // 处理特殊数字
  if (typeof value === 'number') {
    if (isNaN(value)) return 'number:NaN';
    if (value === Infinity) return 'number:Infinity';
    if (value === -Infinity) return 'number:-Infinity';
  }

  // 显式处理 null 和 undefined
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (isSymbol(value)) {
    return `Symbol(${String(value.description || 'anonymous')})`;
  }
  if (isBigInt(value)) {
    return `BigInt(${value.toString()})`;
  }

  return `${typeof value}:${value}`;
};

/**
 * 原始类型排序函数（用于数组排序）
 * 
 * @param a 第一个值
 * @param b 第二个值
 * @returns 标准排序结果（-1, 0, 1）
 */
export const primitiveCompare = (a: Primitive, b: Primitive): number => {
  // 定义类型顺序映射（修正顺序）
  const typeOrder = {
    'null': 0,
    'string': 1,
    'number': 2,
    'boolean': 3,
    'symbol': 4,
    'bigint': 5,
    'undefined': 6
  } as const;

  // 获取类型名称的统一方法
  const getTypeName = (value: Primitive): keyof typeof typeOrder => {
    if (value === null) return 'null';
    return typeof value as keyof typeof typeOrder;
  };

  const typeA = getTypeName(a);
  const typeB = getTypeName(b);

  // 类型不同的比较
  if (typeA !== typeB) {
    return typeOrder[typeA] < typeOrder[typeB] ? -1 : 1;
  }

  // 相同类型的比较
  switch (typeA) {
    case 'string':
      return (a as string).localeCompare(b as string);

    case 'number': {
      const numA = a as number;
      const numB = b as number;

      // 处理 NaN
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;  // NaN 视为最大
      if (isNaN(numB)) return -1;

      // 处理 Infinity
      if (numA === Infinity && numB === Infinity) return 0;
      if (numA === Infinity) return 1;
      if (numB === Infinity) return -1;
      if (numA === -Infinity && numB === -Infinity) return 0;
      if (numA === -Infinity) return -1;
      if (numB === -Infinity) return 1;

      // 标准比较（确保返回 -1/0/1）
      return numA === numB ? 0 : numA < numB ? -1 : 1;
    }

    case 'boolean':
      return (a === b) ? 0 : (a ? 1 : -1);

    case 'symbol':
      // 使用哈希字符串进行比较
      return primitiveHash(a as symbol).localeCompare(primitiveHash(b as symbol));

    case 'bigint': {
      const bigA = a as bigint;
      const bigB = b as bigint;
      return bigA === bigB ? 0 : bigA < bigB ? -1 : 1;
    }

    case 'undefined':
    case 'null':
      // 相同类型的 undefined 或 null 都视为相等
      return 0;

    default:
      return 0;
  }
};
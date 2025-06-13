// rice/libs/_core/kernel/src/domain/value-object.base.ts

import { Primitive } from "../utils/primitive.util";


/**
 * 值对象属性接口
 * 允许的属性类型包括:
 * - 基本原始类型 (Primitive)
 * - 其他值对象 (ValueObject<ValueObjectProps>)
 * - 值对象数组 (ValueObject<ValueObjectProps>[])
 */
export interface ValueObjectProps {
  [key: string]: Primitive | ValueObject<ValueObjectProps> | ValueObject<ValueObjectProps>[];
}

/**
 * 抽象值对象基类
 * @template T - 值对象属性类型，必须扩展 ValueObjectProps
 * 
 * 值对象(Value Object)是领域驱动设计(DDD)中的重要概念，
 * 其特征是:
 * 1. 通过属性值而不是标识来定义相等性
 * 2. 不可变性(immutable)
 * 3. 自验证性
 */
export abstract class ValueObject<T extends ValueObjectProps> {
  /**
   * 受保护的只读属性
   * 存储值对象的所有属性，初始化后不可变
   */
  protected readonly props: T;

  /**
   * 构造函数
   * @param props - 初始化属性对象
   * 1. 调用 validate 方法验证属性有效性
   * 2. 使用 Object.freeze 冻结属性防止修改
   */
  constructor(props: T) {
    this.props = Object.freeze(this.validate(props));
  }

  /**
   * 抽象验证方法
   * @param props - 待验证的属性对象
   * @returns 验证后的属性对象
   * 
   * 子类必须实现此方法，用于确保值对象属性的有效性
   */
  protected abstract validate(props: T): T;

  /**
   * 值对象相等性比较
   * @param vo - 要比较的值对象
   * @returns 是否相等
   * 
   * 比较规则:
   * 1. 如果比较对象为 null/undefined 返回 false
   * 2. 如果比较对象没有 props 属性返回 false
   * 3. 通过 JSON 序列化比较两个值对象的属性是否完全相同
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * 获取值对象的属性
   * @returns 值对象的属性对象
   * 
   * 注意: 返回的是冻结后的对象，无法直接修改
   */
  public getProps(): T {
    return this.props;
  }

  /**
   * 静态方法: 判断对象是否为值对象
   * @param obj - 要检查的对象
   * @returns 是否为 ValueObject 实例
   */
  public static isValueObject(obj: unknown): obj is ValueObject<ValueObjectProps> {
    return obj instanceof ValueObject;
  }
}
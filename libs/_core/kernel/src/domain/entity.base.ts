// rice/libs/_core/kernel/src/domain/entity.base.ts
/**
 * 实体基础模块：定义领域模型中实体（Entity）的核心抽象基类
 * 实体是领域模型中的核心概念，具有唯一标识符（ID），并通过ID而非属性值来区分不同实例
 * 继承自值对象（ValueObject），同时扩展了实体特有的标识符特性
 */

// 导入值对象基类及关联类型
import { Primitive } from '../utils/primitive.util.js';
import { ValueObject } from './value-object.base.js';
import type { ValueObjectProps } from './value-object.base.js';

/**
 * 实体属性接口定义
 * 扩展值对象属性接口，强制要求包含唯一标识符 `id`
 * @template T 实体具体属性类型（需继承自EntityProps）
 */
export interface EntityProps {
  /** 实体的唯一标识符（全局唯一） */
  id: string;
  /** 其他业务属性，支持原始类型、值对象或值对象数组 */
  [key: string]: Primitive | ValueObject<ValueObjectProps> | ValueObject<ValueObjectProps>[];
}

/**
 * 实体抽象基类（领域驱动设计中的核心实体抽象）
 * 提供实体共性能力：标识符访问、相等性判断等
 * @template T 具体实体的属性类型（需继承自EntityProps）
 */
export abstract class Entity<T extends EntityProps> extends ValueObject<T> {
  /**
   * 获取实体唯一标识符
   * @returns 实体的ID字符串
   */
  get id(): string {
    return this.props.id;
  }

  /**
   * 判断两个实体是否相等（核心业务逻辑）
   * 领域驱动设计原则：实体通过唯一标识符（ID）判断相等性，而非属性值全量比较
   * @param object 待比较的对象（可能是另一个实体实例）
   * @returns 相等返回true，否则返回false
   */
  public override equals(object?: Entity<T>): boolean {
    // 空值校验：对象不存在则不相等
    if (object === null || object === undefined) {
      return false;
    }

    // 自引用校验：同一实例直接判定为相等
    if (this === object) {
      return true;
    }

    // 类型校验：必须是Entity类型实例
    if (!(object instanceof Entity)) {
      return false;
    }

    // 核心逻辑：通过ID比较判定实体相等性
    return this.id === object.id;
  }
}
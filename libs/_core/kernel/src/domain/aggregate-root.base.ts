// rice/libs/_core/kernel/src/domain/aggregate-root.base.ts

/**
 * 聚合根基础模块：定义领域驱动设计（DDD）中聚合根（Aggregate Root）的核心抽象基类
 * 聚合根是领域模型中聚合（Aggregate）的入口点，负责维护聚合内部的一致性边界、管理实体生命周期，
 * 并作为领域事件的主要发布者，是连接领域模型与外部系统（如应用服务、消息队列）的关键桥梁
 * 继承自实体（Entity），扩展了事件管理与状态验证能力
 */

// 导入领域事件基类及实体基础类型
import { DomainEvent } from './domain-event.js';
import { Entity, EntityProps } from './entity.base.js';

/**
 * 泛型参数说明：
 * - T：聚合根的属性类型（需继承自EntityProps，即实体基础属性结构）
 */
export abstract class AggregateRoot<T extends EntityProps> extends Entity<T> {
  /**
   * 私有属性：存储当前聚合根触发的所有未发布领域事件
   * 设计为私有以保证事件列表的封装性，仅允许通过类内部方法操作
   * @private
   */
  private _domainEvents: DomainEvent<this, T>[] = [];

  /**
   * 只读属性：暴露当前聚合根的所有未发布领域事件
   * 外部只能读取事件列表，无法直接修改（通过`addDomainEvent`方法添加）
   * @readonly
   */
  get domainEvents(): DomainEvent<this, T>[] {
    return this._domainEvents;
  }

  /**
   * 添加领域事件到聚合根的事件列表
   * 通常在聚合根内部状态变更时调用（如在命令处理逻辑中）
   * @param event 待添加的领域事件实例（需与当前聚合根类型匹配）
   */
  protected addDomainEvent(event: DomainEvent<this, T>): void {
    this._domainEvents.push(event);
  }

  /**
   * 清空当前聚合根的所有未发布领域事件
   * 通常在事件成功发布（如发送到消息队列）后调用，避免重复发布
   */
  public clearEvents(): void {
    this._domainEvents = [];
  }

  /**
   * 验证聚合根的初始状态有效性
   * 确保聚合根在创建时满足核心业务规则（如ID必须存在）
   * 子类可重写此方法扩展验证逻辑（如检查其他必填属性）
   * @param props 聚合根的属性对象（构造时传入）
   * @returns 验证通过的属性对象（与输入相同）
   * @throws {Error} 若验证失败（如ID缺失）
   */
  protected validate(props: T): T {
    // 核心验证：聚合根必须有有效的ID（由Entity基类保证，但此处显式检查）
    if (!props.id) {
      throw new Error('AggregateRoot must have an ID');
    }
    // 子类可在此处添加额外验证逻辑（如检查其他必填字段）
    return props;
  }
}
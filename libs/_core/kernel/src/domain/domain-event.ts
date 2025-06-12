// rice/libs/_core/kernel/src/domain/domain-event.ts

/**
 * 领域事件基础模块：定义领域驱动设计（DDD）中领域事件（Domain Event）的核心抽象基类
 * 领域事件用于捕获领域模型中发生的关键业务状态变更，是实现事件溯源（Event Sourcing）、领域事件发布-订阅模式的核心载体
 * 所有具体领域事件需继承此类并实现序列化方法
 */

// 导入聚合根基类及实体属性类型定义
import { AggregateRoot } from '../domain/aggregate-root.base.js';
import type { EntityProps } from '../domain/entity.base.js';

/**
 * 泛型参数说明：
 * - T：关联的聚合根类型（必须继承自AggregateRoot），表示该事件由哪个聚合根触发
 * - P：聚合根的属性类型（默认继承自EntityProps，即实体基础属性结构）
 */
export abstract class DomainEvent<
  T extends AggregateRoot<P>,
  P extends EntityProps = EntityProps
> {
  /**
   * 事件发生的时间戳（精确到毫秒）
   * 自动记录事件创建时的系统时间，用于事件排序和时间序列分析
   */
  public readonly timestamp: Date;

  /**
   * 触发该事件的聚合根唯一标识符
   * 用于快速定位事件关联的业务实体（如订单ID、用户ID等）
   */
  public readonly aggregateId: string;

  /**
   * 事件类型的标识符（字符串形式）
   * 默认使用事件类的构造函数名称（如"OrderCreatedEvent"），用于事件类型路由和反序列化
   */
  public readonly eventType: string;

  /**
   * 构造函数：初始化领域事件的基础元数据
   * @param aggregate 触发事件的聚合根实例（必须已初始化且拥有有效ID）
   */
  constructor(aggregate: T) {
    // 自动记录当前时间作为事件发生时间
    this.timestamp = new Date();
    // 从聚合根中提取唯一标识符（依赖聚合根基类的id属性）
    this.aggregateId = aggregate.id;
    // 使用事件类名作为事件类型标识（子类需保持命名规范）
    this.eventType = this.constructor.name;
  }

  /**
   * 将事件对象序列化为纯数据对象（Plain Object）
   * 用于事件持久化（如存储到事件存储库）、消息队列传输等场景
   * 子类需实现此方法以定义具体的序列化逻辑（通常包含事件元数据和业务数据）
   * @returns 包含事件完整信息的普通JavaScript对象
   */
  abstract toPlainObject(): Record<string, unknown>;
}
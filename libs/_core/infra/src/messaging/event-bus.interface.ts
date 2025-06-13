import type { AggregateRoot, DomainEvent, EntityProps, Result } from "@rice/core-kernel";

/**
 * 强类型事件总线接口
 */
export interface IEventBus {
  /**
   * 发布单个事件
   * @template T - 聚合根类型（必须继承自AggregateRoot<EntityProps>）
   * @template P - 聚合根属性类型（必须继承自EntityProps）
   */
  publish<T extends AggregateRoot<P>, P extends EntityProps>(
    event: DomainEvent<T, P>
  ): Promise<Result<void>>;

  /**
   * 批量发布事件
   * @template T - 聚合根类型
   * @template P - 聚合根属性类型
   */
  publishAll<T extends AggregateRoot<P>, P extends EntityProps>(
    events: DomainEvent<T, P>[]
  ): Promise<Result<void>>;

  /**
   * 订阅事件（完全类型安全版本）
   * @template T - 聚合根类型
   * @template P - 聚合根属性类型
   * @template E - 具体事件类型
   */
  subscribe<
    T extends AggregateRoot<P>,
    P extends EntityProps,
    E extends DomainEvent<T, P>
  >(
    eventType: new (aggregate: T) => E,
    handler: (event: Readonly<E>) => Promise<Result<void>>
  ): () => void;
}

/**
 * 强类型事件处理器接口
 * @template T - 聚合根类型
 * @template P - 聚合根属性类型
 * @template E - 具体事件类型
 */
export interface IEventHandler<
  T extends AggregateRoot<P>,
  P extends EntityProps,
  E extends DomainEvent<T, P>
> {
  handle(event: Readonly<E>): Promise<Result<void>>;
}
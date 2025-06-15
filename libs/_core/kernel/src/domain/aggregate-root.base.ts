// rice/libs/_core/kernel/src/domain/aggregate-root.base.ts
import { Primitive } from '../utils/primitive.util';
import { ValueObject } from './value-object.base';
import { Result, ok, fail } from '../utils/result.util';
import { DomainEvent } from './domain-event';
import { Entity } from './entity.base';

/**
 * 聚合根基类
 */
export abstract class AggregateRoot<
  ID extends ValueObject<Primitive>,
  S = unknown
> extends Entity<ID, S> {
  protected version = 0;
  private pendingEvents: DomainEvent<unknown>[] = [];

  /**
   * 正确调用父类构造函数
   */
  protected constructor(id: ID, state: S, version = 0) {
    super(id, state);  // 调用 Entity 的构造函数
    this.version = version;
  }

  get currentVersion(): number {
    return this.version;
  }

  get uncommittedEvents(): ReadonlyArray<DomainEvent<unknown>> {
    return [...this.pendingEvents];
  }

  clearEvents(): void {
    this.pendingEvents = [];
  }

  /**
   * 应用领域事件（改为公共方法）
   */
  applyEvent<E extends DomainEvent<unknown>>(event: E): Result<this> {
    const handler = this.getEventHandler(event);
    if (!handler) {
      return fail(new Error(`No event handler for ${event.eventType}`));
    }

    const result = handler(event);
    if (result.isFail()) {
      return fail(result.unwrapErr());
    }

    this.pendingEvents.push(event);
    this.version++;
    return ok(this);
  }

  /**
   * 重建聚合根方法
   */
  static replay<A extends AggregateRoot<ID, S>, ID extends ValueObject<Primitive>, S>(
    this: new (id: ID, state: S, version: number) => A,
    id: ID,
    events: DomainEvent<unknown>[]
  ): Result<A> {
    let current: A = new this(id, {} as S, 0);

    for (const event of events) {
      const result = current.applyEvent(event);
      if (result.isFail()) return result;
      current = result.unwrap();
    }

    return ok(current);
  }

  /**
   * 安全类型的事件处理函数获取
   */
  protected getEventHandler<E extends DomainEvent<unknown>>(
    event: E
  ): ((event: E) => Result<void>) | undefined {
    const handlerName = `on${event.eventType}`;
    type HandlerType = Record<string, (event: E) => Result<void>>;
    const handler = (this as unknown as HandlerType)[handlerName];

    return typeof handler === 'function' ? handler.bind(this) : undefined;
  }

  updateState(updater: (state: Readonly<S>) => S): this {
    const newState = updater(this.state);
    return this.copyWithState(newState);
  }

  protected copyWithState(newState: S): this {
    const Constructor = this.constructor as new (
      id: ID,
      state: S,
      version: number
    ) => this;
    return new Constructor(this.id, newState, this.version);
  }

  /**
   * 创建聚合根的工厂方法
   */
  static createAggregate<A extends AggregateRoot<ID, S>, ID extends ValueObject<Primitive>, S>(
    this: new (id: ID, state: S, version: number) => A,
    id: ID,
    state: S
  ): Result<A> {
    return ok(new this(id, state, 0));
  }

  /**
   * 状态转换管道
   */
  statePipe(
    ...operations: Array<(state: Readonly<S>) => S>
  ): this {
    return operations.reduce(
      (agg, op) => agg.updateState(op),
      this
    );
  }

  /**
   * 安全状态更新（改为公共方法）
   */
  safeUpdate(
    updater: (state: Readonly<S>) => S,
    validator: (state: Readonly<S>) => Result<void>
  ): Result<this> {
    const newState = updater(this.state);
    const validation = validator(newState);

    if (validation.isFail()) {
      return fail(validation.unwrapErr());
    }

    return ok(this.copyWithState(newState));
  }
}

// ===================== 函数式工具扩展 =====================

/**
 * 应用事件到聚合根的函数
 */
export const applyEventToAggregate = <
  A extends AggregateRoot<ValueObject<Primitive>, unknown>,
  E extends DomainEvent<unknown>
>(
  event: E
): ((aggregate: A) => Result<A>) => {
  return (aggregate: A) => aggregate.applyEvent(event);
};

/**
 * 状态转换管道函数
 */
export const transformAggregateState = <
  A extends AggregateRoot<ValueObject<Primitive>, S>,
  S
>(
  ...operations: Array<(state: Readonly<S>) => S>
): ((aggregate: A) => A) => {
  return (aggregate: A) => aggregate.statePipe(...operations);
};

/**
 * 安全状态更新函数
 */
export const safelyUpdateAggregate = <
  A extends AggregateRoot<ValueObject<Primitive>, S>,
  S
>(
  updater: (state: Readonly<S>) => S,
  validator: (state: Readonly<S>) => Result<void>
): ((aggregate: A) => Result<A>) => {
  return (aggregate: A) => aggregate.safeUpdate(updater, validator);
};

// ===================== 类型扩展 =====================

/**
 * 聚合根状态类型
 */
export type AggregateState<A> = A extends AggregateRoot<ValueObject<Primitive>, infer S>
  ? S
  : never;

/**
 * 聚合根ID类型
 */
export type AggregateID<A> = A extends AggregateRoot<infer ID, unknown>
  ? ID
  : never;
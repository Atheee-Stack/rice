// rice/libs/_core/kernel/src/domain/entity.base.ts
import {
  ValueObject,
  ValueType
} from './value-object.base';
import {
  Result,
  ok,
  fail
} from '../utils/result.util';
import {
  Mapper,
  Predicate
} from '../utils/functional.util';
import { Primitive } from '../utils/primitive.util';

/**
 * 实体基类（函数式编程风格）
 * 
 * @template ID - 实体ID的类型（必须为值对象）
 * @template S - 实体状态的类型
 * 
 * @domain Domain-Driven Design (Core Domain)
 */
export abstract class Entity<ID extends ValueObject<Primitive>, S> {
  protected readonly id: ID;
  protected readonly state: S;

  protected constructor(id: ID, state: S) {
    this.id = id;
    this.state = Object.freeze(state) as S;
  }

  get identity(): Readonly<ID> {
    return this.id;
  }

  get stateSnapshot(): Readonly<S> {
    return this.state;
  }

  equals(other: Entity<ID, S>): boolean {
    if (this === other) return true;
    return this.id.equals(other.id);
  }

  hashCode(): string {
    return this.id.hashCode();
  }

  compare(other: Entity<ID, S>): number {
    return this.id.compare(other.id);
  }

  /**
   * 创建实体的工厂方法
   */
  static create<
    IDVO extends ValueObject<Primitive>,
    State,
    T extends Entity<IDVO, State>
  >(
    this: EntityConstructor<IDVO, State, T>,
    id: unknown,
    state: unknown
  ): Result<T> {
    const idResult = this.validateId(id);
    if (idResult.isFail()) return fail(idResult.unwrapErr());

    const stateResult = this.validateState(state);
    if (stateResult.isFail()) return fail(stateResult.unwrapErr());

    try {
      return ok(new this(
        idResult.unwrap() as IDVO,
        stateResult.unwrap() as State
      ));
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 状态迁移方法
   */
  transition(updater: (state: S) => S): this {
    const Constructor = this.constructor as new (id: ID, state: S) => this;
    return new Constructor(this.id, updater(this.state));
  }

  /**
   * 状态过滤检查
   */
  ensureState(predicate: Predicate<S>): Result<this> {
    return predicate(this.state)
      ? ok(this)
      : fail(new Error('State condition not satisfied'));
  }

  /**
   * 实体管道操作
   */
  pipe(...operators: Array<Mapper<S, S>>): this {
    return operators.reduce((entity, operator) => {
      return entity.transition(operator);
    }, this);
  }

  /**
   * ID验证方法（子类必须实现）
   * 
   * 使用占位符实现，子类应覆盖此方法
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validateId(_id: unknown): Result<ValueObject<Primitive>> {
    throw new Error('validateId must be implemented by subclass');
  }

  /**
   * 状态验证方法（子类必须实现）
   * 
   * 使用占位符实现，子类应覆盖此方法
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validateState(_state: unknown): Result<unknown> {
    throw new Error('validateState must be implemented by subclass');
  }

  toJSON(): { id: ValueType<ID>; state: S } {
    return {
      id: this.id.value as ValueType<ID>,
      state: this.state
    };
  }

  toString(): string {
    return `Entity[${this.id.toString()}]`;
  }
}

// ===================== 函数式工具扩展 =====================

/**
 * 实体状态相等性检查
 */
export const stateEquals = <S>(expectedState: S): Predicate<Entity<ValueObject<Primitive>, S>> => {
  return (entity) => {
    const currentState = entity.stateSnapshot;
    return JSON.stringify(currentState) === JSON.stringify(expectedState);
  };
};

/**
 * 实体状态转换器
 */
export const mapEntityState = <ID extends ValueObject<Primitive>, S, T>(
  mapper: (state: S) => T
): (entity: Entity<ID, S>) => Entity<ID, T> => {
  return (entity) => {
    const Constructor = entity.constructor as new (id: ID, state: T) => Entity<ID, T>;
    return new Constructor(entity.identity, mapper(entity.stateSnapshot));
  };
};

/**
 * 实体状态管道操作
 */
export const entityStatePipeline = <E extends Entity<ValueObject<Primitive>, S>, S>(
  ...mappers: Array<Mapper<S, S>>
): Mapper<E, E> => {
  return (entity) => entity.pipe(...mappers);
};

// ===================== 类型扩展 =====================

/**
 * 实体构造函数接口
 */
export interface EntityConstructor<
  ID extends ValueObject<Primitive>,
  S,
  T extends Entity<ID, S>
> {
  new(id: ID, state: S): T;
  validateId(id: unknown): Result<ValueObject<Primitive>>;
  validateState(state: unknown): Result<unknown>;
}

/**
 * 实体ID类型提取
 */
export type EntityIdType<E> = E extends Entity<infer ID, unknown> ? ID : never;

/**
 * 实体状态类型提取
 */
export type EntityStateType<E> = E extends Entity<ValueObject<Primitive>, infer S> ? S : never;
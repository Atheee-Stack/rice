// rice/libs/_core/kernel/src/domain/domain-event.ts
import { ValueObject } from './value-object.base';
import { Result, ok, fail, ResultMethods } from '../utils/result.util';
import { SpecSchema } from '../utils/spec-validator.util';
import { Mapper } from '../utils/functional.util';

// ===================== 事件标识符 =====================

export class EventId extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  public getSpec(): SpecSchema {
    return {
      schema: {
        type: 'string',
        format: 'uuid'
      }
    };
  }

  static generate(): Result<EventId> {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

    return EventId.create(uuid);
  }
}

// ===================== 领域事件基类 =====================

export abstract class DomainEvent<T> extends ValueObject<{
  eventId: EventId;
  occurredOn: Date;
  eventType: string;
  eventData: T;
}> {
  get eventType(): string {
    return this.value.eventType;
  }

  get occurredOn(): Date {
    return new Date(this.value.occurredOn);
  }

  get identity(): EventId {
    return this.value.eventId;
  }

  get data(): Readonly<T> {
    return this.value.eventData;
  }

  protected override getSpec(): SpecSchema {
    const eventIdSpec = EventId.prototype.getSpec().schema;

    return {
      schema: {
        type: 'object',
        required: ['eventId', 'occurredOn', 'eventType', 'eventData'],
        properties: {
          eventId: eventIdSpec,
          occurredOn: { type: 'string', format: 'date-time' },
          eventType: { type: 'string', minLength: 1 },
          eventData: {}
        }
      },
      transform: ['toISOString']
    };
  }

  /**
   * 函数式领域事件创建
   */
  static createEvent<U, T extends DomainEvent<U>>(
    this: new (value: {
      eventId: EventId;
      occurredOn: Date;
      eventType: string;
      eventData: U;
    }) => T,
    eventData: U,
    options: { eventId?: EventId; occurredOn?: Date } = {}
  ): Result<T> {
    // 获取发生时间（或当前时间）
    const occurredOn = options.occurredOn || new Date();

    // 安全创建事件实例的函数
    const createEventInstance = (id: EventId): Result<T> => {
      try {
        return ok(new this({
          eventId: id,
          occurredOn,
          eventType: this.name,
          eventData
        }));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return fail(err);
      }
    };

    // 如果有提供 eventId，直接使用
    if (options.eventId) {
      return createEventInstance(options.eventId);
    }

    // 生成新的 eventId 并创建事件
    const eventResult = EventId.generate();
    return ResultMethods.flatMap(eventResult, createEventInstance);
  }
}

// ===================== 函数式工具扩展 =====================

export type EventHandler<E extends DomainEvent<unknown>> = (event: E) => Result<void>;

export type EnhancedEventHandler<E extends DomainEvent<unknown>> = (
  event: E,
  metadata: EventMetadata
) => Result<void>;

export type EventMetadata = {
  correlationId?: string;
  causationId?: string;
  timestamp?: Date;
};

export type EventFactory<T extends DomainEvent<unknown>> = (
  data: unknown,
  options?: { eventId?: EventId; occurredOn?: Date }
) => Result<T>;

// ===================== 实用函数 =====================

/**
 * 创建事件工厂函数
 */
export const createEventFactory = <T extends DomainEvent<unknown>>(
  eventClass: {
    createEvent: (data: unknown, options?: { eventId?: EventId; occurredOn?: Date }) => Result<T>
  }
): EventFactory<T> => {
  return (data, options) => eventClass.createEvent(data, options);
};

/**
 * 安全应用事件处理器
 */
export const safeApplyHandler = <E extends DomainEvent<unknown>>(
  handler: EventHandler<E>
): Mapper<E, Result<void>> => (event: E) => {
  try {
    return handler(event);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return fail(err);
  }
};

/**
 * 事件处理管道
 */
export const eventProcessingPipeline = <E extends DomainEvent<unknown>>(
  ...handlers: EventHandler<E>[]
): EventHandler<E> => (event: E) => {
  // 初始结果为成功
  let result: Result<void> = ok(undefined);

  // 按顺序应用所有处理器
  for (const handler of handlers) {
    // 如果前一个操作失败，直接返回错误
    if (result.isFail()) {
      return result;
    }

    // 应用当前处理器
    result = safeApplyHandler(handler)(event);
  }

  return result;
};

/**
 * 组合多个事件处理器的简化方法
 */
export const composeEventHandlers = <E extends DomainEvent<unknown>>(
  ...handlers: EventHandler<E>[]
): EventHandler<E> => {
  return eventProcessingPipeline(...handlers);
};
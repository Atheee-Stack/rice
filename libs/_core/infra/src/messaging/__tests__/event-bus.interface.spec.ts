import type { IEventBus, IEventHandler } from "../event-bus.interface";
import {
  AggregateRoot,
  DomainEvent,
  EntityProps,
  Result,
  ok,
  err
} from "@rice/core-kernel";

// 定义测试所需的实体和事件 ===============================
type TestProps = { id: string };

class TestAggregate extends AggregateRoot<TestProps> {
  override get id(): string {
    return this.props.id;
  }

  // 实现抽象方法以满足类型要求
  toPlainObject(): Record<string, unknown> {
    return { ...this.props };
  }
}

class TestEvent extends DomainEvent<TestAggregate, TestProps> {
  constructor(aggregate: TestAggregate) {
    super(aggregate);
  }

  // 实现抽象方法以满足类型要求
  toPlainObject(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      timestamp: this.timestamp.toISOString()
    };
  }
}

class TestEvent1 extends TestEvent { }
class TestEvent2 extends TestEvent { }

// 内存事件总线实现 =======================================
class InMemoryEventBus implements IEventBus {
  private subscriptions: Map<
    string,
    Array<(event: DomainEvent<AggregateRoot<EntityProps>, EntityProps>) => Promise<Result<void, Error>>>
  > = new Map();

  private events: DomainEvent<AggregateRoot<EntityProps>, EntityProps>[] = [];

  async publish<T extends AggregateRoot<P>, P extends EntityProps>(
    event: DomainEvent<T, P>
  ): Promise<Result<void, Error>> {
    try {
      this.events.push(event as DomainEvent<AggregateRoot<EntityProps>, EntityProps>);
      const handlers = this.subscriptions.get(event.constructor.name) || [];
      for (const handler of handlers) {
        const result = await handler(event);
        // 使用标准的Result类型检查
        if (result.kind === 'error') return result;
      }
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async publishAll<T extends AggregateRoot<P>, P extends EntityProps>(
    events: DomainEvent<T, P>[]
  ): Promise<Result<void, Error>> {
    for (const event of events) {
      const result = await this.publish(event);
      // 使用标准的Result类型检查
      if (result.kind === 'error') return result;
    }
    return ok(undefined);
  }

  subscribe<
    T extends AggregateRoot<P>,
    P extends EntityProps,
    E extends DomainEvent<T, P>
  >(
    eventType: new (aggregate: T) => E,
    handler: (event: Readonly<E>) => Promise<Result<void, Error>>
  ): () => void {
    const typeName = eventType.name;
    if (!this.subscriptions.has(typeName)) {
      this.subscriptions.set(typeName, []);
    }

    const handlers = this.subscriptions.get(typeName) || [];
    handlers.push(handler as (event: DomainEvent<AggregateRoot<EntityProps>, EntityProps>) => Promise<Result<void, Error>>);

    // 返回取消订阅函数
    return () => {
      const index = handlers.findIndex(h => h === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }
}

// 测试用例 =============================================

describe('IEventBus', () => {
  let eventBus: IEventBus;
  let aggregate: TestAggregate;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
    aggregate = new TestAggregate({ id: 'test-id' });
  });

  describe('publish', () => {
    test('应该成功发布单个事件', async () => {
      const event = new TestEvent1(aggregate);
      const result = await eventBus.publish(event);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('success');
    });

    test('应该处理发布错误', async () => {
      const faultyBus: IEventBus = {
        publish: async () => err(new Error('Publish failed')),
        publishAll: async () => ok(undefined),
        // 避免空函数体警告
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        subscribe: () => () => { }
      };

      const event = new TestEvent1(aggregate);
      const result = await faultyBus.publish(event);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.error.message).toBe('Publish failed');
      }
    });
  });

  describe('publishAll', () => {
    test('应该成功发布多个事件', async () => {
      const events = [
        new TestEvent1(aggregate),
        new TestEvent2(aggregate),
      ];

      const result = await eventBus.publishAll(events);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('success');
    });

    test('应在第一个错误时中断', async () => {
      const events = [
        new TestEvent1(aggregate),
        new TestEvent2(aggregate),
      ];

      // 模拟处理器在第二个事件失败
      eventBus.subscribe(TestEvent2, async () =>
        err(new Error('TestEvent2 handler failed'))
      );

      const result = await eventBus.publishAll(events);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.error.message).toBe('TestEvent2 handler failed');
      }
    });
  });

  describe('subscribe', () => {
    test('应该处理特定类型的事件', async () => {
      const event1 = new TestEvent1(aggregate);
      const event2 = new TestEvent2(aggregate);

      const handler1 = jest.fn().mockResolvedValue(ok(undefined));
      const handler2 = jest.fn().mockResolvedValue(ok(undefined));

      // 订阅两种事件类型
      eventBus.subscribe(TestEvent1, handler1);
      eventBus.subscribe(TestEvent2, handler2);

      const result1 = await eventBus.publish(event1);
      const result2 = await eventBus.publish(event2);

      // 使用Result的kind属性检查
      expect(result1.kind).toBe('success');
      expect(result2.kind).toBe('success');

      // 验证处理器调用
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(event1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(event2);
    });

    test('应该支持多个处理器', async () => {
      const event = new TestEvent1(aggregate);

      const handler1 = jest.fn().mockResolvedValue(ok(undefined));
      const handler2 = jest.fn().mockResolvedValue(ok(undefined));

      eventBus.subscribe(TestEvent1, handler1);
      eventBus.subscribe(TestEvent1, handler2);

      const result = await eventBus.publish(event);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('success');

      // 验证两个处理器都被调用
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('应该允许取消订阅', async () => {
      const event = new TestEvent1(aggregate);

      const handler = jest.fn().mockResolvedValue(ok(undefined));

      // 订阅后立即取消订阅
      const unsubscribe = eventBus.subscribe(TestEvent1, handler);
      unsubscribe();

      const result = await eventBus.publish(event);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('success');

      // 验证处理器未被调用
      expect(handler).not.toHaveBeenCalled();
    });

    test('应该正确处理处理器错误', async () => {
      const event = new TestEvent1(aggregate);

      const handlerError = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(handlerError);

      eventBus.subscribe(TestEvent1, handler);

      const result = await eventBus.publish(event);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('error');

      if (result.kind === 'error') {
        expect(result.error).toBe(handlerError);
      }
    });

    test('应该正确处理处理器返回的错误结果', async () => {
      const event = new TestEvent1(aggregate);

      const handler = jest.fn().mockResolvedValue(
        err(new Error('Intentional error'))
      );

      eventBus.subscribe(TestEvent1, handler);

      const result = await eventBus.publish(event);

      // 使用Result的kind属性检查
      expect(result.kind).toBe('error');

      if (result.kind === 'error') {
        expect(result.error.message).toBe('Intentional error');
      }
    });
  });
});

describe('IEventHandler', () => {
  class TestEventHandler implements IEventHandler<TestAggregate, TestProps, TestEvent1> {
    private handledEvents: TestEvent1[] = [];

    async handle(event: Readonly<TestEvent1>): Promise<Result<void, Error>> {
      this.handledEvents.push(event);
      return ok(undefined);
    }

    getEvents(): Readonly<TestEvent1[]> {
      return this.handledEvents;
    }
  }

  test('应该正确处理事件', async () => {
    const handler = new TestEventHandler();
    const aggregate = new TestAggregate({ id: 'test-id' });
    const event = new TestEvent1(aggregate);

    const result = await handler.handle(event);

    // 使用Result的kind属性检查
    expect(result.kind).toBe('success');

    // 验证事件被记录
    expect(handler.getEvents()).toEqual([event]);
  });
});
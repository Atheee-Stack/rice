// rice/libs/_core/infra/src/storage/__tests__/mock/in-memory-repository.mock.ts
import type { EntityProps } from '@rice/core-kernel';
import type { DomainEvent } from '@rice/core-kernel';
import { AggregateRoot } from '@rice/core-kernel';
import { Result, ok } from '@rice/core-kernel';
import { nanoid } from 'nanoid';
import { test, expect } from '@jest/globals'; // 添加Jest全局导入
import { IRepository } from 'src/storage/repository.interface';

/**
 * 测试用聚合根属性
 * @domain Organization
 */
interface TestAggregateProps extends EntityProps {
  name: string;
}

/**
 * 测试用聚合根
 * @domain Organization
 */
class TestAggregate extends AggregateRoot<TestAggregateProps> {
  constructor(props: TestAggregateProps) {
    super(props);
  }

  get name(): string {
    return this.props.name;
  }

  // 设置名称方法（返回新实例而不是修改属性）
  setName(newName: string): TestAggregate {
    return new TestAggregate({
      ...this.props,
      name: newName
    });
  }

  // 实现验证逻辑
  protected override validate(props: TestAggregateProps): TestAggregateProps {
    // 先验证名称长度再验证ID
    if (!props.name || props.name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    if (!props.id) throw new Error("ID must be provided");
    return props;
  }

  // 添加公共方法用于测试中创建领域事件
  public addTestEvent(event: DomainEvent<TestAggregate>): void {
    this.addDomainEvent(event);
  }
}

/**
 * 内存仓储实现 (用于测试)
 * @template T
 */
class InMemoryRepository<T extends AggregateRoot<EntityProps>>
  implements IRepository<T, string> {
  protected readonly aggregates: Map<string, T> = new Map();

  async findById(id: string): Promise<Result<T | null, Error>> {
    return ok(this.aggregates.get(id) || null);
  }

  async exists(id: string): Promise<Result<boolean, Error>> {
    return ok(this.aggregates.has(id));
  }

  async save(aggregate: T): Promise<Result<void, Error>> {
    this.aggregates.set(aggregate.id, aggregate);
    return ok(undefined);
  }

  async delete(id: string): Promise<Result<void, Error>> {
    this.aggregates.delete(id);
    return ok(undefined);
  }

  async publishEvents(aggregate: T): Promise<Result<void, Error>> {
    aggregate.clearEvents();
    return ok(undefined);
  }
}

// 工厂函数创建测试聚合根
const createTestAggregate = (name = "Test"): TestAggregate => {
  return new TestAggregate({
    id: nanoid(),
    name: name
  });
};

// 测试领域事件实现
class TestDomainEvent implements DomainEvent<TestAggregate> {
  public readonly eventType: string = "TestEvent";

  constructor(
    public readonly aggregateId: string,
    public readonly timestamp: Date = new Date()
  ) { }

  toPlainObject(): Record<string, string> {
    return {
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      timestamp: this.timestamp.toISOString()
    };
  }
}

// 添加一个简单的测试确保Jest不会报错
test('mock file contains at least one test', () => {
  expect(true).toBeTruthy();
});

export { InMemoryRepository, TestAggregate, TestDomainEvent, createTestAggregate };
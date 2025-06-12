// libs/_core/kernel/src/domain/__tests__/domain-event.spec.ts
import { DomainEvent } from '../domain-event';
import { AggregateRoot } from '../aggregate-root.base';
import { EntityProps } from '../entity.base';

interface TestAggregateProps extends EntityProps {
  name: string;
}

class TestAggregate extends AggregateRoot<TestAggregateProps> {
  protected override validate(props: TestAggregateProps): TestAggregateProps {
    if (!props.name) {
      throw new Error('Name is required');
    }
    return props;
  }
}

class TestEvent extends DomainEvent<TestAggregate, TestAggregateProps> {
  toPlainObject() {
    return {
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      timestamp: this.timestamp
    };
  }
}

describe('DomainEvent', () => {
  it('应该正确创建领域事件', () => {
    const aggregate = new TestAggregate({ id: '1', name: 'Test' });
    const event = new TestEvent(aggregate);

    expect(event.aggregateId).toBe('1');
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.eventType).toBe('TestEvent');
  });

  it('应该正确转换为普通对象', () => {
    const aggregate = new TestAggregate({ id: '1', name: 'Test' });
    const event = new TestEvent(aggregate);
    const plain = event.toPlainObject();

    expect(plain.aggregateId).toBe('1');
    expect(plain.eventType).toBe('TestEvent');
    expect(new Date(plain.timestamp)).toBeInstanceOf(Date);
  });
});
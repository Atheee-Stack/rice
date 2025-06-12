// libs/_core/kernel/src/domain/__tests__/aggregate-root.spec.ts
import { AggregateRoot } from '../aggregate-root.base';
import { DomainEvent } from '../domain-event';
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

describe('AggregateRoot', () => {
  it('应该正确创建聚合根', () => {
    const aggregate = new TestAggregate({ id: '1', name: 'Test' });
    expect(aggregate.id).toBe('1');
  });

  it('应该添加领域事件', () => {
    const aggregate = new TestAggregate({ id: '1', name: 'Test' });
    const event = new TestEvent(aggregate);
    aggregate['addDomainEvent'](event);

    expect(aggregate.domainEvents.length).toBe(1);
    expect(aggregate.domainEvents[0]).toBeInstanceOf(TestEvent);
  });

  it('应该清除领域事件', () => {
    const aggregate = new TestAggregate({ id: '1', name: 'Test' });
    const event = new TestEvent(aggregate);
    aggregate['addDomainEvent'](event);
    aggregate.clearEvents();

    expect(aggregate.domainEvents.length).toBe(0);
  });
});
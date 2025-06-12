// libs/_core/kernel/src/domain/__tests__/entity.base.spec.ts
import { Entity, EntityProps } from '../entity.base';

interface TestEntityProps extends EntityProps {
  name: string;
  age: number;
}

class TestEntity extends Entity<TestEntityProps> {
  protected validate(props: TestEntityProps): TestEntityProps {
    if (!props.name || props.age < 0) {
      throw new Error('Invalid entity props');
    }
    return props;
  }

  get name(): string {
    return this.props.name;
  }

  get age(): number {
    return this.props.age;
  }
}

describe('Entity', () => {
  it('应该正确创建实体', () => {
    const props = { id: '1', name: 'Test', age: 30 };
    const entity = new TestEntity(props);

    expect(entity.id).toBe('1');
    expect(entity.name).toBe('Test');
    expect(entity.age).toBe(30);
  });

  it('相同ID的实体应该相等', () => {
    const entity1 = new TestEntity({ id: '1', name: 'A', age: 20 });
    const entity2 = new TestEntity({ id: '1', name: 'B', age: 30 });

    expect(entity1.equals(entity2)).toBe(true);
  });

  it('不同ID的实体应该不等', () => {
    const entity1 = new TestEntity({ id: '1', name: 'A', age: 20 });
    const entity2 = new TestEntity({ id: '2', name: 'A', age: 20 });

    expect(entity1.equals(entity2)).toBe(false);
  });

  it('与undefined比较应该返回false', () => {
    const entity = new TestEntity({ id: '1', name: 'Test', age: 30 });
    expect(entity.equals(undefined)).toBe(false);
  });
});
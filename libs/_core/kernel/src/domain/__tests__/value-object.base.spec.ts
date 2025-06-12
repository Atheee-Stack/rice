// libs/_core/kernel/src/domain/__tests__/value-object.base.spec.ts

import { ValueObject } from '../value-object.base';

// 测试用值对象实现
class TestValueObject extends ValueObject<{ value: string }> {
  protected validate(props: { value: string }): { value: string } {
    if (!props.value || props.value.length < 3) {
      throw new Error('Value must be at least 3 characters long');
    }
    return props;
  }
}

// 嵌套值对象测试
class NestedValueObject extends ValueObject<{ nested: TestValueObject }> {
  protected validate(props: { nested: TestValueObject }): { nested: TestValueObject } {
    if (!ValueObject.isValueObject(props.nested)) {
      throw new Error('Nested must be a ValueObject');
    }
    return props;
  }
}

describe('ValueObject', () => {
  describe('基础功能', () => {
    it('应该成功创建有效的值对象', () => {
      const vo = new TestValueObject({ value: 'valid' });
      expect(vo.getProps()).toEqual({ value: 'valid' });
    });

    it('创建时应调用验证逻辑', () => {
      expect(() => new TestValueObject({ value: 'a' }))
        .toThrow('Value must be at least 3 characters long');
    });
  });

  describe('不可变性', () => {
    it('创建后属性应该不可变', () => {
      const vo = new TestValueObject({ value: 'immutable' });
      const props = vo.getProps();

      // 使用类型断言绕过只读检查进行测试
      expect(() => { (props as { value: string }).value = 'modified'; }).toThrow();
      expect(vo.getProps().value).toBe('immutable');
    });
  });

  describe('相等性比较', () => {
    it('相同属性应该相等', () => {
      const vo1 = new TestValueObject({ value: 'test' });
      const vo2 = new TestValueObject({ value: 'test' });
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('不同属性应该不等', () => {
      const vo1 = new TestValueObject({ value: 'test1' });
      const vo2 = new TestValueObject({ value: 'test2' });
      expect(vo1.equals(vo2)).toBe(false);
    });

    it('null/undefined 应该不等', () => {
      const vo = new TestValueObject({ value: 'test' });
      expect(vo.equals(undefined)).toBe(false);
    });
  });

  describe('嵌套值对象', () => {
    it('应该支持嵌套值对象', () => {
      const nested = new TestValueObject({ value: 'nested' });
      const wrapper = new NestedValueObject({ nested });

      expect(wrapper.getProps().nested.equals(nested)).toBe(true);
    });

    it('应该验证嵌套值对象类型', () => {
      const invalidInput = { nested: { value: 'invalid' } };
      expect(() => new NestedValueObject(invalidInput as unknown as { nested: TestValueObject }))
        .toThrow('Nested must be a ValueObject');
    });
  });

  describe('静态方法', () => {
    it('isValueObject 应该正确识别值对象', () => {
      const vo = new TestValueObject({ value: 'test' });
      expect(ValueObject.isValueObject(vo)).toBe(true);
      expect(ValueObject.isValueObject({})).toBe(false);
      expect(ValueObject.isValueObject(null)).toBe(false);
    });
  });

  describe('边缘情况', () => {
    it('应该处理空对象', () => {
      class EmptyVO extends ValueObject<Record<string, never>> {
        protected validate(props: Record<string, never>): Record<string, never> {
          return props;
        }
      }

      expect(() => new EmptyVO({})).not.toThrow();
    });

    it('应该处理数组属性', () => {
      class ArrayVO extends ValueObject<{ items: TestValueObject[] }> {
        protected validate(props: { items: TestValueObject[] }): { items: TestValueObject[] } {
          if (!props.items.every(item => ValueObject.isValueObject(item))) {
            throw new Error('All items must be ValueObjects');
          }
          return props;
        }
      }

      const items = [
        new TestValueObject({ value: 'item1' }),
        new TestValueObject({ value: 'item2' })
      ];

      const vo = new ArrayVO({ items });
      expect(vo.getProps().items.length).toBe(2);
    });
  });
});
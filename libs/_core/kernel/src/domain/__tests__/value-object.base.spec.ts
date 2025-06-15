import { ValueObject, validationPipe, ValueType, valueObjectPipe } from '../value-object.base';
import { SpecSchema } from '../../utils/spec-validator.util';
import { primitiveHash } from '../../utils/primitive.util';

// 测试用值对象实现
class TestValueObject extends ValueObject<string> {
  public constructor(value: string) {
    super(value);
  }

  protected getSpec(): SpecSchema {
    return {
      schema: {
        type: 'string',
        minLength: 3,
        maxLength: 10
      },
      transform: ['trim'],
      messages: {
        minLength: 'Minimum length is 3'
      }
    };
  }
}

// 复杂值对象实现
class ComplexValueObject extends ValueObject<{ id: number; name: string }> {
  public constructor(value: { id: number; name: string }) {
    super(value);
  }

  protected getSpec(): SpecSchema {
    return {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'number', minimum: 1 },
          name: { type: 'string', minLength: 2 }
        },
        required: ['id', 'name']
      }
    };
  }
}

// 原始类型值对象实现
class PrimitiveValueObject extends ValueObject<number> {
  public constructor(value: number) {
    super(value);
  }

  protected getSpec(): SpecSchema {
    return {
      schema: {
        type: 'number',
        minimum: 0
      }
    };
  }
}

describe('ValueObject', () => {
  describe('静态方法', () => {
    describe('create', () => {
      it('应该成功创建值对象', () => {
        const result = TestValueObject.create(' valid ');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('valid');
      });

      it('应该应用转换规则', () => {
        const result = TestValueObject.create('  trimmed  ');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('trimmed');
      });

      it('应该返回错误当验证失败', () => {
        const result = TestValueObject.create('a');
        expect(result.isFail()).toBe(true);
        expect(result.unwrapErr().message).toContain('Minimum length is 3');
      });

      it('应该支持复杂对象', () => {
        const result = ComplexValueObject.create({ id: 1, name: 'Test' });
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toEqual({ id: 1, name: 'Test' });
      });

      it('应该返回错误当复杂对象验证失败', () => {
        const result = ComplexValueObject.create({ id: 0, name: 'T' });
        expect(result.isFail()).toBe(true);
        expect(result.unwrapErr().message).toContain('最小值为 1');
      });
    });

    describe('createAsync', () => {
      it('应该异步创建值对象', async () => {
        const result = await TestValueObject.createAsync(' valid ');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('valid');
      });
    });

    describe('curriedCreate', () => {
      it('应该柯里化创建函数', () => {
        const createFn = TestValueObject.curriedCreate();
        const result = createFn('test');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('test');
      });
    });
  });

  describe('实例方法', () => {
    let vo: TestValueObject;

    beforeEach(() => {
      vo = new TestValueObject('test');
    });

    it('应该正确返回值', () => {
      expect(vo.value).toBe('test');
    });

    it('应该实现深度冻结', () => {
      const complexVo = new ComplexValueObject({ id: 1, name: 'Test' });
      expect(Object.isFrozen(complexVo.value)).toBe(true);
      expect(() => {
        // @ts-expect-error 测试不可变性
        complexVo.value.id = 2;
      }).toThrow();
    });

    describe('equals', () => {
      it('应该相等当值相同', () => {
        const vo2 = new TestValueObject('test');
        expect(vo.equals(vo2)).toBe(true);
      });

      it('应该不相等当值不同', () => {
        const vo2 = new TestValueObject('different');
        expect(vo.equals(vo2)).toBe(false);
      });

      it('应该处理原始类型', () => {
        const vo1 = new PrimitiveValueObject(5);
        const vo2 = new PrimitiveValueObject(5);
        const vo3 = new PrimitiveValueObject(10);
        expect(vo1.equals(vo2)).toBe(true);
        expect(vo1.equals(vo3)).toBe(false);
      });

      it('应该处理复杂对象', () => {
        const vo1 = new ComplexValueObject({ id: 1, name: 'Test' });
        const vo2 = new ComplexValueObject({ id: 1, name: 'Test' });
        const vo3 = new ComplexValueObject({ id: 2, name: 'Test' });
        expect(vo1.equals(vo2)).toBe(true);
        expect(vo1.equals(vo3)).toBe(false);
      });
    });

    describe('hashCode', () => {
      it('应该为相同值生成相同哈希', () => {
        const vo1 = new TestValueObject('test');
        const vo2 = new TestValueObject('test');
        expect(vo1.hashCode()).toBe(vo2.hashCode());
      });

      it('应该为不同值生成不同哈希', () => {
        const vo1 = new TestValueObject('test');
        const vo2 = new TestValueObject('different');
        expect(vo1.hashCode()).not.toBe(vo2.hashCode());
      });

      it('应该处理原始类型', () => {
        const vo1 = new PrimitiveValueObject(5);
        expect(primitiveHash(5)).toBe(vo1.hashCode());
      });

      it('应该处理复杂对象', () => {
        const vo1 = new ComplexValueObject({ id: 1, name: 'Test' });
        expect(vo1.hashCode()).toBe(primitiveHash(JSON.stringify({ id: 1, name: 'Test' })));
      });
    });

    describe('compare', () => {
      it('应该正确比较值对象', () => {
        const vo1 = new PrimitiveValueObject(5);
        const vo2 = new PrimitiveValueObject(10);
        expect(vo1.compare(vo2)).toBeLessThan(0);
        expect(vo2.compare(vo1)).toBeGreaterThan(0);
        expect(vo1.compare(vo1)).toBe(0);
      });
    });

    describe('map', () => {
      it('应该映射到新值对象', () => {
        const mapped = vo.map(value => value.toUpperCase());
        expect(mapped.value).toBe('TEST');
        expect(mapped).toBeInstanceOf(TestValueObject);
      });
    });

    describe('filter', () => {
      it('应该返回自身当条件满足', () => {
        const result = vo.filter(value => value.length > 0);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(vo);
      });

      it('应该返回错误当条件不满足', () => {
        const result = vo.filter(value => value.length > 10);
        expect(result.isFail()).toBe(true);
      });
    });

    describe('pipe', () => {
      it('应该应用管道转换', () => {
        const piped = vo.pipe(
          value => value.toUpperCase(),
          value => value + '!'
        );
        expect(piped.value).toBe('TEST!');
      });

      it('应该处理空管道', () => {
        const piped = vo.pipe();
        expect(piped).toBe(vo);
      });
    });

    describe('asyncPipe', () => {
      it('应该异步应用管道转换', async () => {
        const piped = await vo.asyncPipe(
          async value => value.toUpperCase(),
          async value => new Promise(resolve => setTimeout(() => resolve(value + '!'), 10))
        );
        expect(piped.value).toBe('TEST!');
      });
    });

    describe('toJSON', () => {
      it('应该返回原始值', () => {
        expect(vo.toJSON()).toBe('test');
      });

      it('应该处理复杂对象', () => {
        const complexVo = new ComplexValueObject({ id: 1, name: 'Test' });
        expect(complexVo.toJSON()).toEqual({ id: 1, name: 'Test' });
      });
    });

    describe('toString', () => {
      it('应该返回字符串表示', () => {
        expect(vo.toString()).toBe('test');
      });
    });
  });

  describe('工具函数', () => {
    describe('validationPipe', () => {
      it('应该创建验证管道', () => {
        const spec: SpecSchema = {
          schema: {
            type: 'string',
            minLength: 3
          }
        };

        const pipe = validationPipe<string>(spec);
        const validResult = pipe('valid');
        const invalidResult = pipe('a');

        expect(validResult.isOk()).toBe(true);
        expect(validResult.unwrap()).toBe('valid');

        expect(invalidResult.isFail()).toBe(true);
      });
    });

    describe('valueObjectPipe', () => {
      it('应该创建值对象管道', () => {
        const pipeFn = valueObjectPipe<string>(
          (value: string) => value.toUpperCase(),
          (value: string) => value + '!'
        );

        const vo = new TestValueObject('test');
        const piped = pipeFn(vo);
        expect(piped.value).toBe('TEST!');
      });
    });
  });

  describe('类型工具', () => {
    it('ValueType 应该提取值类型', () => {
      type TestVOType = ValueType<TestValueObject>;
      // @ts-expect-error 测试类型推断 - 应该报错因为赋值为number
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const test: TestVOType = 123;
      // 不需要实际使用test变量
    });
  });
});
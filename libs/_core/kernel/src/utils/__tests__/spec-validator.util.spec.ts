import { SpecValidator } from '../spec-validator.util';
import type { SpecSchema } from '../spec-validator.util';

describe('SpecValidator', () => {
  let validator: SpecValidator;

  beforeEach(() => {
    validator = new SpecValidator();
  });

  describe('normalize method', () => {
    test('should apply string transformations', () => {
      const transforms: SpecSchema['transform'] = [
        'trim',
        'toUpperCase',
        'trimStart',
        'trimEnd'
      ];

      // 空格处理
      expect(validator.normalize('  test  ', transforms)).toBe('TEST');

      // 大小写转换
      expect(validator.normalize('HeLLo', ['toLowerCase'])).toBe('hello');
      expect(validator.normalize('world', ['toUpperCase'])).toBe('WORLD');
    });

    test('should handle date transformations', () => {
      const date = new Date('2023-01-01T00:00:00Z');

      // ISO 格式转换
      expect(validator.normalize(date, ['toISOString'])).toBe('2023-01-01T00:00:00.000Z');

      // 字符串日期转换
      expect(validator.normalize('2023-01-01', ['toISOString'])).toBe('2023-01-01T00:00:00.000Z');

      // 本地化格式
      expect(typeof validator.normalize(date, ['toLocaleString'])).toBe('string');
    });

    test('should handle numeric transformations', () => {
      // 整型转换
      expect(validator.normalize('42', ['parseInt'])).toBe(42);
      expect(validator.normalize('3.14', ['parseInt'])).toBe(3);

      // 浮点转换
      expect(validator.normalize('3.14', ['parseFloat'])).toBe(3.14);
      expect(validator.normalize('10.5px', ['parseFloat'])).toBe(10.5);

      // 无效数字处理
      expect(validator.normalize('abc', ['parseInt'])).toBe('abc');
    });

    test('should ignore transformations when disabled', () => {
      const value = '  TEST  ';
      const transforms: SpecSchema['transform'] = ['trim', 'toLowerCase'];

      // 禁用转换
      expect(validator.normalize(value, transforms, false)).toBe(value);
    });

    test('should handle invalid transformations safely', () => {
      // 对非字符串应用字符串转换
      expect(validator.normalize(42, ['trim'])).toBe(42);

      // 对非日期应用日期转换
      expect(validator.normalize({}, ['toISOString'])).toEqual({});
    });
  });

  describe('validate method', () => {
    const stringSchema: SpecSchema = {
      schema: {
        type: 'string',
        minLength: 3,
        maxLength: 10
      }
    };

    test('should validate primitive types', () => {
      // 有效字符串
      const validResult = validator.validate('test', stringSchema);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toEqual([]);

      // 无效字符串（过短）
      const shortResult = validator.validate('a', stringSchema);
      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors).toContain('长度至少为 3 字符');

      // 无效字符串（过长）
      const longResult = validator.validate('this-is-too-long', stringSchema);
      expect(longResult.valid).toBe(false);
      expect(longResult.errors).toContain('长度不可超过 10 字符');
    });

    test('should apply transformations before validation', () => {
      const schemaWithTransform: SpecSchema = {
        ...stringSchema,
        transform: ['trim', 'toLowerCase']
      };

      // 带空格的输入
      const result = validator.validate('  TEST  ', schemaWithTransform);
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('test');
    });

    test('should validate complex objects', () => {
      const userSchema: SpecSchema = {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 2 },
            age: { type: 'integer', minimum: 18 }
          },
          required: ['id', 'name']
        }
      };

      // 有效用户对象
      const validUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John',
        age: 30
      };

      const validationResult = validator.validate(validUser, userSchema);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.normalized).toEqual(validUser);
      expect(validationResult.errors).toEqual([]);

      // 无效用户对象（缺少必需字段）
      const invalidUser = { name: 'A' };
      const result = validator.validate(invalidUser, userSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('缺少必需属性：id');
      expect(result.errors).toContain('长度至少为 2 字符');
    });

    test('should handle custom error messages', () => {
      const schemaWithMessages: SpecSchema = {
        schema: {
          type: 'number',
          minimum: 18
        },
        messages: {
          type: '必须是数字',
          minimum: '年龄必须满18岁'
        }
      };

      // 类型错误
      const typeErrorResult = validator.validate('text', schemaWithMessages);
      expect(typeErrorResult.errors).toEqual(['必须是数字']);

      // 最小值错误
      const minErrorResult = validator.validate(16, schemaWithMessages);
      expect(minErrorResult.errors).toEqual(['年龄必须满18岁']);
    });

    test('should handle nested property errors', () => {
      const nestedSchema: SpecSchema = {
        schema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' }
              }
            }
          }
        },
        messages: {
          'user.email.format': '无效的邮箱格式'
        }
      };

      const invalidData = {
        user: { email: 'invalid-email' }
      };

      const result = validator.validate(invalidData, nestedSchema);
      expect(result.errors).toContain('无效的邮箱格式');
    });

    test('should handle validation errors', () => {
      // 无效模式会导致异常
      const invalidSchema = {
        schema: {
          type: 'invalid-type'
        }
      } as unknown as SpecSchema;

      const result = validator.validate({}, invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['数据校验过程异常']);
    });
  });

  describe('custom formats', () => {
    test('should validate username format', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'string',
          format: 'username'
        }
      };

      // 有效用户名
      expect(validator.validate('user_123', schema).valid).toBe(true);

      // 无效用户名（过短）
      expect(validator.validate('ab', schema).valid).toBe(false);

      // 无效用户名（非法字符）
      expect(validator.validate('user@name', schema).valid).toBe(false);
    });

    test('should validate password format', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'string',
          format: 'password'
        }
      };

      // 有效密码
      expect(validator.validate('Passw0rd!', schema).valid).toBe(true);

      // 无效密码（缺少大写）
      expect(validator.validate('passw0rd!', schema).valid).toBe(false);

      // 无效密码（缺少特殊字符）
      expect(validator.validate('Passw0rd', schema).valid).toBe(false);
    });

    test('should validate UUID format', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'string',
          format: 'uuid'
        }
      };

      // 有效 UUID
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(validator.validate(validUUID, schema).valid).toBe(true);

      // 无效 UUID
      expect(validator.validate('invalid-uuid', schema).valid).toBe(false);
    });

    test('should validate objectId format', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'string',
          format: 'objectId'
        }
      };

      // 有效 objectId
      const validObjectId = '507f1f77bcf86cd799439011';
      expect(validator.validate(validObjectId, schema).valid).toBe(true);

      // 无效 objectId（长度不足）
      expect(validator.validate('507f1f77bcf86cd7994390', schema).valid).toBe(false);
    });
  });

  describe('error message generation', () => {
    test('should use path-specific custom messages', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'object',
          properties: {
            username: { type: 'string', minLength: 3 }
          }
        },
        messages: {
          'username.minLength': '用户名至少需要3个字符'
        }
      };

      const result = validator.validate({ username: 'ab' }, schema);
      expect(result.errors).toContain('用户名至少需要3个字符');
    });

    test('should use keyword-specific custom messages', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'string',
          minLength: 5
        },
        messages: {
          minLength: '最小长度必须为5字符'
        }
      };

      const result = validator.validate('abc', schema);
      expect(result.errors).toContain('最小长度必须为5字符');
    });

    test('should generate custom messages for uniqueItems keyword', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'array',
          uniqueItems: true
        }
      };

      const result = validator.validate([1, 1], schema);
      expect(result.errors[0]).toBe('数组元素不能重复');
    });

    test('should generate custom messages for additionalProperties keyword', () => {
      // 创建特定配置的验证器（关闭属性移除）
      const customValidator = new SpecValidator({ removeAdditional: false });

      const schema: SpecSchema = {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' }
          }
        }
      };

      const result = customValidator.validate({ name: 'John', age: 30 }, schema);

      // 验证错误消息存在
      expect(result.errors.length).toBeGreaterThan(0);

      // 检查错误消息内容
      if (result.errors.length > 0) {
        expect(result.errors[0]).toContain('不允许的额外属性');
        expect(result.errors[0]).toContain('age');
      }
    });

    test('should generate custom messages for pattern keyword', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'string',
          pattern: '^[a-z]+$'
        }
      };

      const result = validator.validate('ABC', schema);
      expect(result.errors[0]).toBe('格式不符合要求');
    });

    test('should handle unsupported keywords gracefully', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'invalid-type' as any, // 故意使用无效类型
            }
          }
        }
      };

      const result = validator.validate({ name: 'John' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['数据校验过程异常']);
    });
  });
});
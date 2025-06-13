// rice/libs/_core/kernel/src/utils/__tests__/spec-validator.util.spec.ts
import { SpecValidator } from '../spec-validator.util';
import type { SpecSchema, SpecTransform, ValidationResult } from '../spec-validator.util';
import type { SchemaObject } from '../spec-validator.util';

/**
 * SpecValidator unit tests
 * @domain Core
 */
describe('SpecValidator', () => {
  let validator: SpecValidator;

  beforeEach(() => {
    validator = new SpecValidator();
  });

  describe('Basic Validation', () => {
    it('should validate simple schema', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          },
          required: ['name']
        }
      };

      // 有效输入
      const validInput = { name: 'John', age: 30 };
      const result = validator.validate(validInput, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);

      // 无效输入 - 缺少必要字段
      const missingFieldInput = {};
      const missingFieldResult = validator.validate(missingFieldInput, schema);
      expect(missingFieldResult.valid).toBe(false);
      expect(missingFieldResult.errors).toContain("Value requires property 'name'");

      // 无效输入 - 类型错误
      const invalidTypeInput = { name: 'John', age: 'thirty' };
      const invalidTypeResult = validator.validate(invalidTypeInput, schema);
      expect(invalidTypeResult.valid).toBe(false);
      expect(invalidTypeResult.errors).toContain('Value at \'/age\' should be number');
    });
  });

  describe('Transformation', () => {
    it('should apply trim transformation', () => {
      const schema: SpecSchema = {
        schema: { type: 'string' },
        transform: ['trim']
      };

      const input = '  test  ';
      const result = validator.validate(input, schema) as ValidationResult<string>;

      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('test');
    });

    it('should parse numeric strings', () => {
      const schema: SpecSchema = {
        schema: { type: 'number' },
        transform: ['parseInt']
      };

      const input = '42';
      const result = validator.validate(input, schema) as ValidationResult<number>;

      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(42);
    });

    it('should handle date conversions', () => {
      const schema: SpecSchema = {
        schema: { type: 'string', format: 'date-time' },
        transform: ['toISOString']
      };

      const date = new Date('2023-01-01');
      const result = validator.validate(date, schema) as ValidationResult<string>;

      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(date.toISOString());
    });

    it('should skip transformations when disabled', () => {
      const schema: SpecSchema = {
        schema: { type: 'string' },
        transform: ['trim']
      };

      const input = '  test  ';
      const result = validator.validate(input, schema, { applyTransformations: false });

      expect(result.normalized).toBe(input);
    });
  });

  describe('Custom Formats', () => {
    it('should validate username format', () => {
      const schema: SpecSchema = {
        schema: { type: 'string', format: 'username' }
      };

      // 有效用户名
      expect(validator.validate('valid_username-123', schema).valid).toBe(true);
      expect(validator.validate('abc', schema).valid).toBe(true); // 3字符（最小长度）
      expect(validator.validate('user-123'.repeat(3), schema).valid).toBe(true); // 24字符（最大长度）

      // 无效用户名
      expect(validator.validate('ab', schema).valid).toBe(false); // Too short (2字符)
      expect(validator.validate('user'.repeat(10), schema).valid).toBe(false); // Too long (40字符)
      expect(validator.validate('invalid!username', schema).valid).toBe(false); // Invalid char
    });
  });

  describe('Error Handling', () => {
    it('should return custom error messages', () => {
      const schema: SpecSchema = {
        schema: {
          type: 'object',
          properties: { email: { type: 'string', format: 'email' } },
          required: ['email']
        },
        messages: {
          required: 'Field is required',
          format: 'Invalid email format'
        }
      };

      const result = validator.validate({}, schema);

      expect(result.errors).toContain('Field is required');
      expect(validator.validate({ email: 'invalid' }, schema).errors).toContain('Invalid email format');
    });

    it('should handle schema compilation errors', () => {
      // 安全类型转换替代 any
      const invalidSchema = {
        type: 'invalid-type'
      } as unknown as SchemaObject;

      const spec: SpecSchema = {
        schema: invalidSchema
      };

      const result = validator.validate('test', spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Schema validation failed']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transformations', () => {
      const schema: SpecSchema = {
        schema: { type: 'string' },
        transform: []
      };

      const input = 'test';
      const result = validator.validate(input, schema);

      expect(result.normalized).toBe(input);
    });

    it('should handle invalid transformations gracefully', () => {
      const schema: SpecSchema = {
        schema: { type: 'string' },
        transform: ['parseInt' as SpecTransform] // Applied to string
      };

      const input = 'non-number';
      const result = validator.validate(input, schema);

      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(input); // No transformation applied
    });
  });
});
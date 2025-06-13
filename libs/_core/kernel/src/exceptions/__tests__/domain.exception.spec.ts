// libs/_core/kernel/src/exceptions/__tests__/domain.exception.spec.ts
import { DomainException } from '../domain.exception';

// 测试用领域异常实现
class TestDomainException extends DomainException {
  constructor(
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super('TEST_ERROR', message, metadata);
  }
}

describe('DomainException', () => {
  describe('基础功能', () => {
    it('应该正确创建领域异常', () => {
      const exception = new TestDomainException('Test error');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(DomainException);
      expect(exception.code).toBe('TEST_ERROR');
      expect(exception.message).toBe('Test error');
      expect(exception.name).toBe('TestDomainException');
      expect(exception.stack).toBeDefined();
    });

    it('应该包含元数据', () => {
      const metadata = { key: 'value', count: 42 };
      const exception = new TestDomainException('Test error', metadata);

      expect(exception.metadata).toEqual(metadata);
    });
  });

  describe('toJSON()', () => {
    it('应该返回正确的JSON表示', () => {
      const metadata = { userId: '123' };
      const exception = new TestDomainException('Test error', metadata);
      const json = exception.toJSON();

      expect(json).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        metadata: { userId: '123' },
        stack: exception.stack
      });
    });

    it('没有元数据时应省略metadata字段', () => {
      const exception = new TestDomainException('Test error');
      const json = exception.toJSON();

      expect(json).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        stack: exception.stack
      });
      expect(json).not.toHaveProperty('metadata');
    });
  });

  describe('继承行为', () => {
    it('自定义异常类应保持正确的名称', () => {
      class CustomException extends DomainException {
        constructor() {
          super('CUSTOM_CODE', 'Custom message');
        }
      }

      const exception = new CustomException();
      expect(exception.name).toBe('CustomException');
    });
  });

  describe('错误堆栈', () => {
    it('应该包含有用的堆栈信息', () => {
      const exception = new TestDomainException('Test error');

      expect(exception.stack).toContain('TestDomainException');
      expect(exception.stack).toContain('domain.exception.spec.ts');
    });
  });
});
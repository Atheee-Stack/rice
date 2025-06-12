import { ErrorCodes, ErrorCode } from "../error.codes";

describe('ErrorCodes', () => {
  // ------------------------------
  // 1. 测试错误码值正确性
  // ------------------------------
  it('should have correct error code values', () => {
    // 通用错误
    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');

    // 领域特定错误
    expect(ErrorCodes.AGGREGATE_INVALID_STATE).toBe('AGGREGATE_INVALID_STATE');
    expect(ErrorCodes.ENTITY_ALREADY_EXISTS).toBe('ENTITY_ALREADY_EXISTS');
    expect(ErrorCodes.VALUE_OBJECT_INVALID).toBe('VALUE_OBJECT_INVALID');
    expect(ErrorCodes.DOMAIN_RULE_VIOLATION).toBe('DOMAIN_RULE_VIOLATION');
    expect(ErrorCodes.REPOSITORY_ERROR).toBe('REPOSITORY_ERROR');
    expect(ErrorCodes.TRANSACTION_FAILED).toBe('TRANSACTION_FAILED');
  });

  // ------------------------------
  // 2. 测试运行时不可变性
  // ------------------------------
  it('should be frozen at runtime (immutable)', () => {
    // 验证对象被冻结（运行时不可修改）
    expect(Object.isFrozen(ErrorCodes)).toBe(true);

    // 尝试修改属性（应抛出错误，严格模式下）
    const originalBadRequest = ErrorCodes.BAD_REQUEST;
    expect(() => {
      (ErrorCodes as any).BAD_REQUEST = 'NEW_CODE'; // 类型断言绕过 TS 检查
    }).toThrow(TypeError); // 严格模式下修改只读属性会抛错

    // 验证修改未生效（值仍为原始值）
    expect(ErrorCodes.BAD_REQUEST).toBe(originalBadRequest);

    // 尝试删除属性（应抛出错误）
    expect(() => {
      delete (ErrorCodes as any).BAD_REQUEST;
    }).toThrow(TypeError);
  });

  // ------------------------------
  // 3. 测试类型约束（TypeScript 类型安全）
  // ------------------------------
  it('should enforce ErrorCode type constraints', () => {
    // 有效错误码：应通过类型检查
    const validCode: ErrorCode = ErrorCodes.BAD_REQUEST;
    expect(validCode).toBe('BAD_REQUEST');

    // 无效错误码：TypeScript 编译时应报错（此处通过类型断言模拟）
    // @ts-expect-error 故意使用无效错误码，验证类型约束
    const invalidCode: ErrorCode = 'INVALID_CODE';
    // 上一行应触发 TypeScript 编译错误（"不能将类型“"INVALID_CODE"”分配给类型“ErrorCode”"）
  });

  // ------------------------------
  // 4. 测试 ErrorCode 类型覆盖所有预定义错误码
  // ------------------------------
  it('should have ErrorCode as union of all ErrorCodes values', () => {
    // 验证 ErrorCode 类型包含所有预定义错误码
    type ExpectedErrorCode =
      | 'BAD_REQUEST'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'INTERNAL_ERROR'
      | 'VALIDATION_FAILED'
      | 'AGGREGATE_INVALID_STATE'
      | 'ENTITY_ALREADY_EXISTS'
      | 'VALUE_OBJECT_INVALID'
      | 'DOMAIN_RULE_VIOLATION'
      | 'REPOSITORY_ERROR'
      | 'TRANSACTION_FAILED';

    // 通过类型断言验证类型一致性（需确保 ErrorCodes 未被修改）
    expectType<ExpectedErrorCode, ErrorCode>();
  });
});

// 辅助函数：验证两个类型是否一致（需安装 @types/jest 和 ts-jest）
function expectType<A, B>() {
  // @ts-expect-error 内部使用，仅用于类型检查
  const a: A = null as unknown as B;
  // @ts-expect-error 内部使用，仅用于类型检查
  const b: B = null as unknown as A;
}
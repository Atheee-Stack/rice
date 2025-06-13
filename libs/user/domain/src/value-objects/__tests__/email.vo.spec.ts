// rice/libs/user/domain/src/value-objects/email.vo.spec.ts

import { CryptoUtils } from '@rice/core-kernel';
import { describe, test, expect, beforeEach } from '@jest/globals';
import { EmailVO } from '../email.vo';

// 模拟 CryptoUtils 避免实际加密操作
jest.mock('@rice/core-kernel', () => ({
  ...jest.requireActual('@rice/core-kernel'),
  CryptoUtils: {
    generateHash: jest.fn().mockImplementation((data: string) => `hashed_${data}`)
  }
}));

describe('EmailVO', () => {
  const validEmail = 'user@example.com';
  const validEmailWithSpaces = '  User@Example.Com  ';
  const invalidEmail = 'invalid-email';
  const emailWithInvalidDomain = 'user@invalid.com';
  const allowedDomains = ['example.com', 'acme.org'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('创建有效的邮箱值对象', () => {
    // Act
    const result = EmailVO.create(validEmail);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('user@example.com');
  });

  test('自动规范化邮箱地址', () => {
    // Act
    const result = EmailVO.create(validEmailWithSpaces);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('user@example.com');
  });

  test('拒绝无效格式的邮箱', () => {
    // Act
    const result = EmailVO.create(invalidEmail);

    // Assert
    expect(result.isFail()).toBe(true);
    expect(result.unwrapErr().message).toBe('Invalid email format: invalid-email');
  });

  test('允许在有效域名列表中创建', () => {
    // Act
    const result = EmailVO.create(validEmail, allowedDomains);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('user@example.com');
  });

  test('拒绝不在域名白名单中的邮箱', () => {
    // Act
    const result = EmailVO.create(emailWithInvalidDomain, allowedDomains);

    // Assert
    expect(result.isFail()).toBe(true);
    expect(result.unwrapErr().message).toBe('Domain not allowed: invalid.com');
  });

  test('相等性比较：相同值返回 true', () => {
    // Arrange
    const email1 = EmailVO.create(validEmail).unwrap();
    const email2 = EmailVO.create(validEmailWithSpaces).unwrap();

    // Act & Assert
    expect(email1.equals(email2)).toBe(true);
  });

  test('相等性比较：不同值返回 false', () => {
    // Arrange
    const email1 = EmailVO.create(validEmail).unwrap();
    const email2 = EmailVO.create('another@example.com').unwrap();

    // Act & Assert
    expect(email1.equals(email2)).toBe(false);
  });

  test('相等性比较：不同类型返回 false', () => {
    // Arrange
    const email = EmailVO.create(validEmail).unwrap();
    const otherObject = { value: validEmail } as any;

    // Act & Assert
    expect(email.equals(otherObject)).toBe(false);
  });

  test('生成邮箱哈希值', () => {
    // Arrange
    const email = EmailVO.create(validEmail).unwrap();

    // Act
    const hash = email.getHash();

    // Assert
    expect(CryptoUtils.generateHash).toHaveBeenCalledWith('user@example.com', undefined);
    expect(hash).toBe('hashed_user@example.com');
  });

  test('生成带盐的邮箱哈希值', () => {
    // Arrange
    const email = EmailVO.create(validEmail).unwrap();
    const salt = 'random-salt';

    // Act
    const hash = email.getHash(salt);

    // Assert
    expect(CryptoUtils.generateHash).toHaveBeenCalledWith('user@example.com', salt);
    expect(hash).toBe('hashed_user@example.com');
  });

  test('静态验证方法：有效邮箱返回 true', () => {
    // Act & Assert
    expect(EmailVO.isValidFormat(validEmail)).toBe(true);
  });

  test('静态验证方法：无效邮箱返回 false', () => {
    // Act & Assert
    expect(EmailVO.isValidFormat(invalidEmail)).toBe(false);
  });

  test('构造无效邮箱时抛出异常', () => {
    // Act & Assert
    expect(() => new EmailVO({ value: invalidEmail }))
      .toThrow('Invalid email format: invalid-email');
  });

  test('返回规范化的邮箱属性', () => {
    // Arrange
    const email = EmailVO.create(validEmailWithSpaces).unwrap();

    // Act & Assert
    expect(email.value).toBe('user@example.com');
  });
});
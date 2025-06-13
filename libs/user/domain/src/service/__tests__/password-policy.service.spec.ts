import {
  PasswordPolicyService,
  combinePasswordPolicies,
  calculatePasswordStrength,
  toDomainException,
  PasswordPolicyConfig,
  PasswordValidationError
} from '../password-policy.service';
import { DomainException } from '@rice/core-kernel';
import { Result } from '@rice/core-kernel';

describe('PasswordPolicyService', () => {
  const defaultConfig: PasswordPolicyConfig = {
    minLength: 8,
    maxLength: 64,
    requireDigit: true,
    requireUppercase: true,
    requireLowercase: true,
    requireSpecialChar: true,
    maxConsecutiveRepeats: 2,
    disallowCommonPasswords: true
  };

  const policy = PasswordPolicyService.create(defaultConfig);

  // 改进的错误结果断言辅助函数
  function expectError(
    result: Result<void, PasswordValidationError>,
    expectedCode: string
  ) {
    expect(result.isOk()).toBe(false);

    if (result.isOk()) return;

    expect(result.error.code).toBe(expectedCode);
    return result.error;
  }

  describe('length validation', () => {
    it('should accept password with minimum length', () => {
      const password = 'a'.repeat(defaultConfig.minLength);
      const result = policy.validate(password);
      expect(result.isOk()).toBe(true);
    });

    it('should reject too short password', () => {
      const password = 'a'.repeat(defaultConfig.minLength - 1);
      const result = policy.validate(password); // 修复：调用validate并保存结果
      const error = expectError(result, 'PASSWORD_TOO_SHORT');

      expect(error?.details?.minLength).toBe(defaultConfig.minLength);
      expect(error?.details?.actualLength).toBe(password.length);
    });

    it('should accept password with maximum length', () => {
      const password = 'a'.repeat(defaultConfig.maxLength);
      const result = policy.validate(password);
      expect(result.isOk()).toBe(true);
    });

    it('should reject too long password', () => {
      const password = 'a'.repeat(defaultConfig.maxLength + 1);
      const result = policy.validate(password); // 修复：调用validate并保存结果
      const error = expectError(result, 'PASSWORD_TOO_LONG');

      expect(error?.details?.maxLength).toBe(defaultConfig.maxLength);
      expect(error?.details?.actualLength).toBe(password.length);
    });
  });

  describe('character type validation', () => {
    const testCases = [
      {
        name: 'missing digit',
        password: 'Abcdefg!',
        expectedCode: 'PASSWORD_MISSING_DIGIT',
        config: { ...defaultConfig, requireDigit: true }
      },
      {
        name: 'missing uppercase',
        password: 'abcdefg1!',
        expectedCode: 'PASSWORD_MISSING_UPPERCASE',
        config: { ...defaultConfig, requireUppercase: true }
      },
      {
        name: 'missing lowercase',
        password: 'ABCDEFG1!',
        expectedCode: 'PASSWORD_MISSING_LOWERCASE',
        config: { ...defaultConfig, requireLowercase: true }
      },
      {
        name: 'missing special char',
        password: 'Abcdefg1',
        expectedCode: 'PASSWORD_MISSING_SPECIAL_CHAR',
        config: { ...defaultConfig, requireSpecialChar: true }
      },
    ];

    testCases.forEach(({ name, password, expectedCode, config }) => {
      it(`should detect ${name}`, () => {
        const customPolicy = PasswordPolicyService.create(config);
        const result = customPolicy.validate(password);
        expectError(result, expectedCode);
      });
    });

    it('should accept valid password with all character types', () => {
      const password = 'ValidPass123!';
      const result = policy.validate(password);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('consecutive repeat validation', () => {
    it('should accept password without consecutive repeats', () => {
      const password = 'Aa1!Bb2@';
      const result = policy.validate(password);
      expect(result.isOk()).toBe(true);
    });

    it('should reject password with too many consecutive repeats', () => {
      const password = 'Aaaa1!'; // 4 consecutive 'a's when max is 2
      const result = policy.validate(password);
      const error = expectError(result, 'PASSWORD_CONSECUTIVE_REPEATS');

      expect(error?.details?.maxConsecutiveRepeats).toBe(defaultConfig.maxConsecutiveRepeats);
      expect(error?.details?.character).toBe('a');
    });

    it('should allow consecutive repeats when config disables check', () => {
      const customPolicy = PasswordPolicyService.create({
        ...defaultConfig,
        maxConsecutiveRepeats: 0
      });

      const password = 'AAAAA';
      const result = customPolicy.validate(password);
      expect(result.isOk()).toBe(true);
    });

    it('should handle repeats at end of password', () => {
      const password = 'abcdeee'; // 3 e's
      const result = policy.validate(password);
      const error = expectError(result, 'PASSWORD_CONSECUTIVE_REPEATS');
      expect(error?.details?.position).toBe(6);
    });
  });

  describe('common password check', () => {
    it('should reject common passwords', () => {
      const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];

      commonPasswords.forEach(password => {
        const result = policy.validate(password);
        const error = expectError(result, 'PASSWORD_TOO_COMMON');
        expect(error?.details?.disallowed).toBe(true);
      });
    });

    it('should not reject common passwords when disabled', () => {
      const customPolicy = PasswordPolicyService.create({
        ...defaultConfig,
        disallowCommonPasswords: false
      });

      const result = customPolicy.validate('password');
      expect(result.isOk()).toBe(true);
    });

    it('should allow variations of common passwords', () => {
      const password = 'P@ssw0rd'; // Modified common password
      const result = policy.validate(password);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('password strength calculation', () => {
    const testCases = [
      { password: 'short', expected: 0 },
      { password: 'Short1!', expected: 15 + 10 + 10 + 10 + 15 + 20 }, // 80
      { password: 'VeryLongPasswordWithHighEntropy123!@#', expected: 100 },
      { password: 'onlylowercaseletters', expected: 15 + 10 }, // Length (15) + long (10) = 25
    ];

    testCases.forEach(({ password, expected }) => {
      it(`should calculate strength for "${password.substring(0, 8)}..." as ${expected}`, () => {
        const strength = calculatePasswordStrength(password);
        expect(strength).toBe(expected);
      });
    });

    it('should cap strength at 100', () => {
      const password = 'ExtremelyStrongPassword!1234WithExtraEntropyABCDEFGHIJK';
      const strength = calculatePasswordStrength(password);
      expect(strength).toBe(100);
    });
  });

  describe('policy combinations', () => {
    it('should fail if any policy fails', () => {
      const strictPolicy = PasswordPolicyService.create({
        ...defaultConfig,
        minLength: 12
      });

      const combo = combinePasswordPolicies(policy, strictPolicy);
      const result = combo('Short1!'); // 修复：获取组合验证结果
      const error = expectError(result, 'PASSWORD_TOO_SHORT');
      expect(error?.details?.minLength).toBe(12);
    });

    it('should succeed if all policies pass', () => {
      const policy1 = PasswordPolicyService.create({ ...defaultConfig, minLength: 6 });
      const policy2 = PasswordPolicyService.create({ ...defaultConfig, requireSpecialChar: false });

      const combo = combinePasswordPolicies(policy1, policy2);
      const result = combo('Valid123');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('domain exception conversion', () => {
    it('should convert validation error to domain exception', () => {
      const error: PasswordValidationError = {
        code: 'TEST_ERROR',
        message: 'Test message',
        details: { field: 'value' }
      };

      const exception = toDomainException(error);

      expect(exception).toBeInstanceOf(DomainException);
      expect(exception.code).toBe('PASSWORD.TEST_ERROR');
      expect(exception.message).toBe('Test message');

      // 安全访问details属性
      if ('details' in exception) {
        expect(exception.details).toEqual({ field: 'value' });
      }
    });

    it('should work with minimal error information', () => {
      const error: PasswordValidationError = {
        code: 'MINIMAL_ERROR',
        message: 'Minimal error'
      };

      const exception = toDomainException(error);

      expect(exception).toBeInstanceOf(DomainException);
      expect(exception.code).toBe('PASSWORD.MINIMAL_ERROR');
      expect(exception.message).toBe('Minimal error');

      // 安全检查details属性
      if ('details' in exception) {
        expect(exception.details).toBeUndefined();
      }
    });
  });

  describe('entropy calculation', () => {
    it('should calculate entropy for all character types', () => {
      const password = 'Abc123!@';
      const entropy = PasswordPolicyService.calculateEntropy(password);

      // Expected: log2((26+26+10+32)^8) ≈ log2(94^8)
      const expected = Math.log2(Math.pow(94, password.length));
      expect(entropy).toBeCloseTo(expected, 1);
    });

    it('should have higher entropy for more complex passwords', () => {
      const simple = PasswordPolicyService.calculateEntropy('password');
      const complex = PasswordPolicyService.calculateEntropy('P@ssw0rd!123');

      expect(complex).toBeGreaterThan(simple);
    });

    it('should handle all lowercase passwords', () => {
      const password = 'lowercase';
      const entropy = PasswordPolicyService.calculateEntropy(password);

      // Charset: 26
      const expected = Math.log2(Math.pow(26, password.length));
      expect(entropy).toBeCloseTo(expected, 1);
    });
  });
});
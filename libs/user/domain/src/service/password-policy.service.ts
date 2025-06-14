// rice/libs/user/domain/src/service/password-policy.service.ts
import { ok, err, Result } from '@rice/core-kernel';
import { DomainException } from '@rice/core-kernel';
import type { Primitive } from '@rice/core-kernel';

/**
 * 密码策略配置接口（不可变）
 * @domain user
 */
export type PasswordPolicyConfig = Readonly<{
  minLength: number;
  maxLength: number;
  requireDigit: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireSpecialChar: boolean;
  maxConsecutiveRepeats: number;
  disallowCommonPasswords: boolean;
}>;

/**
 * 密码验证错误类型
 * @domain user
 */
export type PasswordValidationError = Readonly<{
  code: string;
  message: string;
  details?: Record<string, Primitive>;
}>;

/**
 * 自定义错误结果类型（解决Result类型问题）
 */
type ErrResult<E> = {
  error: E;
  isError: () => true;
  map: never;
  chain: never;
  isOk: () => false;
};

/**
 * 密码策略服务 - 纯函数式实现
 * 完全不可变、无副作用、可组合的密码规则引擎
 * @domain user
 */
export class PasswordPolicyService {
  // 内部状态不可变
  private constructor(private readonly config: PasswordPolicyConfig) { }

  /**
   * 工厂方法：创建密码策略服务
   * @param config 密码策略配置
   * @returns 密码策略服务实例
   */
  static create(config: PasswordPolicyConfig): PasswordPolicyService {
    return new PasswordPolicyService(Object.freeze({ ...config }));
  }

  /**
   * 验证密码是否符合策略
   * @param password 待验证的密码
   * @returns 验证结果（Result模式）
   */
  validate(password: string): Result<void, PasswordValidationError> {
    const validations: Result<void, PasswordValidationError>[] = [
      this.checkLength(password),
      this.checkCharacterTypes(password),
      this.checkConsecutiveRepeats(password),
      this.checkCommonPasswords(password)
    ];

    // 查找第一个错误
    const firstError = validations.find(result =>
      (result as unknown as ErrResult<PasswordValidationError>).isError?.()
    );

    // 如果没有错误则返回成功
    return firstError || ok(undefined);
  }

  // ===================== 核心验证规则 =====================

  /**
   * 验证密码长度（纯函数）
   * @domain user
   */
  private checkLength(
    password: string
  ): Result<void, PasswordValidationError> {
    const { minLength, maxLength } = this.config;

    if (password.length < minLength) {
      return err({
        code: 'PASSWORD_TOO_SHORT',
        message: `Password must be at least ${minLength} characters`,
        details: { minLength, actualLength: password.length }
      });
    }

    if (password.length > maxLength) {
      return err({
        code: 'PASSWORD_TOO_LONG',
        message: `Password cannot exceed ${maxLength} characters`,
        details: { maxLength, actualLength: password.length }
      });
    }

    return ok(undefined);
  }

  /**
   * 验证字符类型要求（纯函数）
   * @domain user
   */
  private checkCharacterTypes(
    password: string
  ): Result<void, PasswordValidationError> {
    // 仅返回首个遇到的错误，避免非原始类型的数组嵌套
    if (this.config.requireDigit && !/\d/.test(password)) {
      return err({
        code: 'PASSWORD_MISSING_DIGIT',
        message: 'Password must contain at least one digit'
      });
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      return err({
        code: 'PASSWORD_MISSING_UPPERCASE',
        message: 'Password must contain at least one uppercase letter'
      });
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      return err({
        code: 'PASSWORD_MISSING_LOWERCASE',
        message: 'Password must contain at least one lowercase letter'
      });
    }

    if (this.config.requireSpecialChar && !/[\W_]/.test(password)) {
      return err({
        code: 'PASSWORD_MISSING_SPECIAL_CHAR',
        message: 'Password must contain at least one special character'
      });
    }

    return ok(undefined);
  }

  /**
   * 验证连续重复字符（纯函数）
   * @domain user
   */
  private checkConsecutiveRepeats(
    password: string
  ): Result<void, PasswordValidationError> {
    if (this.config.maxConsecutiveRepeats <= 0) {
      return ok(undefined);
    }

    let consecutiveCount = 1;
    let lastChar = password[0];

    for (let i = 1; i < password.length; i++) {
      if (password[i] === lastChar) {
        consecutiveCount++;
        if (consecutiveCount > this.config.maxConsecutiveRepeats) {
          return err({
            code: 'PASSWORD_CONSECUTIVE_REPEATS',
            message: `Password cannot have more than ${this.config.maxConsecutiveRepeats} consecutive identical characters`,
            details: {
              maxConsecutiveRepeats: this.config.maxConsecutiveRepeats,
              character: lastChar,
              position: i
            }
          });
        }
      } else {
        consecutiveCount = 1;
        lastChar = password[i];
      }
    }

    return ok(undefined);
  }

  /**
   * 检查常见弱密码（纯函数）
   * @domain user
   */
  private checkCommonPasswords(
    password: string
  ): Result<void, PasswordValidationError> {
    if (!this.config.disallowCommonPasswords) {
      return ok(undefined);
    }

    // 弱密码列表（真实场景应存储在外部安全位置）
    const COMMON_PASSWORDS = new Set([
      'password', '123456', 'qwerty', 'admin', 'welcome'
    ]);

    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      return err({
        code: 'PASSWORD_TOO_COMMON',
        message: 'Password is too common and easily guessable',
        details: { disallowed: true }
      });
    }

    return ok(undefined);
  }

  /**
   * 计算密码熵值（静态工具方法）
   * @param password 密码字符串
   * @returns 熵值（比特）
   * @domain user
   */
  static calculateEntropy(password: string): number {
    const charSetSize = getCharSetSize(password);
    return Math.log2(Math.pow(charSetSize, password.length));
  }
}

/**
 * 估算密码字符集大小
 * @param password 密码字符串
 * @returns 字符集大小
 * @domain user
 */
const getCharSetSize = (password: string): number => {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/\d/.test(password)) size += 10;
  if (/[\W_]/.test(password)) size += 32; // 常见特殊字符
  return size || 1; // 避免0
};

// ===================== 策略组合工具 =====================

/**
 * 创建密码策略组合器（高阶函数）
 * @param policies 多个密码策略服务
 * @returns 合并后的验证函数
 * @domain user
 */
export const combinePasswordPolicies = (
  ...policies: PasswordPolicyService[]
): ((password: string) => Result<void, PasswordValidationError>) => {
  return (password: string) => {
    // 顺序执行策略，遇到错误立即返回
    for (const policy of policies) {
      const result = policy.validate(password);

      // 使用类型守卫判断是否为错误结果
      if ((result as unknown as ErrResult<PasswordValidationError>).isError?.()) {
        return result;
      }
    }
    return ok(undefined);
  };
};

// ===================== 领域异常适配器 =====================

/**
 * 将密码验证错误转换为领域异常
 * @param error 密码验证错误
 * @returns 领域异常实例
 * @domain user
 */
export const toDomainException = (
  error: PasswordValidationError
): DomainException => {
  // 使用具体异常类避免抽象类实例化问题
  return new class extends DomainException {
    constructor() {
      super(
        `PASSWORD.${error.code}`,
        error.message,
        error.details
      );
    }
  };
};

// ===================== 密码强度计算器 =====================

/**
 * 计算密码强度分数（0-100）
 * @param password 密码
 * @returns 强度分数（数值）
 * @domain user
 */
export const calculatePasswordStrength = (
  password: string
): number => {
  const rules = [
    { test: (p: string) => p.length >= 8, score: 15 },
    { test: (p: string) => p.length >= 12, score: 10 },
    { test: (p: string) => /[A-Z]/.test(p), score: 10 },
    { test: (p: string) => /[a-z]/.test(p), score: 10 },
    { test: (p: string) => /\d/.test(p), score: 15 },
    { test: (p: string) => /[\W_]/.test(p), score: 20 },
    {
      test: (p: string) => {
        const entropy = PasswordPolicyService.calculateEntropy(p);
        return entropy > 60 ? 20 : entropy > 40 ? 10 : 0;
      }, score: 0
    }
  ];

  return Math.min(
    rules.reduce((score, rule) =>
      rule.test(password) ? score + rule.score : score,
      0
    ),
    100
  );
};
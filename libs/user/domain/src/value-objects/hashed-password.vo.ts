import { CryptoUtils, err, ok, Result, ValueObject } from '@rice/core-kernel';
import type { PasswordPolicyService } from '../service/password-policy.service';
import { PasswordValueObjectException } from 'src/exceptions/password-vo.exception';

/**
 * 加密密码值对象 - 强制安全策略
 * @domain user
 */
export class HashedPasswordVO extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
    // 创建时立即验证格式
    this.validateProps({ value });
  }

  // 单独的内部验证方法（不覆盖基类validate）
  private validateProps(props: { value: string }): void {
    if (typeof props.value !== 'string') {
      throw new PasswordValueObjectException(
        'INVALID_FORMAT',
        'Password hash must be a string'
      );
    }

    if (!props.value.includes('$')) {
      throw new PasswordValueObjectException(
        'INVALID_FORMAT',
        'Hashed password must be in "salt$hash" format'
      );
    }

    const [salt, hash] = props.value.split('$');
    if (!salt || !hash) {
      throw new PasswordValueObjectException(
        'INVALID_FORMAT',
        'Invalid salt/hash format'
      );
    }
  }

  // 实现基类要求的抽象方法（简单返回通过验证的属性）
  protected validate(props: { value: string }): { value: string } {
    // 实际验证已经在构造函数中完成
    return props;
  }

  /**
   * 创建方法 - 处理密码哈希逻辑
   * @param plainText - 明文密码
   * @param policy - 密码策略服务
   */
  static create(
    plainText: string,
    policy: PasswordPolicyService
  ): Result<HashedPasswordVO, PasswordValueObjectException> {
    // 验证密码策略
    const validationResult = policy.validate(plainText);
    if (validationResult.isFail()) {
      const error = validationResult.error;
      return err(
        new PasswordValueObjectException(
          error.code || 'INVALID_PASSWORD',
          error.message
        )
      );
    }

    try {
      // 生成安全的密码哈希
      const { salt, hash } = CryptoUtils.hashPassword(plainText);
      return ok(new HashedPasswordVO(`${salt}$${hash}`));
    } catch (error) {
      // 处理加密错误
      return err(
        new PasswordValueObjectException(
          'CRYPTO_ERROR',
          'Failed to hash password',
          error instanceof Error ? { cause: error.message } : undefined
        )
      );
    }
  }

  /**
   * 比较方法 - 验证明文密码是否匹配哈希
   * @param plainText - 待验证的明文密码
   */
  public compare(plainText: string): boolean {
    try {
      const [salt, storedHash] = this.props.value.split('$');
      return CryptoUtils.verifyPassword(plainText, salt, storedHash);
    } catch (error) {
      // 捕获可能的比较错误
      throw new PasswordValueObjectException(
        'COMPARE_FAILED',
        'Password comparison failed',
        error instanceof Error ? { cause: error.message } : undefined
      );
    }
  }
}
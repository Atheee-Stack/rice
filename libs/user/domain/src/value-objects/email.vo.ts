// rice/libs/user/domain/src/value-objects/email.vo.ts

import { Primitive, ValueObject, CryptoUtils, Result, err, ValueObjectProps, ok } from "@rice/core-kernel";

/**
 * @domain 邮箱值对象属性定义
 */
interface EmailProps extends ValueObjectProps {
  value: string;
  [key: string]: Primitive | ValueObject<ValueObjectProps> | ValueObject<ValueObjectProps>[];
}

/**
 * @domain 邮箱值对象
 */
export class EmailVO extends ValueObject<EmailProps> {
  /**
   * @domain 邮箱正则表达式
   */
  private static readonly EMAIL_REGEX =
    /^(([^<>()$$$$\\.,;:\s@"]+(\.[^<>()$$$$\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  get value(): string {
    return this.props.value;
  }

  getHash(salt?: string): string {
    return CryptoUtils.generateHash(this.props.value, salt);
  }

  protected validate(props: EmailProps): EmailProps {
    const normalized = this.normalizeEmail(props.value);

    if (!EmailVO.isValidFormat(normalized)) {
      throw new Error(`Invalid email format: ${props.value}`);
    }

    // 简化返回类型，确保类型安全
    return {
      ...props,
      value: normalized
    } as EmailProps;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static isValidFormat(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }

  static create(
    email: string,
    allowedDomains?: string[]
  ): Result<EmailVO, Error> {
    const normalized = email.trim().toLowerCase();

    // 格式验证
    if (!this.isValidFormat(normalized)) {
      return err(new Error(`Invalid email format: ${email}`));
    }

    // 域名白名单验证
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = normalized.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        return err(new Error(`Domain not allowed: ${domain}`));
      }
    }

    // 安全创建实例
    try {
      const emailVO = new EmailVO({ value: normalized });
      return ok(emailVO);
    } catch (error: unknown) {
      return err(
        error instanceof Error
          ? error
          : new Error('Unknown error creating EmailVO')
      );
    }
  }

  override equals(vo?: ValueObject<ValueObjectProps>): boolean {
    if (!(vo instanceof EmailVO)) return false;
    return this.value === vo.value;
  }
}
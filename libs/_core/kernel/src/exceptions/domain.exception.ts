// rice/libs/_core/kernel/src/exceptions/domain.exception.ts

/**
 * 领域异常基类
 */
export abstract class DomainException extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.metadata && { metadata: this.metadata }),
      stack: this.stack,
    };
  }
}
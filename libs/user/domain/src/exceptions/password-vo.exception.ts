import { DomainException } from "@rice/core-kernel";
// 实现具体的领域异常类（因为DomainException是抽象的）

export class PasswordValueObjectException extends DomainException {
  constructor(
    code: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata);
  }
}
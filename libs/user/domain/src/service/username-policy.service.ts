import { ok, fail, Result } from '@rice/core-kernel';
import { SpecValidator } from '@rice/core-kernel/utils/spec-validator.util';
import type { ValidationError } from 'jsonschema';
import { isString, toPrimitive } from '@rice/core-kernel';

/**
 * Validates and enforces username policies with enhanced primitive type safety
 * 
 * @domain User
 */
export class UsernamePolicyService {
  private static readonly USERNAME_SPEC = {
    type: 'string',
    pattern: '^[a-zA-Z0-9_-]{3,24}$',
    transform: ['trim', 'toLowerCase'],
    messages: {
      pattern: 'Username must contain only letters, numbers, underscores or hyphens',
      minLength: 'Username must be at least 3 characters',
      maxLength: 'Username cannot exceed 24 characters'
    }
  };

  private readonly validator = new SpecValidator();

  validate(candidate: unknown): Result<string, string[]> {
    // 1. 强类型检查
    if (!isString(candidate)) {
      return fail([
        `Invalid username type: expected string but received ${typeof candidate}`
      ]);
    }

    // 2. 应用校验规则
    const validation = this.validator.validate(
      candidate,
      UsernamePolicyService.USERNAME_SPEC,
      { applyTransformations: true }
    );

    return validation.valid
      ? ok(validation.normalized as string)
      : fail(this.formatErrors(validation.errors));
  }

  generateSuggestions(base: unknown): string[] {
    // 1. 原始值转换
    const basePrimitive = toPrimitive(base);
    const baseString = isString(basePrimitive)
      ? basePrimitive
      : String(basePrimitive);

    // 2. 生成并过滤建议
    return [
      ...this.numericVariations(baseString),
      ...this.alternativeSeparators(baseString),
      ...this.commonTransformations(baseString)
    ]
      .slice(0, 5)
      .filter(suggestion => this.isValid(suggestion));
  }

  private isValid(value: string): boolean {
    const result = this.validate(value);
    return result.isOk();
  }

  private formatErrors(errors: ValidationError[]): string[] {
    return errors.map(e =>
      this.validator.getReadableError(e, UsernamePolicyService.USERNAME_SPEC)
    );
  }

  private numericVariations(username: string): string[] {
    return ['', '1', '123', '2024', '42'].map(suffix =>
      this.sanitize(`${username}${suffix}`)
    );
  }

  private alternativeSeparators(username: string): string[] {
    return ['', '_', '-', '.'].reduce<string[]>((suggestions, sep) => {
      return username.length <= 20
        ? [...suggestions, this.sanitize(`${username}${sep}${this.randomWord()}`)]
        : suggestions;
    }, []);
  }

  private commonTransformations(username: string): string[] {
    return [
      username.replace(/[^a-z0-9]/g, ''),
      username.replace(/_/g, '-'),
      username.substring(0, 20),
      `${username.slice(0, 1)}${username.slice(1).replace(/[aeiou]/g, '')}`
    ].map(this.sanitize);
  }

  private sanitize(value: string): string {
    return this.validator.normalize(
      value,
      UsernamePolicyService.USERNAME_SPEC
    ) as string;
  }

  private randomWord(): string {
    const words = ['dev', 'ninja', 'expert', 'pro', 'gamer', 'user', 'team'];
    return words[Math.floor(Math.random() * words.length)];
  }
}
export * from './core-kernel.js';
export { Entity } from './domain/entity.base.js';
export type { EntityProps } from './domain/entity.base.js'
export { ValueObject } from './domain/value-object.base.js';
export type { ValueObjectProps } from './domain/value-object.base.js';
export { DomainEvent } from './domain/domain-event.js';
export { AggregateRoot } from './domain/aggregate-root.base.js';
export { ErrorCodes } from './exceptions/error.codes.js';
export { DomainException } from './exceptions/domain.exception.js';
export * from './utils/crypto.util.js';
export * from './utils/functional.util.js';
export type { Result } from './utils/result.util.js';
export { Ok, Err } from './utils/result.util.js';
export { ok, err, fail } from './utils/result.util.js';
export type {
  UnwrapResult,
  UnwrapError
} from './utils/result.util.js';
export type { Primitive } from './utils/primitive.util.js';
export { isPrimitive, isString, isNumber, isBoolean, isNull, isUndefined, isSymbol, isBigInt } from './utils/primitive.util.js';
export { toPrimitive } from './utils/primitive.util.js';
export { SpecValidator } from './utils/spec-validator.util.js'
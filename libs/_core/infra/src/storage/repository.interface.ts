// rice/libs/_core/infra/src/storage/repository.interface.ts
import type { AggregateRoot, EntityProps, Result } from '@rice/core-kernel';

/**
 * 泛型仓储接口
 * @template T - 聚合根类型
 * @template TId - 聚合根ID类型
 */
export interface IRepository<
  T extends AggregateRoot<EntityProps>,
  TId = string
> {
  findById(id: TId): Promise<Result<T | null>>;
  exists(id: TId): Promise<Result<boolean>>;
  save(aggregate: T): Promise<Result<void>>;
  delete(id: TId): Promise<Result<void>>;
  publishEvents(aggregate: T): Promise<Result<void>>;
}

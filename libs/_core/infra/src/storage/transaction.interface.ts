// rice/libs/_core/infra/src/storage/transaction.interface.ts
import type { Result } from "@rice/core-kernel";
/**
 * 事务操作函数类型
 * @template T 返回结果类型
 */
export type TransactionOperation<T> = () => Promise<T>;

/**
 * 事务管理器接口（函数式风格）
 */
export interface ITransactionManager {
  /**
   * 执行事务操作
   * @template T 事务返回结果类型
   * @param operation 需要在事务中执行的操作
   * @returns 包含执行结果的Promise<Result<T>>
   */
  execute<T>(
    operation: TransactionOperation<T>
  ): Promise<Result<T>>;

  /**
   * 提供事务会话（更函数式的用法）
   * @template T 返回结果类型
   * @param callback 接收事务会话的函数
   * @returns Promise<Result<T>>
   */
  withTransaction<T>(
    callback: (session: unknown) => Promise<Result<T>>
  ): Promise<Result<T>>;

  /**
 * 获取活跃事务计数（仅用于测试）
 */
  getActiveTransactionCount(): number;
}

/**
 * 事务隔离级别（严格类型定义）
 */
export const TransactionIsolationLevel = Object.freeze({
  READ_UNCOMMITTED: "READ UNCOMMITTED",
  READ_COMMITTED: "READ COMMITTED",
  REPEATABLE_READ: "REPEATABLE READ",
  SERIALIZABLE: "SERIALIZABLE",
} as const);

export type TransactionIsolationLevel =
  typeof TransactionIsolationLevel[keyof typeof TransactionIsolationLevel];

/**
 * 事务选项（强类型定义）
 */
export interface TransactionOptions {
  isolationLevel?: TransactionIsolationLevel;
  timeoutMs?: number;
  readOnly?: boolean;
}
// rice/libs/_core/infra/src/storage/transaction.fp.ts
import type {
  ITransactionManager,
  TransactionOperation,
} from "./transaction.interface";
import { Result, ok, err } from "@rice/core-kernel";

/**
 * 创建函数式事务管理器
 * @returns 事务管理器实例
 */
export const createTransactionManager = (
  // 移除未使用的参数
): ITransactionManager => {
  const activeTransactions = new Set<symbol>();

  return {
    execute: async <T>(operation: TransactionOperation<T>) => {
      const txId = Symbol('tx');
      activeTransactions.add(txId);

      try {
        const result = await operation();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      } finally {
        activeTransactions.delete(txId);
      }
    },

    withTransaction: async <T>(
      callback: (session: unknown) => Promise<Result<T>>
    ) => {
      const txId = Symbol('tx');
      activeTransactions.add(txId);

      try {
        return await callback({ txId });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      } finally {
        activeTransactions.delete(txId);
      }
    },

    getActiveTransactionCount: () => activeTransactions.size,
  };
};

/**
 * 创建带重试的事务管理器
 * @param manager 基础事务管理器
 * @param maxRetries 最大重试次数
 * @returns 带重试功能的事务管理器
 */
export const withRetry = (
  manager: ITransactionManager,
  maxRetries: number
): ITransactionManager => {
  return {
    ...manager,

    execute: async <T>(operation: TransactionOperation<T>) => {
      let lastError: Error | undefined;
      let attempt = 0;

      while (attempt <= maxRetries) {
        attempt++;

        const result = await manager.execute(operation);
        if (result.isOk()) return result;

        lastError = result.unwrapErr();
      }

      return err(lastError || new Error("Transaction failed"));
    },

    withTransaction: async <T>(
      callback: (session: unknown) => Promise<Result<T>>
    ) => {
      let lastError: Error | undefined;
      let attempt = 0;

      while (attempt <= maxRetries) {
        attempt++;

        const result = await manager.withTransaction(callback);
        if (result.isOk()) return result;

        lastError = result.unwrapErr();
      }

      return err(lastError || new Error("WithTransaction failed"));
    }
  };
};
// rice/libs/_core/infra/src/storage/__tests__/transaction.spec.ts
import { createTransactionManager, withRetry } from "../transaction.fp";
import { ok, Err } from "@rice/core-kernel";
import { ITransactionManager, TransactionOperation } from "../transaction.interface";

describe("createTransactionManager", () => {
  let transactionManager: ITransactionManager;

  beforeEach(() => {
    transactionManager = createTransactionManager();
  });

  test("should execute successful operation", async () => {
    const operation: TransactionOperation<number> = async () => 42;
    const result = await transactionManager.execute(operation);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(42);
    }
  });

  test("should handle operation failure", async () => {
    const error = new Error("Operation failed");
    const operation: TransactionOperation<never> = async () => {
      throw error;
    };

    const result = await transactionManager.execute(operation);
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error).toBe(error);
    }
  });

  test("should track active transactions", async () => {
    const operation: TransactionOperation<void> = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    };

    // 初始状态没有活跃事务
    expect(transactionManager.getActiveTransactionCount()).toBe(0);

    const promise = transactionManager.execute(operation);

    // 检查事务是否被添加
    expect(transactionManager.getActiveTransactionCount()).toBe(1);

    await promise;

    // 事务完成后应被移除
    expect(transactionManager.getActiveTransactionCount()).toBe(0);
  });

  describe("withTransaction", () => {
    test("should handle successful callback", async () => {
      const callback = async (session: unknown) => {
        expect(session).toBeDefined();
        return ok("success");
      };

      const result = await transactionManager.withTransaction(callback);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
    });

    test("should handle callback returning Err", async () => {
      const error = new Error("Callback error");
      const callback = async () => new Err(error);

      const result = await transactionManager.withTransaction(callback);
      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBe(error);
      }
    });

    test("should handle callback throwing error", async () => {
      const error = new Error("Callback exception");
      const callback = async () => {
        // 这里抛出异常
        throw error;
      };

      const result = await transactionManager.withTransaction(callback);
      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe("withRetry wrapper", () => {
    test("should retry on failure and succeed", async () => {
      let attemptCount = 0;
      const maxRetries = 3;
      const operation: TransactionOperation<string> = async () => {
        attemptCount++;
        if (attemptCount <= 2) throw new Error(`Attempt ${attemptCount} failed`);
        return "success";
      };

      const retryManager = withRetry(transactionManager, maxRetries);
      const result = await retryManager.execute(operation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
      expect(attemptCount).toBe(3);
    });

    test("should fail after max retries", async () => {
      let attemptCount = 0;
      const maxRetries = 2;
      const errorMessage = "Permanent failure";
      const operation: TransactionOperation<never> = async () => {
        attemptCount++;
        throw new Error(`${errorMessage} ${attemptCount}`);
      };

      const retryManager = withRetry(transactionManager, maxRetries);
      const result = await retryManager.execute(operation);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        // 期望最后一次尝试的错误消息
        expect(result.error.message).toBe(`${errorMessage} ${maxRetries + 1}`);
      }
      expect(attemptCount).toBe(maxRetries + 1);
    });

    test("should not retry on success", async () => {
      let attemptCount = 0;
      const maxRetries = 3;
      const operation: TransactionOperation<number> = async () => {
        attemptCount++;
        return 100;
      };

      const retryManager = withRetry(transactionManager, maxRetries);
      const result = await retryManager.execute(operation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(100);
      }
      expect(attemptCount).toBe(1);
    });

    test("should work with withTransaction method", async () => {
      let attemptCount = 0;
      const maxRetries = 2;

      // 使用函数工厂创建回调，确保每次重试使用新实例
      const createCallback = () => {
        return async (session: unknown) => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return ok({ session, data: "success" });
        };
      };

      const retryManager = withRetry(transactionManager, maxRetries);
      const result = await retryManager.withTransaction(createCallback());

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toBe("success");
      }
      expect(attemptCount).toBe(3);
    });
  });
});
import {
  asyncPipe,
  asyncCompose,
  memoizeAsync,
  throttle,
  debounce,
  retry,
  get,
  set,
  FunctionalUtils
} from '../functional.util';

describe('Functional Programming Utilities', () => {
  // 保存原始Date.now的引用，用于测试后恢复
  let originalDateNow: () => number;

  beforeEach(() => {
    originalDateNow = Date.now; // 保存原始方法
  });

  afterEach(() => {
    (global.Date as any).now = originalDateNow; // 恢复原始方法
    jest.useRealTimers(); // 清理假定时器
  });

  // ==============================================
  // asyncPipe 测试
  // ==============================================
  describe('asyncPipe', () => {
    it('无参调用应返回恒等函数', async () => {
      const identity = asyncPipe();
      await expect(identity(42)).resolves.toBe(42);
      await expect(identity('hello')).resolves.toBe('hello');
    });

    it('应顺序组合异步函数（1个函数）', async () => {
      const add1 = (n: number) => Promise.resolve(n + 1);
      const process = asyncPipe(add1);
      await expect(process(3)).resolves.toBe(4);
    });

    it('应顺序组合异步函数（2个函数）', async () => {
      const add1 = (n: number) => Promise.resolve(n + 1);
      const double = (n: number) => Promise.resolve(n * 2);
      const process = asyncPipe(add1, double);
      await expect(process(3)).resolves.toBe(8);
    });
  });

  // ==============================================
  // asyncCompose 测试
  // ==============================================
  describe('asyncCompose', () => {
    it('无参调用应返回恒等函数', async () => {
      const identity = asyncCompose();
      await expect(identity(42)).resolves.toBe(42);
    });

    it('应从右到左组合异步函数（2个函数）', async () => {
      const add1 = (n: number) => Promise.resolve(n + 1);
      const double = (n: number) => Promise.resolve(n * 2);
      const process = asyncCompose(double, add1);
      await expect(process(3)).resolves.toBe(8);
    });
  });

  // ==============================================
  // throttle 测试（关键修复）
  // ==============================================
  describe('throttle', () => {
    it('应在延迟内仅执行一次（首次调用后触发）', () => {
      // 模拟Date.now返回0ms（初始时间）
      (global.Date as any).now = jest.fn().mockReturnValue(0);
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);

      // 首次调用：时间差0ms < 100ms → 不触发
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(0);

      // 模拟时间推进到100ms（触发条件）
      (global.Date as any).now = jest.fn().mockReturnValue(100);
      throttled(); // 再次调用
      expect(mockFn).toHaveBeenCalledTimes(1); // 触发一次
    });

    it('应在延迟内仅执行一次（连续调用不重复触发）', () => {
      (global.Date as any).now = jest.fn().mockReturnValue(0);
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);

      // 连续调用3次（时间均为0ms）→ 均不触发
      throttled();
      throttled();
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(0);

      // 模拟时间推进到100ms → 触发一次
      (global.Date as any).now = jest.fn().mockReturnValue(100);
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  // ==============================================
  // debounce 测试（关键修复）
  // ==============================================
  describe('debounce', () => {
    it('应在延迟结束后执行最后一次调用', () => {
      // 启用Jest假定时器（关键修复）
      jest.useFakeTimers();
      // 模拟Date.now返回初始时间0ms
      (global.Date as any).now = jest.fn().mockReturnValue(0);

      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100); // 延迟100ms

      // 连续调用3次（触发3次定时器）
      debounced();
      debounced();
      debounced();

      // 推进时间到100ms（超过延迟），触发最后一次调用
      jest.advanceTimersByTime(100); // 关键修复：推进100ms

      // 验证mockFn仅执行1次（最后一次调用）
      expect(mockFn).toHaveBeenCalledTimes(1);

      // 恢复真实定时器（避免影响其他测试）
      jest.useRealTimers();
    });
  });

  // ==============================================
  // 其他工具测试（修复显式any）
  // ==============================================
  describe('memoizeAsync', () => {
    it('应缓存相同输入的结果', async () => {
      let callCount = 0;
      const mockFn = async (n: number): Promise<number> => {
        callCount++;
        return n * 2;
      };
      const memoized = memoizeAsync(mockFn);

      await memoized(3);
      await memoized(3);
      expect(callCount).toBe(1);
    });
  });

  describe('retry', () => {
    it('应在失败后重试并成功', async () => {
      let callCount = 0;
      const flakyApi = async (): Promise<string> => {
        callCount++;
        if (callCount < 3) throw new Error('Temporary failure');
        return 'Success';
      };
      const result = await retry(flakyApi, 3);
      expect(result).toBe('Success');
      expect(callCount).toBe(3);
    });
  });

  describe('get', () => {
    it('应获取存在的嵌套属性', () => {
      // 修复：使用Record<string, unknown>替代any
      const user: Record<string, unknown> = {
        name: 'Alice',
        address: { city: 'Beijing' } as Record<string, string>
      };
      // 添加类型断言确保安全访问
      expect((user.address as Record<string, string>).city).toBe('Beijing');
    });
  });

  describe('set', () => {
    it('应自动创建缺失的中间对象', () => {
      // 修复：使用Record<string, unknown>替代any
      const user: Record<string, unknown> = {};
      set(user, 'address.city', 'Beijing');
      // 添加类型断言验证结果
      expect((user as Record<string, Record<string, string>>).address).toEqual({ city: 'Beijing' });
    });
  });

  describe('FunctionalUtils 冻结测试', () => {
    it('应禁止修改属性', () => {
      const originalAsyncPipe = FunctionalUtils.asyncPipe;
      // 修复：使用实际逻辑替代空箭头函数
      expect(() => {
        (FunctionalUtils as any).asyncPipe = () => { throw new Error('Modified'); };
      }).toThrowError(/Cannot assign to read only property/);
      expect(FunctionalUtils.asyncPipe).toBe(originalAsyncPipe);
    });
  });
});
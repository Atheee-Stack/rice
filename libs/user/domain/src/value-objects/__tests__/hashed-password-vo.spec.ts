import { HashedPasswordVO } from '../hashed-password.vo';
import { PasswordPolicyService } from '../../service/password-policy.service';
import { PasswordValueObjectException } from '../../exceptions/password-vo.exception';
import { ok, err, CryptoUtils } from '@rice/core-kernel';

// 模拟密码策略服务
const mockPolicyService: jest.Mocked<PasswordPolicyService> = {
  validate: jest.fn(),
  checkLength: jest.fn(),
  checkCharacterTypes: jest.fn(),
  checkConsecutiveRepeats: jest.fn(),
  checkCommonPasswords: jest.fn(),
} as any;

// 模拟CryptoUtils模块
jest.mock('@rice/core-kernel', () => {
  const original = jest.requireActual('@rice/core-kernel');
  return {
    ...original,
    CryptoUtils: {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    }
  };
});

describe('HashedPasswordVO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应成功创建加密密码对象 - 当密码符合策略', async () => {
      // 准备
      const plainPassword = 'ValidPassword123!';
      mockPolicyService.validate.mockReturnValue(ok(undefined));
      (CryptoUtils.hashPassword as jest.Mock).mockReturnValue({
        salt: 'testSalt',
        hash: 'testHash'
      });

      // 执行
      const result = HashedPasswordVO.create(plainPassword, mockPolicyService);

      // 验证
      expect(result.isOk()).toBe(true);
      const hashedPassword = result.unwrap();
      expect(hashedPassword).toBeInstanceOf(HashedPasswordVO);
      expect(hashedPassword.getProps().value).toBe('testSalt$testHash');
    });

    it('应返回错误 - 当密码不符合策略', async () => {
      // 准备
      const plainPassword = 'weak';
      const policyError = new PasswordValueObjectException(
        'INVALID_PASSWORD',
        'Password does not meet complexity requirements'
      );
      mockPolicyService.validate.mockReturnValue(err(policyError));

      // 执行
      const result = HashedPasswordVO.create(plainPassword, mockPolicyService);

      // 验证
      expect(result.isFail()).toBe(true);
      const error = result.unwrapErr();
      expect(error).toBeInstanceOf(PasswordValueObjectException);
      expect(error.code).toBe('INVALID_PASSWORD');
    });

    it('应返回加密错误 - 当哈希过程失败', async () => {
      // 准备
      const plainPassword = 'ValidPassword123!';
      mockPolicyService.validate.mockReturnValue(ok(undefined));
      (CryptoUtils.hashPassword as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      // 执行
      const result = HashedPasswordVO.create(plainPassword, mockPolicyService);

      // 验证
      expect(result.isFail()).toBe(true);
      const error = result.unwrapErr();
      expect(error).toBeInstanceOf(PasswordValueObjectException);
      expect(error.code).toBe('CRYPTO_ERROR');
    });
  });

  describe('格式验证', () => {
    it('应创建有效实例 - 当提供正确的salt$hash格式', async () => {
      // 准备 & 执行
      const result = HashedPasswordVO.create('salt$hash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService);

      // 验证
      expect(result.isOk()).toBe(true);
      expect(() => result.unwrap()).not.toThrow();
    });

    it('应抛出异常 - 当尝试实例化无效格式的密码', async () => {
      // 注意: 我们通过create方法来触发验证
      const result = HashedPasswordVO.create('invalid-hash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService);

      // 验证
      expect(result.isOk()).toBe(false);
      const error = result.unwrapErr();
      expect(error.code).toBe('INVALID_FORMAT');
    });

    it.each([
      [123],          // 非字符串
      ['noHash'],     // 缺少分隔符
      ['$onlySalt'],  // 缺少哈希值
      ['onlyHash$'],  // 缺少盐值
      [''],           // 空字符串
      ['s a l t$hash with space'] // 包含空格
    ])('应拒绝无效密码哈希格式: %s', async (invalidHash) => {
      // 准备 & 执行
      const result = HashedPasswordVO.create(invalidHash as string, {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService);

      // 验证
      expect(result.isFail()).toBe(true);
      const error = result.unwrapErr();
      expect(error).toBeInstanceOf(PasswordValueObjectException);
      expect(error.code).toBe('INVALID_FORMAT');
    });
  });

  describe('compare', () => {
    it('应返回true - 当密码匹配', async () => {
      // 准备
      const vo = HashedPasswordVO.create('testSalt$testHash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();
      (CryptoUtils.verifyPassword as jest.Mock).mockReturnValue(true);

      // 执行
      const result = vo.compare('matchingPassword');

      // 验证
      expect(result).toBe(true);
    });

    it('应返回false - 当密码不匹配', async () => {
      // 准备
      const vo = HashedPasswordVO.create('testSalt$testHash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();
      (CryptoUtils.verifyPassword as jest.Mock).mockReturnValue(false);

      // 执行
      const result = vo.compare('wrongPassword');

      // 验证
      expect(result).toBe(false);
    });

    it('应抛出比较失败异常 - 当验证过程出错', async () => {
      // 准备
      const vo = HashedPasswordVO.create('testSalt$testHash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();
      (CryptoUtils.verifyPassword as jest.Mock).mockImplementation(() => {
        throw new Error('Verification failed');
      });

      // 执行 & 验证
      expect(() => vo.compare('testPassword')).toThrow(PasswordValueObjectException);
      try {
        vo.compare('testPassword');
      } catch (error) {
        expect((error as PasswordValueObjectException).code).toBe('COMPARE_FAILED');
      }
    });
  });

  describe('行为一致性', () => {
    it('应保持值对象不可变性', async () => {
      // 准备
      const vo = HashedPasswordVO.create('salt$hash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();
      const originalValue = vo.getProps().value;

      // 尝试修改 - 验证TypeError
      expect(() => {
        (vo as any).props.value = 'new$value';
      }).toThrow(TypeError);

      // 验证值未改变
      expect(vo.getProps().value).toBe(originalValue);
    });

    it('应正确实现相等性检查', async () => {
      // 准备
      const vo1 = HashedPasswordVO.create('salt$hash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();
      const vo2 = HashedPasswordVO.create('salt$hash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();
      const vo3 = HashedPasswordVO.create('different$hash', {
        validate: () => ok(undefined)
      } as unknown as PasswordPolicyService).unwrap();

      // 验证
      expect(vo1.equals(vo2)).toBe(true);
      expect(vo1.equals(vo3)).toBe(false);
      expect(vo1.equals(null as any)).toBe(false);
      expect(vo1.equals(undefined as any)).toBe(false);
    });
  });
});
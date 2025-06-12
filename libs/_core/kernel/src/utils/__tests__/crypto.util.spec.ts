import {
  generateRandomHex,
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  generateHash,
  generateHmac,
  generateSecureToken,
} from '../crypto.util';
import { HexString, PasswordHash } from '../crypto.util';

describe('Crypto Utilities', () => {
  // ------------------------------
  // generateRandomHex 测试
  // ------------------------------
  describe('generateRandomHex', () => {
    it('应生成指定长度的十六进制字符串', () => {
      const length = 16;
      const result = generateRandomHex(length);
      expect(result).toHaveLength(length * 2); // 每个字节转2位十六进制
      expect(/^[0-9a-f]+$/i.test(result)).toBe(true);
    });

    it('处理长度为0的情况', () => {
      const result = generateRandomHex(0);
      expect(result).toBe('');
    });
  });

  // ------------------------------
  // hashPassword 测试
  // ------------------------------
  describe('hashPassword', () => {
    const password = 'SecurePass123!';
    let salt: HexString;
    let hashResult: PasswordHash;

    beforeEach(() => {
      salt = generateRandomHex(16);
      hashResult = hashPassword(password, salt);
    });

    it('返回包含 salt 和 hash 的对象', () => {
      expect(hashResult).toEqual({
        salt: expect.stringMatching(/^[0-9a-f]{32}$/),
        hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
    });

    it('相同密码和盐生成相同哈希', () => {
      const newHash = hashPassword(password, salt);
      expect(newHash.hash).toBe(hashResult.hash);
    });

    it('不同盐生成不同哈希（即使密码相同）', () => {
      const newSalt = generateRandomHex(16);
      const newHash = hashPassword(password, newSalt);
      expect(newHash.hash).not.toBe(hashResult.hash);
    });
  });

  // ------------------------------
  // verifyPassword 测试
  // ------------------------------
  describe('verifyPassword', () => {
    const password = 'ValidPass456';
    const wrongPassword = 'WrongPass789';
    const salt = generateRandomHex(16);
    const validHash = hashPassword(password, salt).hash;

    it('正确密码返回 true', () => {
      expect(verifyPassword(password, salt, validHash)).toBe(true);
    });

    it('错误密码返回 false', () => {
      expect(verifyPassword(wrongPassword, salt, validHash)).toBe(false);
    });

    it('错误盐返回 false', () => {
      const wrongSalt = generateRandomHex(16);
      const wrongHash = hashPassword(password, wrongSalt).hash;
      expect(verifyPassword(password, salt, wrongHash)).toBe(false);
    });

    it('无效哈希格式（长度错误）返回 false', () => {
      const invalidHash = 'a'.repeat(63); // 正确应为64字符
      expect(verifyPassword(password, salt, invalidHash)).toBe(false);
    });
  });

  // ------------------------------
  // encrypt/decrypt 测试
  // ------------------------------
  describe('encrypt & decrypt', () => {
    const plaintext = 'Sensitive data with spaces & symbols!';
    const secretKey = generateRandomHex(32); // 32字节=256位

    it('加密后解密恢复原始数据', () => {
      const encrypted = encrypt(plaintext, secretKey);
      expect(encrypted).toMatch(/^([0-9a-f]{32}):([0-9a-f]+)$/); // 格式：iv:加密数据

      const decrypted = decrypt(encrypted, secretKey);
      expect(decrypted).toBe(plaintext);
    });

    it('错误密钥解密失败', () => {
      const encrypted = encrypt(plaintext, secretKey);
      const wrongKey = generateRandomHex(32);
      expect(() => decrypt(encrypted, wrongKey)).toThrow(); // 解密失败会抛出异常
    });

    it('处理空字符串明文', () => {
      const encrypted = encrypt('', secretKey);
      const decrypted = decrypt(encrypted, secretKey);
      expect(decrypted).toBe('');
    });

    it('处理特殊字符明文', () => {
      const specialText = 'Line1\nLine2\r\nLine3\tTab';
      const encrypted = encrypt(specialText, secretKey);
      const decrypted = decrypt(encrypted, secretKey);
      expect(decrypted).toBe(specialText);
    });
  });

  // ------------------------------
  // generateHash 测试
  // ------------------------------
  describe('generateHash', () => {
    const data = 'HashMe';
    const salt = generateRandomHex(16);

    it('无盐时生成固定长度哈希', () => {
      const hash = generateHash(data);
      expect(hash).toHaveLength(128); // SHA-512输出64字节=128十六进制字符
    });

    it('带盐时哈希包含盐信息', () => {
      const hashWithSalt = generateHash(data, salt);
      const hashWithoutSalt = generateHash(data);

      // 相同数据和盐生成相同哈希
      expect(generateHash(data, salt)).toBe(hashWithSalt);

      // 不同盐生成不同哈希
      expect(hashWithSalt).not.toBe(hashWithoutSalt);
    });
  });

  // ------------------------------
  // generateHmac 测试
  // ------------------------------
  describe('generateHmac', () => {
    const data = 'HMAC Test';
    const key = 'SecretHMACKey123';

    it('相同数据和密钥生成相同签名', () => {
      const hmac1 = generateHmac(data, key);
      const hmac2 = generateHmac(data, key);
      expect(hmac1).toBe(hmac2);
    });

    it('不同数据生成不同签名', () => {
      const hmac1 = generateHmac(data, key);
      const hmac2 = generateHmac(data + 'Extra', key);
      expect(hmac1).not.toBe(hmac2);
    });

    it('不同密钥生成不同签名', () => {
      const hmac1 = generateHmac(data, key);
      const hmac2 = generateHmac(data, key + 'Extra');
      expect(hmac1).not.toBe(hmac2);
    });

    it('生成正确长度的签名', () => {
      const hmac = generateHmac(data, key);
      expect(hmac).toHaveLength(128); // SHA-512 HMAC输出64字节=128十六进制字符
    });
  });

  // ------------------------------
  // generateSecureToken 测试
  // ------------------------------
  describe('generateSecureToken', () => {
    it('生成指定长度的安全令牌', () => {
      const byteLength = 32;
      const token = generateSecureToken(byteLength);
      expect(token).toHaveLength(byteLength * 2);
      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });

    it('使用默认长度（32字节）', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 * 2
    });
  });
});
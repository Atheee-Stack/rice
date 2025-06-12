// rice/libs/_core/kernel/src/utils/crypto.util.ts

/**
 * 密码学工具模块：提供安全相关的加密、哈希、密码管理等工具函数
 * 遵循密码学最佳实践，包含密码哈希、对称加密、数据完整性验证等功能
 * 所有加密操作均使用Node.js内置的`crypto`模块，确保底层实现的安全性
 */

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// ------------------------------ 类型定义 ------------------------------
/**
 * 十六进制字符串类型别名（仅包含0-9、a-f/A-F字符）
 * 用于表示二进制数据的十六进制编码形式（如密钥、盐值、加密结果等）
 */
export type HexString = string;

/**
 * 密码哈希结果类型
 * 包含两个核心字段：
 * - salt：盐值（用于增强密码哈希的安全性，防止彩虹表攻击）
 * - hash：密码与盐值混合后的哈希值（实际存储的验证依据）
 */
export type PasswordHash = { salt: HexString; hash: HexString };

/**
 * 加密结果类型（格式为`iv:encryptedData`）
 * - iv：初始化向量（Initialization Vector，用于AES等对称加密算法）
 * - encryptedData：实际加密后的二进制数据（十六进制编码）
 * 格式设计便于存储和解析（分割冒号即可分离iv和加密数据）
 */
type EncryptionResult = `${HexString}:${HexString}`;

// ------------------------------ 配置常量 ------------------------------
/**
 * 对称加密算法：AES-256-CBC
 * 选择理由：
 * - AES是NIST认证的标准对称加密算法，安全性经过广泛验证
 * - CBC模式需要IV（初始化向量），提供更好的抗重复攻击能力
 * - 256位密钥长度提供足够的安全强度（当前未被暴力破解）
 */
const ALGORITHM = 'aes-256-cbc' as const;

/**
 * 哈希算法：SHA-512
 * 选择理由：
 * - SHA-512属于SHA-2家族，输出长度512位（64字节），抗碰撞性更强
 * - 相比SHA-256，更适合需要更高安全性的场景（如密码哈希、数字签名）
 */
const HASH_ALGO = 'sha512' as const;

/**
 * 盐值长度（字节）：16字节（128位）
 * 盐值用于混淆密码，防止相同密码生成相同哈希（防御彩虹表攻击）
 * 16字节是平衡安全性和性能的常用选择
 */
const SALT_LENGTH = 16;

/**
 * 密钥长度（字节）：32字节（256位）
 * 匹配AES-256算法要求的密钥长度（256位=32字节）
 */
const KEY_LENGTH = 32;

/**
 * 初始化向量（IV）长度（字节）：16字节（128位）
 * AES-CBC模式要求IV长度等于块大小（AES块大小为128位=16字节）
 * IV需要随机生成且每次加密唯一（无需保密，但需与加密数据一起存储）
 */
const IV_LENGTH = 16;

/**
 * scrypt算法迭代次数：2048次
 * scrypt是内存密集型密钥派生函数，通过增加迭代次数提高暴力破解成本
 * 2048是当前推荐的平衡值（过高会影响性能，过低易被暴力破解）
 */
const SCRYPT_ITERATIONS = 2048;

// ------------------------------ 核心功能函数 ------------------------------

/**
 * 生成指定长度的随机十六进制字符串
 * 基于Node.js的`randomBytes`生成密码学安全的随机字节，并转换为十六进制
 * @param length 需要生成的十六进制字符串长度（对应字节数为`length/2`）
 * @returns 十六进制格式的随机字符串（长度严格等于`length`）
 * 示例：generateRandomHex(16) → "a3f47d2b9c1e5087..."
 */
export const generateRandomHex = (length: number): HexString =>
  randomBytes(length).toString('hex');

/**
 * 使用scrypt算法对密码进行哈希处理（带盐值）
 * 密码哈希是存储用户凭证的标准方式，避免明文存储密码
 * @param password 待哈希的原始密码（明文）
 * @param salt 可选的盐值（若不提供则自动生成16字节的随机盐）
 * @returns 包含盐值和哈希结果的对象（盐值和哈希均为十六进制字符串）
 * 注意：盐值需要与哈希结果一起存储（通常存入数据库），验证时需使用相同盐值
 */
export const hashPassword = (
  password: string,
  salt: HexString = generateRandomHex(SALT_LENGTH) // 默认生成16字节随机盐
): PasswordHash => ({
  salt,
  // scryptSync参数说明：
  // - password：原始密码（转换为Buffer）
  // - salt：盐值（十六进制转Buffer）
  // - keyLength：输出密钥长度（32字节，对应SHA-512的256位）
  // - options：迭代次数（2048次，增强计算成本）
  hash: scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_ITERATIONS // CPU/内存成本参数（越大越安全但越耗时）
  }).toString('hex') // 将Buffer转换为十六进制字符串
});

/**
 * 验证密码是否匹配存储的哈希值（防御时序攻击）
 * 使用`timingSafeEqual`进行恒定时间比较，避免通过响应时间推断密码信息
 * @param password 待验证的原始密码（明文）
 * @param salt 存储的盐值（与密码哈希时使用的盐值一致）
 * @param storedHash 存储的哈希值（数据库中保存的哈希结果）
 * @returns 验证通过返回`true`，否则返回`false`
 * 注意：即使密码错误，也应保证比较时间与正确密码一致（防止时序攻击）
 */
export const verifyPassword = (
  password: string,
  salt: HexString,
  storedHash: HexString
): boolean => {
  try {
    // 重新计算当前密码的哈希（使用相同的盐值和参数）
    const currentHash = hashPassword(password, salt).hash;
    // 恒定时间比较：比较两个Buffer的内容是否完全一致
    // 若内容不同，耗时与差异位置无关（防止通过时间差猜测密码）
    return timingSafeEqual(
      Buffer.from(currentHash, 'hex'), // 当前密码的哈希（Buffer）
      Buffer.from(storedHash, 'hex')   // 存储的哈希（Buffer）
    );
  } catch {
    // 任何异常（如参数格式错误）均视为验证失败
    return false;
  }
};

/**
 * AES-256-CBC加密（带随机IV）
 * 对称加密算法，加密和解密使用相同的密钥
 * @param plaintext 待加密的明文字符串（UTF-8编码）
 * @param secretKey 加密密钥（十六进制字符串，需为32字节/256位）
 * @returns 加密结果（格式：`iv:encryptedData`，均为十六进制字符串）
 * 注意：密钥需妥善保管（泄露会导致数据泄露），IV无需保密但需随加密数据存储
 */
export const encrypt = (
  plaintext: string,
  secretKey: HexString
): EncryptionResult => {
  // 生成16字节的随机初始化向量（IV）
  const iv = randomBytes(IV_LENGTH);
  // 创建AES-CBC加密器（需要密钥和IV）
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(secretKey, 'hex'), // 密钥（十六进制转Buffer）
    iv                           // 初始化向量（随机生成）
  );
  // 加密过程：更新（处理数据）→ 完成（处理剩余数据）
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'), // 将明文转换为Buffer并加密
    cipher.final()                    // 完成加密（处理填充数据）
  ]);
  // 合并IV和加密数据（格式：iv十六进制:加密数据十六进制）
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * AES-256-CBC解密
 * @param ciphertext 加密数据（格式：`iv:encryptedData`，十六进制字符串）
 * @param secretKey 解密密钥（需与加密时使用的密钥一致）
 * @returns 解密后的原始明文字符串（UTF-8编码）
 * 注意：密钥错误或数据被篡改时，`decipher.final()`会抛出异常
 */
export const decrypt = (
  ciphertext: EncryptionResult,
  secretKey: HexString
): string => {
  // 分割IV和加密数据（格式验证：必须包含一个冒号）
  const [ivHex, encryptedHex] = ciphertext.split(':');
  // 创建AES-CBC解密器（需要相同的密钥和IV）
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(secretKey, 'hex'), // 密钥（十六进制转Buffer）
    Buffer.from(ivHex, 'hex')      // IV（十六进制转Buffer）
  );
  // 解密过程：更新（处理数据）→ 完成（处理剩余数据）
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')), // 解密加密数据
    decipher.final()                                   // 完成解密（处理填充）
  ]).toString('utf8'); // 转换为UTF-8字符串
};

/**
 * 生成数据的哈希值（支持可选盐值）
 * 哈希函数用于验证数据完整性（如文件校验、数据防篡改）
 * @param data 待哈希的数据（字符串）
 * @param salt 可选的盐值（增强哈希的抗碰撞性，推荐使用）
 * @returns 数据的哈希值（十六进制字符串，使用SHA-512算法）
 * 注意：相同数据和盐值会生成相同的哈希（可用于校验数据是否被篡改）
 */
export const generateHash = (
  data: string,
  salt?: HexString
): HexString => {
  const hash = createHash(HASH_ALGO); // 创建SHA-512哈希器
  if (salt) hash.update(salt);        // 若提供盐值，先更新盐值（增强混淆）
  return hash.update(data).digest('hex'); // 更新数据并生成十六进制哈希
};

/**
 * 生成HMAC签名（基于SHA-512）
 * HMAC（哈希消息认证码）用于验证数据的完整性和来源真实性
 * @param data 待签名的数据（字符串）
 * @param key HMAC密钥（字符串，需妥善保管）
 * @returns HMAC签名值（十六进制字符串）
 * 注意：密钥泄露会导致签名被伪造，需使用高强度密钥（推荐随机生成）
 */
export const generateHmac = (
  data: string,
  key: string
): HexString => createHmac(HASH_ALGO, key) // 创建HMAC实例（SHA-512算法+密钥）
  .update(data)                           // 更新待签名的数据
  .digest('hex');                         // 生成十六进制签名

/**
 * 生成安全随机令牌（密码学安全的随机字符串）
 * 适用于生成API密钥、会话令牌、验证码等需要高随机性的场景
 * @param byteLength 令牌的字节长度（默认32字节，对应64位十六进制字符串）
 * @returns 随机令牌（十六进制字符串，长度为`byteLength*2`）
 * 注意：使用`crypto.randomBytes`而非`Math.random`，确保随机性不可预测
 */
export const generateSecureToken = (byteLength = 32): HexString =>
  randomBytes(byteLength).toString('hex');

// ------------------------------ 工具集导出 ------------------------------
/**
 * 密码学工具集（常量导出防止意外修改）
 * 包含所有核心功能函数的只读引用
 */
export const CryptoUtils = {
  generateRandomHex,
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  generateHash,
  generateHmac,
  generateSecureToken
} as const;
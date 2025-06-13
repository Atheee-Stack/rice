/**
 * 消息序列化工具单元测试
 * @domain 基础设施层/消息传递
 */

import {
  SerializationError,
  MessageEnvelope,
  jsonSerializer,
  jsonDeserializer,
  createMessageSerializer,
  createMessageDeserializer,
  isRecord,
  isString,
  combineGuards,
  Serializer,
  Deserializer
} from '../message.serializer';
import { err, ok } from '@rice/core-kernel';

// ===================== 测试数据结构 =====================
/** @domain 测试用户类型 */
interface TestUser {
  id: string;
  name: string;
}

/** @domain 测试消息信封 */
const validEnvelope: MessageEnvelope<TestUser> = {
  metadata: {
    messageId: 'msg-123',
    timestamp: '2025-06-13T08:00:00Z',
    messageType: 'UserCreated'
  },
  payload: { id: 'usr-001', name: 'Alice' }
};

// ===================== 类型守卫工具 =====================
describe('typeGuards', () => {
  it('isRecord 验证对象类型', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: 'value' })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('string')).toBe(false);
    expect(isRecord(123)).toBe(false);
  });

  it('isString 验证字符串类型', () => {
    expect(isString('text')).toBe(true);
    expect(isString('')).toBe(true);
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString({})).toBe(false);
  });

  it('combineGuards 组合多个类型守卫', () => {
    // 修复：确保类型兼容
    const isStringRecord = combineGuards(
      isRecord,
      (x: unknown): x is Record<string, string> => {
        if (!isRecord(x)) return false;
        return Object.values(x).every(v => typeof v === 'string');
      }
    );

    expect(isStringRecord({})).toBe(true);
    expect(isStringRecord({ key: 'value' })).toBe(true);
    expect(isStringRecord({ key: 123 })).toBe(false);
    expect(isStringRecord('string')).toBe(false);
  });
});

// ===================== 基础序列化工具 =====================
describe('jsonSerializer', () => {
  it('成功序列化有效对象', () => {
    const serializer = jsonSerializer<TestUser>();
    const result = serializer(validEnvelope.payload);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(JSON.stringify(validEnvelope.payload));
  });

  it('处理无法序列化的对象', () => {
    // 通过类型声明解决 any 类型问题
    interface Circular {
      self?: Circular;
    }

    const circularReference: Circular = { self: undefined };
    circularReference.self = circularReference;

    const serializer = jsonSerializer<Circular>();
    const result = serializer(circularReference);

    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr()).toBeInstanceOf(SerializationError);
    expect(result.unwrapErr().originalError).toBeDefined();
  });
});

// ===================== 基础反序列化工具 =====================
describe('jsonDeserializer', () => {
  it('成功反序列化有效JSON', () => {
    const jsonStr = JSON.stringify(validEnvelope.payload);
    const deserializer = jsonDeserializer<TestUser>();
    const result = deserializer(jsonStr);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validEnvelope.payload);
  });

  it('验证器拒绝无效数据', () => {
    const invalidJson = JSON.stringify({ id: 123, name: 456 }); // 类型错误

    const validator = (parsed: unknown): parsed is TestUser =>
      isRecord(parsed) &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string';

    const deserializer = jsonDeserializer<TestUser>(validator);
    const result = deserializer(invalidJson);

    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr()).toBeInstanceOf(SerializationError);
    expect(result.unwrapErr().message).toContain('Validation failed');
  });

  it('处理无效JSON字符串', () => {
    const deserializer = jsonDeserializer<TestUser>();
    const result = deserializer('{invalid-json}');

    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr()).toBeInstanceOf(SerializationError);
    expect(result.unwrapErr().originalError).toBeDefined();
  });
});

// ===================== 消息信封序列化 =====================
describe('createMessageSerializer', () => {
  it('成功序列化完整信封', () => {
    const serializer = createMessageSerializer<TestUser>();
    const result = serializer(validEnvelope);

    expect(result.isOk()).toBe(true);

    const serialized = result.unwrap();
    const parsed = JSON.parse(serialized);

    expect(parsed.metadata).toEqual(validEnvelope.metadata);
    expect(parsed.payload).toBe(JSON.stringify(validEnvelope.payload));
  });

  it('处理无效的负载序列化', () => {
    const invalidPayload: MessageEnvelope<string> = {
      ...validEnvelope,
      payload: 'unserializable'
    };

    const payloadSerializer: Serializer<string, string> = () => err(
      new SerializationError(undefined, 'Forced error')
    );

    const serializer = createMessageSerializer<string>(payloadSerializer);
    const result = serializer(invalidPayload);

    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr().message).toEqual('Forced error');
  });
});

// ===================== 消息信封反序列化 =====================
describe('createMessageDeserializer', () => {
  const validSerializedEnvelope = JSON.stringify({
    metadata: validEnvelope.metadata,
    payload: JSON.stringify(validEnvelope.payload)
  });

  it('成功反序列化完整信封', () => {
    const deserializer = createMessageDeserializer<TestUser>();
    const result = deserializer(validSerializedEnvelope);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validEnvelope);
  });

  it('处理外层信封反序列化失败', () => {
    const deserializer = createMessageDeserializer<TestUser>();
    const result = deserializer('{invalid-json}');

    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr()).toBeInstanceOf(SerializationError);
  });

  it('处理内层负载反序列化失败', () => {
    const malformedEnvelope = JSON.stringify({
      metadata: validEnvelope.metadata,
      payload: '{invalid-json}' // 无效JSON
    });

    const deserializer = createMessageDeserializer<TestUser>();
    const result = deserializer(malformedEnvelope);

    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr()).toBeInstanceOf(SerializationError);
  });

  it('自定义负载处理逻辑', () => {
    const base64Envelope = JSON.stringify({
      metadata: validEnvelope.metadata,
      payload: 'base64-encoded-string'
    });

    const payloadDeserializer: Deserializer<string, string> = (input) =>
      ok(`decoded-${input}`);

    const deserializer = createMessageDeserializer<string>(payloadDeserializer);
    const result = deserializer(base64Envelope);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().payload).toEqual('decoded-base64-encoded-string');
  });
});
import { err, Result, ok } from "@rice/core-kernel";

// ===================== 类型定义 =====================
/**
 * @domain 表示序列化/反序列化过程中发生的错误
 * 
 * @param originalError - 原始错误对象
 * @param message - 自定义错误信息
 */
export class SerializationError extends Error {
  constructor(
    public readonly originalError: unknown,
    message = "Message serialization failed"
  ) {
    super(message);
    this.name = "SerializationError";
  }
}

/**
 * @domain 消息信封格式的通用接口
 * 
 * @template T - 消息有效负载的类型
 */
export interface MessageEnvelope<T> {
  metadata: {
    messageId: string;      // 消息唯一标识符
    timestamp: string;     // 消息创建时间戳
    messageType: string;   // 消息类型标识符
  };
  payload: T;              // 消息实际负载数据
}

/**
 * @domain 序列化函数类型定义
 * 
 * @template T - 输入数据类型
 * @template U - 输出数据类型
 */
export type Serializer<T, U> = (input: T) => Result<U, SerializationError>;

/**
 * @domain 反序列化函数类型定义
 * 
 * @template T - 输出数据类型
 * @template U - 输入数据类型
 */
export type Deserializer<T, U> = (input: U) => Result<T, SerializationError>;

// ===================== 基础序列化工具 =====================
/**
 * @domain 创建基础JSON序列化器
 * 
 * @returns 将任意对象序列化为JSON字符串的函数
 */
export const jsonSerializer = <T>(): Serializer<T, string> => {
  return (input: T) => {
    try {
      return ok(JSON.stringify(input));
    } catch (error) {
      return err(
        new SerializationError(
          error,
          error instanceof Error ? error.message : undefined
        )
      );
    }
  };
};

/**
 * @domain 创建基础JSON反序列化器
 * 
 * @param validator - 可选的有效性验证函数
 * @returns 将JSON字符串反序列化为指定类型的函数
 */
export const jsonDeserializer = <T>(
  validator?: (parsed: unknown) => parsed is T
): Deserializer<T, string> => {
  return (input: string) => {
    try {
      const parsed = JSON.parse(input);
      if (validator && !validator(parsed)) {
        return err(new SerializationError(undefined, "Validation failed"));
      }
      return ok(parsed as T);
    } catch (error) {
      return err(
        new SerializationError(
          error,
          error instanceof Error ? error.message : undefined
        )
      );
    }
  };
};

// ===================== 消息信封工具 =====================
/**
 * @domain 创建消息信封序列化器
 * 
 * @param payloadSerializer - 可选的有效负载自定义序列化器
 * @returns 将消息信封对象序列化为字符串的函数
 */
export const createMessageSerializer = <T>(
  payloadSerializer: Serializer<T, string> = jsonSerializer<T>()
): Serializer<MessageEnvelope<T>, string> => {
  return (envelope: MessageEnvelope<T>) => {
    // 首先序列化payload
    const serializedPayload = payloadSerializer(envelope.payload);

    // 如果payload序列化失败，直接返回错误
    if (!serializedPayload.isOk()) {
      return serializedPayload;
    }

    const payloadStr = serializedPayload.value;
    // 组装可序列化的信封结构
    const serializableEnvelope = {
      metadata: envelope.metadata,
      payload: payloadStr,  // 此时payload已是序列化后的字符串
    };

    // 序列化整个信封对象
    return jsonSerializer<typeof serializableEnvelope>()(serializableEnvelope);
  };
};

/**
 * @domain 创建消息信封反序列化器
 * 
 * @param payloadDeserializer - 可选的有效负载自定义反序列化器
 * @returns 将字符串反序列化为消息信封对象的函数
 */
export const createMessageDeserializer = <T>(
  payloadDeserializer: Deserializer<T, string> = jsonDeserializer<T>()
): Deserializer<MessageEnvelope<T>, string> => {
  return (input: string) => {
    // 首先反序列化信封外层结构
    const deserializedEnvelope = jsonDeserializer<{
      metadata: MessageEnvelope<T>["metadata"];
      payload: string;
    }>()(input);

    // 如果信封反序列化失败，直接返回错误
    if (!deserializedEnvelope.isOk()) {
      return deserializedEnvelope;
    }

    const envelope = deserializedEnvelope.value;
    // 反序列化payload部分
    const deserializedPayload = payloadDeserializer(envelope.payload);

    // 如果payload反序列化失败，返回错误
    if (!deserializedPayload.isOk()) {
      return deserializedPayload;
    }

    const payload = deserializedPayload.value;
    // 组装最终的消息信封对象
    return ok({
      metadata: envelope.metadata,
      payload,
    });
  };
};

// ===================== 类型守卫工具 =====================
/**
 * @domain 检查对象是否为标准键值对记录
 * 
 * @param x - 待检查对象
 * @returns 是否是Record<string, unknown>
 */
export const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * @domain 检查值是否为字符串
 * 
 * @param x - 待检查值
 * @returns 是否是字符串
 */
export const isString = (x: unknown): x is string => typeof x === "string";

/**
 * @domain 组合多个类型守卫函数
 * 
 * @param guards - 类型守卫函数数组
 * @returns 组合后的类型守卫函数
 */
export const combineGuards = <T>(
  ...guards: ((x: unknown) => x is T)[]
): ((x: unknown) => x is T) => {
  return (x: unknown): x is T => guards.every((guard) => guard(x));
};
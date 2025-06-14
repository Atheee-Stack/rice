// rice/libs/user/domain/src/value-objects/role.vo.ts
import {
  ValueObject,
  ValueObjectProps,
  Result,
  ok,
  err
} from "@rice/core-kernel";

/**
 * @domain 角色值对象属性定义
 * 
 * 包含角色的唯一标识符和元数据
 */
interface RoleProps extends ValueObjectProps {
  /**
   * 角色的唯一标识符
   * 
   * - 必须符合预定义的角色类型
   * - 值对象不可修改
   */
  code: string;

  /**
   * 角色的人类可读名称
   * 
   * - 用于显示在UI和管理界面
   */
  displayName?: string;
}

/**
 * @domain 权限值对象
 * 
 * 表示系统中的单个权限，使用值对象包装
 */
export class PermissionVO extends ValueObject<{ value: string }> {
  get value(): string {
    return this.props.value;
  }

  protected validate(props: { value: string }): { value: string } {
    if (!PermissionVO.isValidPermission(props.value)) {
      throw new Error(`Invalid permission: ${props.value}`);
    }
    return { value: props.value.trim() };
  }

  static isValidPermission(permission: string): boolean {
    return typeof permission === 'string' && permission.trim().length >= 3;
  }

  static create(permission: string): Result<PermissionVO, Error> {
    try {
      return ok(new PermissionVO({ value: permission }));
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error('Invalid permission')
      );
    }
  }
}

/**
 * @domain 系统预定义角色类型
 * 
 * 常量枚举确保类型安全，防止无效角色代码
 */
export const SystemRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
  GUEST: 'GUEST',
  SUPPORT: 'SUPPORT',
  AUDITOR: 'AUDITOR',
} as const;

// 创建 SystemRole 类型
export type SystemRole = keyof typeof SystemRoles;

/**
 * @domain 角色值对象
 * 
 * 表示系统中的安全角色，用于访问控制和权限管理
 * 
 * 特性：
 * 1. 严格验证角色代码格式
 * 2. 支持可选元数据（显示名称）
 * 3. 预定义系统角色常量
 * 4. 确保角色不可变性
 * 5. 提供权限管理接口
 */
export class RoleVO extends ValueObject<RoleProps> {
  private _permissions: PermissionVO[] = [];

  /**
   * 获取角色代码
   */
  get code(): string {
    return this.props.code;
  }

  /**
   * 获取角色显示名称（如有）
   */
  get displayName(): string | undefined {
    return this.props.displayName;
  }

  /**
   * 获取角色权限集合
   */
  get permissions(): string[] {
    return this._permissions.map(p => p.value);
  }

  /**
   * @domain 验证方法实现
   * @param props 角色属性
   * @returns 验证后的角色属性
   * 
   * 验证规则：
   * 1. 角色代码必须为大写字母和数字组成
   * 2. 角色代码长度在3-50字符之间
   */
  protected validate(props: RoleProps): RoleProps {
    const normalizedCode = props.code.trim().toUpperCase();

    if (!RoleVO.isValidRoleCode(normalizedCode)) {
      throw new Error(`Invalid role code format: ${props.code}`);
    }

    return {
      ...props,
      code: normalizedCode
    };
  }

  /**
   * @domain 添加权限
   * @param permission 权限字符串
   * @returns 添加结果
   */
  addPermission(permission: string): Result<RoleVO, Error> {
    const result = PermissionVO.create(permission);
    if (result.isFail()) return result;

    this._permissions.push(result.unwrap());
    return ok(this);
  }

  /**
   * @domain 批量添加权限
   * @param permissions 权限列表
   * @returns 添加结果
   */
  addPermissions(permissions: string[]): Result<RoleVO, Error> {
    for (const permission of permissions) {
      const result = this.addPermission(permission);
      if (result.isFail()) return result;
    }
    return ok(this);
  }

  /**
   * @domain 静态方法：验证角色代码格式
   * @param code 角色代码
   * @returns 是否有效
   */
  static isValidRoleCode(code: string): boolean {
    return /^[A-Z0-9_]{3,50}$/.test(code);
  }

  /**
   * @domain 工厂方法创建角色值对象
   * @param code 角色代码
   * @param displayName 可选显示名称
   * @param permissions 可选权限列表
   * @returns Result类型的结果
   */
  static create(
    code: string,
    displayName?: string,
    permissions?: string[]
  ): Result<RoleVO, Error> {
    try {
      const role = new RoleVO({ code, displayName });

      // 添加权限（如果提供）
      if (permissions) {
        const result = role.addPermissions(permissions);
        if (result.isFail()) return result;
      }

      return ok(role);
    } catch (error: unknown) {
      return err(
        error instanceof Error
          ? error
          : new Error('Unknown error creating RoleVO')
      );
    }
  }

  /**
   * @domain 是否为系统预定义角色
   * @returns 是否是系统角色
   * 
   * 使用类型安全的比较方法
   */
  isSystemRole(): boolean {
    // 获取所有系统角色的值
    const systemRoleValues = Object.values(SystemRoles);

    // 使用类型安全的方式检查
    return systemRoleValues.some((roleValue: string) =>
      roleValue === this.code
    );
  }

  /**
   * @domain 比较两个角色值对象是否相等
   * @param vo 要比较的值对象
   * @returns 是否相等
   * 
   * 比较规则：仅比较角色代码，忽略其他元数据
   */
  override equals(vo?: ValueObject<ValueObjectProps>): boolean {
    return vo instanceof RoleVO && this.code === vo.code;
  }
}
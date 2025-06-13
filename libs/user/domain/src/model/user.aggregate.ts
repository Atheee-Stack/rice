import {
  AggregateRoot,
  EntityProps,
  DomainEvent,
  DomainException
} from '@rice/core-kernel';
import { HashedPasswordVO } from '../value-objects/hashed-password.vo';
import { Result, err, ok } from '@rice/core-kernel';
import type { UserProfile } from '../types/user.types';
import { PasswordPolicyService } from 'src/service/password-policy.service';
import { EmailVO } from 'src/value-objects/email.vo';
import { RoleVO } from 'src/value-objects/role.vo';
import { UsernamePolicyService } from 'src/service/username-policy.service';

/**
 * 用户聚合根 - 核心领域模型
 * 负责用户生命周期管理和业务规则执行
 * @domain user
 */
export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps) {
    super(props);
  }

  // ===================== 领域服务工厂方法 =====================
  /**
   * 创建新用户（安全工厂方法）
   * @param profile 用户配置数据
   * @param password 原始密码明文
   * @param policies 领域服务实例
   * @returns Result封装的结果
   */
  static create(
    profile: UserProfile,
    password: string,
    policies: {
      passwordPolicy: PasswordPolicyService;
      usernamePolicy: UsernamePolicyService;
    }
  ): Result<User, DomainException> {
    // 验证用户名格式
    const usernameResult = policies.usernamePolicy.validate(profile.name);
    if (!usernameResult.isOk()) {
      return err(usernameResult.unwrapErr());
    }

    // 密码哈希处理
    const passwordResult = HashedPasswordVO.create(
      password,
      policies.passwordPolicy
    );
    if (!passwordResult.isOk()) {
      return err(passwordResult.unwrapErr());
    }

    // 构建基础属性
    const props: UserProps = {
      id: generateUserId(),
      username: profile.username,
      email: new EmailVO(profile.email),
      password: passwordResult.unwrap(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: profile.roles.map(role => new RoleVO(role)),
      mfaEnabled: false
    };

    // 领域规则验证
    if (props.roles.some(role => role.isAdmin) && profile.emailDomain !== 'company.com') {
      return err(
        new DomainException(
          'USER.INVALID_ADMIN_DOMAIN',
          'Admin users must have company email'
        )
      );
    }

    const user = new User(props);

    // 发布用户创建事件
    user.addDomainEvent(
      new UserCreatedEvent({
        userId: user.id,
        username: user.username,
        email: user.email.value
      })
    );

    return ok(user);
  }

  // ===================== 业务行为方法 =====================
  /**
   * 更改密码（强业务规则约束）
   * @param oldPassword 原密码
   * @param newPassword 新密码
   * @param policy 密码策略服务
   */
  changePassword(
    oldPassword: string,
    newPassword: string,
    policy: PasswordPolicyService
  ): Result<void, DomainException> {
    // 验证原密码
    if (!this.props.password.compare(oldPassword)) {
      return err(
        new DomainException(
          'USER.INVALID_PASSWORD',
          'Current password is incorrect'
        )
      );
    }

    // 生成新密码哈希
    const newPasswordResult = HashedPasswordVO.create(
      newPassword,
      policy
    );
    if (!newPasswordResult.isOk()) {
      return newPasswordResult;
    }

    // 应用变更
    this.props.password = newPasswordResult.unwrap();
    this.props.updatedAt = new Date();

    // 发布事件
    this.addDomainEvent(
      new PasswordChangedEvent({
        userId: this.id
      })
    );

    return ok(undefined);
  }

  /**
   * 启用MFA（领域规则检查）
   * @param secret TOTP密钥
   */
  enableMfa(secret: string): Result<void, DomainException> {
    if (this.mfaEnabled) {
      return err(
        new DomainException(
          'USER.MFA_ALREADY_ENABLED',
          'MFA is already enabled for this user'
        )
      );
    }

    // 验证MFA策略
    if (!MfaPolicyService.canEnableFor(this.props.email.domain)) {
      return err(
        new DomainException(
          'USER.MFA_POLICY_VIOLATION',
          'MFA not allowed for this email domain'
        )
      );
    }

    this.props.mfaEnabled = true;
    this.props.mfaSecret = secret;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new MfaEnabledEvent({
        userId: this.id
      })
    );

    return ok(undefined);
  }

  /**
   * 验证登录凭证（核心安全方法）
   * @param credential 登录凭证
   * @param mfaCode 可选MFA验证码
   * @returns 认证结果
   */
  async verifyCredential(
    credential: CredentialDTO,
    mfaCode?: string
  ): Promise<Result<AuthToken, DomainException>> {
    // 密码验证
    if (!(await this.props.password.compare(credential.password))) {
      return err(
        new DomainException(
          'USER.INVALID_CREDENTIALS',
          'Invalid username or password'
        )
      );
    }

    // MFA二次验证
    if (this.mfaEnabled) {
      const mfaResult = this.verifyMfaCode(mfaCode);
      if (!mfaResult.isOk()) {
        return mfaResult;
      }
    }

    // 更新登录状态
    this.props.lastLoginAt = new Date();

    return ok(generateAuthToken(this.id, this.roles));
  }

  // ===================== 保护方法 =====================
  private verifyMfaCode(
    code: string | undefined
  ): Result<void, DomainException> {
    if (!code) {
      return err(
        new DomainException(
          'USER.MFA_REQUIRED',
          'MFA code is required for this account'
        )
      );
    }

    if (!TOTPService.verify(this.mfaSecret!, code)) {
      return err(
        new DomainException(
          'USER.INVALID_MFA_CODE',
          'Invalid MFA authentication code'
        )
      );
    }

    return ok(undefined);
  }

  // ===================== 值对象访问器 =====================
  public get username(): string {
    return this.props.username;
  }

  public get email(): EmailVO {
    return this.props.email;
  }

  public get roles(): RoleVO[] {
    return [...this.props.roles];
  }

  public get status(): UserStatus {
    return this.props.status;
  }

  public get mfaEnabled(): boolean {
    return !!this.props.mfaEnabled;
  }

  // ===================== 业务规则访问器 =====================
  public get isAccountLocked(): boolean {
    return this.props.status === 'locked';
  }

  public get isAdminUser(): boolean {
    return this.props.roles.some(role => role.isAdmin);
  }
}

// ===================== 类型定义 =====================
interface UserProps extends EntityProps {
  id: string;
  username: string;
  email: EmailVO;
  password: HashedPasswordVO;
  roles: RoleVO[];
  status: 'active' | 'locked' | 'disabled';
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

type CredentialDTO = {
  username: string;
  password: string;
};

// ===================== 领域事件 =====================
export class UserCreatedEvent extends DomainEvent<User> {
  constructor(props: { userId: string; username: string; email: string }) {
    super(props.aggregate);
  }

  toPlainObject() {
    return {
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      timestamp: this.timestamp.toISOString(),
      payload: {
        userId: this.aggregate.id,
        username: this.aggregate.username,
        email: this.aggregate.email.value
      }
    };
  }
}

class PasswordChangedEvent extends DomainEvent<User> {/* 实现类似 */ }
class MfaEnabledEvent extends DomainEvent<User> {/* 实现类似 */ }
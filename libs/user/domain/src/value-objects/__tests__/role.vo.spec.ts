// rice/libs/user/domain/src/value-objects/__tests__/role.vo.spec.ts

import { RoleVO, PermissionVO, SystemRoles } from '../role.vo';
import { describe, test, expect, beforeEach } from '@jest/globals';

describe('PermissionVO', () => {
  test('创建有效的权限', () => {
    const result = PermissionVO.create('user.create');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('user.create');
  });

  test('自动修剪权限字符串', () => {
    const result = PermissionVO.create('  user.delete  ');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('user.delete');
  });

  test('拒绝无效权限（过短）', () => {
    const result = PermissionVO.create('ab');
    expect(result.isFail()).toBe(true);
    expect(result.unwrapErr().message).toContain('Invalid permission');
  });

  test('拒绝无效权限（非字符串）', () => {
    // @ts-expect-error 测试无效输入
    const result = PermissionVO.create(123);
    expect(result.isFail()).toBe(true);
  });

  test('验证有效的权限格式', () => {
    expect(PermissionVO.isValidPermission('valid.permission')).toBe(true);
  });

  test('验证无效的权限格式', () => {
    expect(PermissionVO.isValidPermission('')).toBe(false);
    expect(PermissionVO.isValidPermission('a')).toBe(false);
    expect(PermissionVO.isValidPermission('   ')).toBe(false);
  });
});

describe('RoleVO', () => {
  const validRoleCode = 'ADMIN';
  const validRoleWithSpaces = '  manager  ';
  const invalidRoleCode = 'invalid role';
  const customRoleCode = 'CUSTOM_ROLE';

  beforeEach(() => {
    // 重置任何模拟或状态
  });

  test('创建有效的角色（无权限）', () => {
    const result = RoleVO.create(validRoleCode, 'Admin Role');
    expect(result.isOk()).toBe(true);

    const role = result.unwrap();
    expect(role.code).toBe('ADMIN');
    expect(role.displayName).toBe('Admin Role');
    expect(role.permissions).toEqual([]);
  });

  test('创建角色带有效权限', () => {
    const result = RoleVO.create(
      customRoleCode,
      'Custom Role',
      ['perm.create', 'perm.view']
    );

    expect(result.isOk()).toBe(true);

    const role = result.unwrap();
    expect(role.code).toBe('CUSTOM_ROLE');
    expect(role.permissions).toEqual(['perm.create', 'perm.view']);
  });

  test('自动规范化角色代码', () => {
    const result = RoleVO.create(validRoleWithSpaces);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().code).toBe('MANAGER');
  });

  test('拒绝无效角色代码（特殊字符）', () => {
    const result = RoleVO.create(invalidRoleCode);
    expect(result.isFail()).toBe(true);
    expect(result.unwrapErr().message).toContain('Invalid role code format');
  });

  test('拒绝无效角色代码（过短）', () => {
    const result = RoleVO.create('AB');
    expect(result.isFail()).toBe(true);
  });

  test('拒绝无效角色代码（过长）', () => {
    const longCode = 'A'.repeat(51);
    const result = RoleVO.create(longCode);
    expect(result.isFail()).toBe(true);
  });

  test('拒绝带有无效权限的角色', () => {
    const result = RoleVO.create(
      customRoleCode,
      'Invalid Permissions Role',
      ['valid', 'in', ''] // 包含无效权限
    );

    expect(result.isFail()).toBe(true);
    expect(result.unwrapErr().message).toContain('Invalid permission');
  });

  test('添加单个有效权限', () => {
    const role = RoleVO.create(customRoleCode).unwrap();
    const result = role.addPermission('new.permission');

    expect(result.isOk()).toBe(true);
    expect(role.permissions).toEqual(['new.permission']);
  });

  test('添加多个有效权限', () => {
    const role = RoleVO.create(customRoleCode).unwrap();
    const result = role.addPermissions(['perm1', 'perm2', 'perm3']);

    expect(result.isOk()).toBe(true);
    expect(role.permissions).toEqual(['perm1', 'perm2', 'perm3']);
  });

  test('添加无效权限时保留原始状态', () => {
    const role = RoleVO.create(customRoleCode, '', ['existing.perm']).unwrap();
    const originalPermissions = [...role.permissions];

    const result = role.addPermission('invalid');

    expect(result.isFail()).toBe(true);
    // 确保角色未修改
    expect(role.permissions).toEqual(originalPermissions);
  });

  test('系统角色检测', () => {
    const adminRole = RoleVO.create(SystemRoles.ADMIN).unwrap();
    expect(adminRole.isSystemRole()).toBe(true);

    const customRole = RoleVO.create(customRoleCode).unwrap();
    expect(customRole.isSystemRole()).toBe(false);
  });

  test('所有系统角色检测正确', () => {
    for (const roleCode of Object.values(SystemRoles)) {
      const role = RoleVO.create(roleCode).unwrap();
      expect(role.isSystemRole()).toBe(true);
    }
  });

  test('相等性比较：相同代码', () => {
    const role1 = RoleVO.create('TEST_ROLE', 'Role 1').unwrap();
    const role2 = RoleVO.create('TEST_ROLE', 'Role 2').unwrap();
    expect(role1.equals(role2)).toBe(true);
  });

  test('相等性比较：不同代码', () => {
    const role1 = RoleVO.create('ROLE_A').unwrap();
    const role2 = RoleVO.create('ROLE_B').unwrap();
    expect(role1.equals(role2)).toBe(false);
  });

  test('相等性比较：不同对象类型', () => {
    const role = RoleVO.create('TEST_ROLE').unwrap();
    const otherObject = { code: 'TEST_ROLE' };
    // @ts-expect-error 测试无效比较
    expect(role.equals(otherObject)).toBe(false);
  });

  test('相等性比较：undefined', () => {
    const role = RoleVO.create('TEST_ROLE').unwrap();
    // 测试有效的边缘情况
    expect(role.equals(undefined)).toBe(false);
  });
});

describe('RoleVO 边界情况', () => {
  test('最小长度角色代码', () => {
    const minCode = 'ABC';
    const result = RoleVO.create(minCode);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().code).toBe('ABC');
  });

  test('最大长度角色代码', () => {
    const maxCode = 'R_'.repeat(25).slice(0, 50); // 确保正好50字符
    const result = RoleVO.create(maxCode);
    expect(result.isOk()).toBe(true);
  });

  test('空权限列表', () => {
    const role = RoleVO.create('TEST_ROLE', undefined, []).unwrap();
    expect(role.permissions).toEqual([]);
  });

  test('重复权限自动处理', () => {
    const role = RoleVO.create(
      'TEST_ROLE',
      undefined,
      ['perm', 'perm', 'other.perm']
    ).unwrap();

    // 注意：实现不自动去重，取决于业务需求
    expect(role.permissions).toEqual(['perm', 'perm', 'other.perm']);
  });

  test('大量权限性能测试', () => {
    const permissions = Array(1000).fill(0).map((_, i) => `perm.${i}`);
    const result = RoleVO.create('PERF_TEST', undefined, permissions);
    expect(result.isOk()).toBe(true);
  });
});
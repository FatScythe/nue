import { Injectable } from '@nestjs/common';

import { and, eq, ilike, isNull, or } from 'drizzle-orm';

import {
  actionLabels,
  DEFAULT_PERMISSION,
  resourceLabels,
  Resources,
  RoleRepository,
  Roles,
  RoleStatus,
  UserRepository,
  Users,
  UserStatus,
  validScopes,
} from '@libs/database';
import { calculatePaginationMeta, PortalReqUser } from '@libs/common';

import { ClientException } from '../common/exceptions';
import { CreateRoleDto, GetAllRoles, UpdateRoleDto } from './dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async createRole(dto: CreateRoleDto, user: PortalReqUser) {
    const { tenantId } = user;
    const { name, permissions } = dto;

    const roleExist = await this.roleRepo.exists(
      and(
        eq(Roles.name, dto.name),
        eq(Roles.tenantId, tenantId!),
        isNull(Roles.deletedAt),
      ),
    );

    if (roleExist)
      throw new ClientException(`Role with name - ${dto.name} already exist`);

    await this.roleRepo.create({
      name,
      permissions,
      status: RoleStatus.Active,
      tenantId: tenantId!,
    });

    return { message: 'role created sucessfully' };
  }

  async updateRole({
    roleId,
    dto,
    user,
  }: {
    roleId: string;
    dto: UpdateRoleDto;
    user: PortalReqUser;
  }) {
    const { tenantId } = user;
    const { name, permissions } = dto;

    const role = await this.roleRepo.findOne({
      where: and(
        eq(Roles.id, roleId),
        eq(Roles.tenantId, tenantId!),
        isNull(Roles.deletedAt),
      ),
    });

    if (!role) throw new ClientException('Role not found or access denied');

    // if name is being changed, check for duplicates in the same tenant org...
    if (name && name !== role.name) {
      const nameExists = await this.roleRepo.exists(
        and(
          eq(Roles.name, name),
          eq(Roles.tenantId, tenantId!),
          isNull(Roles.deletedAt),
        ),
      );

      if (nameExists) {
        throw new ClientException(
          `Role "${name}" already exists in your organization`,
        );
      }
    }

    // update the role...
    const updateObj: Partial<typeof Roles.$inferInsert> = {
      ...(name && { name }),
      ...(permissions && { permissions }),
    };

    // only trigger the update if there are changes...
    if (Object.keys(updateObj).length > 0) {
      await this.roleRepo.update(eq(Roles.id, roleId), updateObj);
    }

    return { message: 'role updated successfully' };
  }

  async getAllRoles(query: GetAllRoles, user: PortalReqUser) {
    const page = Number(query.page ?? '1');
    const limit = Number(query.limit ?? '10');
    const offset = (page - 1) * limit;

    const conditions = [
      isNull(Roles.deletedAt),
      or(eq(Roles.tenantId, user.tenantId!), isNull(Roles.tenantId)),
    ];

    if (query.search) {
      conditions.push(ilike(Roles.name, `%${query.search}%`));
    }

    const whereClause = and(...conditions);

    const [roles, total] = await this.roleRepo.findAndCount({
      where: whereClause,
      limit,
      offset,
      selectFn: (rolesTable) => ({
        id: rolesTable.id,
        name: rolesTable.name,
        status: rolesTable.status,
        permissions: rolesTable.permissions,
        createdAt: rolesTable.createdAt,
        tenantId: rolesTable.tenantId,
      }),
    });

    return {
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        status: role.status,
        permissions: role.permissions,
        createdAt: role.createdAt,
        isCustomRole: role.tenantId === user.tenantId,
      })),
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async activateRole(roleId: string, adminUser: PortalReqUser) {
    const role = await this.roleRepo.findOne({
      where: and(
        eq(Roles.id, roleId),
        eq(Roles.tenantId, adminUser.tenantId!),
        isNull(Roles.deletedAt),
      ),
    });

    if (!role) {
      throw new ClientException('Role not found', 'ROL001');
    }

    if (role.status === RoleStatus.Active) {
      throw new ClientException('Role is already active', 'ROL002');
    }

    // update status to active...
    await this.roleRepo.update(eq(Roles.id, roleId), {
      status: RoleStatus.Active,
    });

    return { message: 'Role activated successfully' };
  }

  async deactivateRole(roleId: string, adminUser: PortalReqUser) {
    const role = await this.roleRepo.findOne({
      where: and(
        eq(Roles.id, roleId),
        eq(Roles.tenantId, adminUser.tenantId!),
        isNull(Roles.deletedAt),
      ),
    });

    if (!role) {
      throw new ClientException('Role not found', 'ROL001');
    }

    if (role.status === RoleStatus.Inactive) {
      throw new ClientException('Role is already inactive', 'ROL003');
    }

    // ensure no active users are currently assigned to this role before deactivating it...
    const assignedUsersCount = await this.userRepo.count(
      and(
        eq(Users.roleId, roleId),
        eq(Users.tenantId, adminUser.tenantId!),
        eq(Users.status, UserStatus.Active),
      ),
    );

    if (assignedUsersCount > 0) {
      throw new ClientException(
        `Cannot deactivate role because it is currently assigned to ${assignedUsersCount} active user(s)`,
        'ROL004',
      );
    }

    await this.roleRepo.update(eq(Roles.id, roleId), {
      status: RoleStatus.Inactive,
    });

    return { message: 'Role deactivated successfully' };
  }

  getRoleScopes() {
    const grouped = validScopes.reduce(
      (acc, scope) => {
        const [resource, action] = scope.split(':');

        if (!acc[resource]) {
          acc[resource] = {
            resource,
            label: resourceLabels[resource] || this.toTitleCase(resource),
            permissions: [],
          };
        }

        acc[resource].permissions.push({
          scope,
          action,
          label: actionLabels[action] || this.toTitleCase(action),
        });

        return acc;
      },
      {} as Record<
        string,
        {
          resource: string;
          label: string;
          permissions: { scope: string; action: string; label: string }[];
        }
      >,
    );

    return { message: 'api scopes', data: Object.values(grouped) };
  }

  async getRolePermissionInfo() {
    const data = Object.entries(DEFAULT_PERMISSION).map(([key, value]) => {
      return {
        resource: key,
        label: resourceLabels[key] || this.toTitleCase(key),
        permissions: this.getActionPermissions(key as Resources, value),
      };
    });

    return { message: 'role resources and action details', data };
  }

  private getActionPermissions(
    resource: Resources,
    permissions: Record<string, boolean>,
  ) {
    const actionPermissions: Array<{ key: string; text: string }> = [];

    Object.keys(permissions).forEach((key) => {
      actionPermissions.push({
        key: key,
        text: this.generateActionText(resource, key),
      });
    });

    return actionPermissions;
  }

  private generateActionText(resource: string, action: string): string {
    // check dictionary first, otherwise format gracefully...
    if (actionLabels[action]) {
      return actionLabels[action].toLowerCase() + ' ' + resource;
    }
    return `${action} ${resource}`.toLowerCase();
  }

  private toTitleCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, ' ');
  }
}

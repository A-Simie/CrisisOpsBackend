import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.util.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserRoleInput,
  UserQueryInput,
} from './users.schema.js';

type UserRoleType = 'CITIZEN' | 'RESPONDER' | 'DISPATCHER' | 'ORG_ADMIN' | 'GOV_ADMIN' | 'SUPER_ADMIN';

interface UserListResult {
  users: UserResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  orgId: string | null;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
}

const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  CITIZEN: 0,
  RESPONDER: 1,
  DISPATCHER: 2,
  ORG_ADMIN: 3,
  GOV_ADMIN: 4,
  SUPER_ADMIN: 5,
};

export class UsersService {
  async list(query: UserQueryInput, requestingUserOrgId?: string | null): Promise<UserListResult> {
    const { cursor, limit = 20, role, isActive, search, orgId } = query;

    const effectiveOrgId = orgId ?? requestingUserOrgId;

    const where: any = {
      ...(effectiveOrgId && { orgId: effectiveOrgId }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(cursor && { id: { gt: cursor } }),
    };

    const take = Number(limit) + 1;

    const users = await prisma.user.findMany({
      where,
      take,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, -1) : users;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]?.id ?? null : null;

    return {
      users: items,
      nextCursor,
      hasMore,
    };
  }

  async getById(id: string, requestingUserOrgId?: string | null): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (requestingUserOrgId && user.orgId !== requestingUserOrgId) {
      throw new ForbiddenError('Cannot access user from different organization');
    }

    return user;
  }

  async create(input: CreateUserInput, creatorOrgId?: string | null): Promise<UserResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    const effectiveOrgId = input.orgId ?? creatorOrgId;

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role as any,
        orgId: effectiveOrgId,
        permissions: input.permissions,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info('User created', { userId: user.id, createdBy: 'admin' });

    return user;
  }

  async update(
    id: string,
    input: UpdateUserInput,
    requestingUserOrgId?: string | null
  ): Promise<UserResponse> {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (requestingUserOrgId && existing.orgId !== requestingUserOrgId) {
      throw new ForbiddenError('Cannot update user from different organization');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.firstName && { firstName: input.firstName }),
        ...(input.lastName && { lastName: input.lastName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info('User updated', { userId: id });

    return user;
  }

  async updateRole(
    id: string,
    input: UpdateUserRoleInput,
    requestingUserRole: UserRoleType,
    requestingUserOrgId?: string | null
  ): Promise<UserResponse> {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (requestingUserOrgId && existing.orgId !== requestingUserOrgId) {
      throw new ForbiddenError('Cannot update user from different organization');
    }

    const requestingLevel = ROLE_HIERARCHY[requestingUserRole];
    const targetCurrentLevel = ROLE_HIERARCHY[existing.role];
    const targetNewLevel = ROLE_HIERARCHY[input.role as UserRoleType];

    if (targetCurrentLevel >= requestingLevel || targetNewLevel >= requestingLevel) {
      throw new ForbiddenError('Cannot assign role equal to or higher than your own');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        role: input.role as any,
        ...(input.permissions && { permissions: input.permissions }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info('User role updated', { userId: id, newRole: input.role });

    return user;
  }

  async delete(id: string, requestingUserOrgId?: string | null): Promise<void> {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (requestingUserOrgId && existing.orgId !== requestingUserOrgId) {
      throw new ForbiddenError('Cannot delete user from different organization');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('User deactivated', { userId: id });
  }
}

export const usersService = new UsersService();

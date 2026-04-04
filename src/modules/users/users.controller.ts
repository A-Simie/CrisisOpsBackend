import { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.util.js';
import { asyncHandler } from '../../utils/async-handler.util.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import type {
  CreateUserInput,
  InviteUserInput,
  UpdateUserInput,
  UpdateUserRoleInput,
  UserQueryInput,
} from './users.schema.js';

import { userQuerySchema, inviteUserSchema, createUserSchema } from './users.schema.js';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = userQuerySchema.parse(req.query);
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  const result = await usersService.list(query, orgId);

  sendSuccess(res, result.users, 'Users retrieved', 200, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  const user = await usersService.getById(id as string, orgId);
  sendSuccess(res, user, 'User retrieved');
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  // Temporary Restriction: Only specific admin can onboard for now
  const AUTHORIZED_ADMIN = 'mosimiloluwaadebisi@gmail.com';
  
  if (req.user?.email !== AUTHORIZED_ADMIN) {
    throw new ForbiddenError('You are not authorized to create or invite users at this time.');
  }

  const isInvite = !req.body.password;
  const validationSchema = isInvite ? inviteUserSchema : createUserSchema;
  
  const input = validationSchema.parse(req.body);
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  const user = await usersService.create(input, orgId);
  sendCreated(res, user, isInvite ? 'User invited' : 'User created');
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateUserInput;
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  const user = await usersService.update(id as string, input, orgId);
  sendSuccess(res, user, 'User updated');
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateUserRoleInput;
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  const user = await usersService.updateRole(id as string, input, req.user!.role as any, orgId);
  sendSuccess(res, user, 'User role updated');
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  await usersService.delete(id as string, orgId);
  sendNoContent(res);
});

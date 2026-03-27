import { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.util.js';
import { asyncHandler } from '../../utils/async-handler.util.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserRoleInput,
  UserQueryInput,
} from './users.schema.js';

import { userQuerySchema } from './users.schema.js';

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
  const input = req.body as CreateUserInput;
  const orgId = ['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)
    ? null
    : req.user!.orgId;

  const user = await usersService.create(input, orgId);
  sendCreated(res, user, 'User created');
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

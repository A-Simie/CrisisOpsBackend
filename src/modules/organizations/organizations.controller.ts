import { Request, Response } from 'express';
import { organizationsService } from './organizations.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import { asyncHandler } from '../../utils/async-handler.util.js';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationSettingsInput,
  OrganizationQueryInput,
} from './organizations.schema.js';

import { organizationQuerySchema } from './organizations.schema.js';

export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const query = organizationQuerySchema.parse(req.query);
  const result = await organizationsService.list(query, req.user);

  sendSuccess(res, result.organizations, 'Organizations retrieved', 200, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  });
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const org = await organizationsService.getById(id as string);
  sendSuccess(res, org, 'Organization retrieved');
});

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateOrganizationInput;
  const org = await organizationsService.create(input);
  sendCreated(res, org, 'Organization created');
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateOrganizationInput;
  const org = await organizationsService.update(id as string, input);
  sendSuccess(res, org, 'Organization updated');
});

export const updateOrganizationSettings = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateOrganizationSettingsInput;
  const org = await organizationsService.updateSettings(id as string, input);
  sendSuccess(res, org, 'Organization settings updated');
});

export const activateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const org = await organizationsService.activate(id as string);
  sendSuccess(res, org, 'Organization activated');
});

export const deactivateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const org = await organizationsService.deactivate(id as string);
  sendSuccess(res, org, 'Organization deactivated');
});

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export const enforceOrgIsolation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  const { orgId, role } = req.user;

  if (role === 'CITIZEN') {
    next();
    return;
  }

  if (['GOV_ADMIN', 'SUPER_ADMIN'].includes(role)) {
    next();
    return;
  }

  if (!orgId) {
    next(new ForbiddenError('Organization context required'));
    return;
  }

  const resourceOrgId =
    (req.body as { orgId?: string })?.orgId ??
    (req.query.orgId as string | undefined) ??
    (req.params.orgId as string | undefined);

  if (resourceOrgId && resourceOrgId !== orgId) {
    next(new ForbiddenError('Cannot access resources from other organizations'));
    return;
  }

  if (req.method !== 'GET') {
    (req.body as { orgId?: string }).orgId = orgId;
  }

  if (!req.query.orgId) {
    req.query.orgId = orgId;
  }

  next();
};

export const requireOrgMembership = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  if (['GOV_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    next();
    return;
  }

  if (!req.user.orgId) {
    next(new ForbiddenError('Organization membership required for this action'));
    return;
  }

  next();
};

export const allowCrossOrgRead = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  if (req.method !== 'GET') {
    enforceOrgIsolation(req, _res, next);
    return;
  }

  next();
};

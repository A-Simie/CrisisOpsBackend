import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

type Permission = string;

const ROLE_HIERARCHY: Record<UserRole, number> = {
  CITIZEN: 0,
  RESPONDER: 1,
  DISPATCHER: 2,
  ORG_ADMIN: 3,
  GOV_ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient role privileges'));
      return;
    }

    next();
  };
};

export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role];
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      next(new ForbiddenError('Insufficient role privileges'));
      return;
    }

    next();
  };
};

export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      req.user?.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const requireAnyPermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const hasAnyPermission = requiredPermissions.some((permission) =>
      req.user?.permissions.includes(permission)
    );

    if (!hasAnyPermission) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const PERMISSIONS = {
  INCIDENTS_CREATE: 'incidents:create',
  INCIDENTS_READ: 'incidents:read',
  INCIDENTS_UPDATE: 'incidents:update',
  INCIDENTS_DELETE: 'incidents:delete',
  INCIDENTS_ASSIGN: 'incidents:assign',

  RESPONDERS_READ: 'responders:read',
  RESPONDERS_DISPATCH: 'responders:dispatch',
  RESPONDERS_MANAGE: 'responders:manage',

  RESOURCES_READ: 'resources:read',
  RESOURCES_DEPLOY: 'resources:deploy',
  RESOURCES_MANAGE: 'resources:manage',

  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  ORG_MANAGE: 'org:manage',

  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',

  AUDIT_READ: 'audit:read',

  ALERTS_CREATE: 'alerts:create',
  ALERTS_MANAGE: 'alerts:manage',

  WEBHOOKS_MANAGE: 'webhooks:manage',

  ADMIN_FULL: 'admin:full',
} as const;

import { z } from 'zod';
import { UserRole } from '@prisma/client';

const userRoleValues = Object.values(UserRole) as [string, ...string[]];

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.enum(userRoleValues).default('CITIZEN'),
  orgId: z.string().uuid().optional(),
  permissions: z.array(z.string()).default([]),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.enum(userRoleValues).default('CITIZEN'),
  orgId: z.string().uuid().optional(),
  permissions: z.array(z.string()).default([]),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoleValues),
  permissions: z.array(z.string()).optional(),
});

export const userQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum(userRoleValues).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  orgId: z.string().uuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: official@state.gov.ng
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         phone:
 *           type: string
 *           example: "+2348012345678"
 *         role:
 *           type: string
 *           enum: [CITIZEN, RESPONDER, DISPATCHER, ORG_ADMIN, GOV_ADMIN, SUPER_ADMIN]
 *           default: CITIZEN
 *         orgId:
 *           type: string
 *           format: uuid
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *         password:
 *           type: string
 *           description: Optional. If omitted, the system generates a secure password and sends an invitation email.
 *           minLength: 8
 */

import { Router } from 'express';
import * as usersController from './users.controller.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireMinRole } from '../../middleware/role-guard.middleware.js';
import { enforceOrgIsolation } from '../../middleware/org-isolation.middleware.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  userQuerySchema,
} from './users.schema.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get(
  '/',
  requireMinRole('DISPATCHER'),
  enforceOrgIsolation,
  validateQuery(userQuerySchema),
  usersController.listUsers
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  requireMinRole('DISPATCHER'),
  enforceOrgIsolation,
  usersController.getUser
);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already exists
 */
router.post(
  '/',
  requireMinRole('ORG_ADMIN'),
  enforceOrgIsolation,
  validateBody(createUserSchema),
  usersController.createUser
);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch(
  '/:id',
  requireMinRole('ORG_ADMIN'),
  enforceOrgIsolation,
  validateBody(updateUserSchema),
  usersController.updateUser
);

/**
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update user role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
  '/:id/role',
  requireMinRole('ORG_ADMIN'),
  enforceOrgIsolation,
  validateBody(updateUserRoleSchema),
  usersController.updateUserRole
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deactivated
 */
router.delete(
  '/:id',
  requireMinRole('ORG_ADMIN'),
  enforceOrgIsolation,
  usersController.deleteUser
);

export default router;

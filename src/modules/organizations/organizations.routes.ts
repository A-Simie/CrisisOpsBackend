import { Router } from 'express';
import * as organizationsController from './organizations.controller.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireMinRole, requireRole } from '../../middleware/role-guard.middleware.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateOrganizationSettingsSchema,
  organizationQuerySchema,
} from './organizations.schema.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List organizations
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
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [NGO, GOVERNMENT, PRIVATE, MULTI_STATE]
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [BASIC, PREMIUM, ENTERPRISE]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get(
  '/',
  requireMinRole('ORG_ADMIN'),
  validateQuery(organizationQuerySchema),
  organizationsController.listOrganizations
);

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
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
 *         description: Organization details
 */
router.get('/:id', requireMinRole('ORG_ADMIN'), organizationsController.getOrganization);

/**
 * @swagger
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - contactEmail
 *               - contactPhone
 *               - headquarters
 *               - serviceArea
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [NGO, GOVERNMENT, PRIVATE, MULTI_STATE]
 *               tier:
 *                 type: string
 *                 enum: [BASIC, PREMIUM, ENTERPRISE]
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               headquarters:
 *                 type: object
 *               serviceArea:
 *                 type: object
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post(
  '/',
  requireRole('SUPER_ADMIN'),
  validateBody(createOrganizationSchema),
  organizationsController.createOrganization
);

/**
 * @swagger
 * /organizations/{id}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization
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
 *         description: Organization updated
 */
router.patch(
  '/:id',
  requireMinRole('GOV_ADMIN'),
  validateBody(updateOrganizationSchema),
  organizationsController.updateOrganization
);

/**
 * @swagger
 * /organizations/{id}/settings:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization settings
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
 *         description: Settings updated
 */
router.patch(
  '/:id/settings',
  requireMinRole('ORG_ADMIN'),
  validateBody(updateOrganizationSettingsSchema),
  organizationsController.updateOrganizationSettings
);

/**
 * @swagger
 * /organizations/{id}/activate:
 *   patch:
 *     tags: [Organizations]
 *     summary: Activate organization
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
 *         description: Organization activated
 */
router.patch(
  '/:id/activate',
  requireRole('SUPER_ADMIN'),
  organizationsController.activateOrganization
);

/**
 * @swagger
 * /organizations/{id}/deactivate:
 *   patch:
 *     tags: [Organizations]
 *     summary: Deactivate organization
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
 *         description: Organization deactivated
 */
router.patch(
  '/:id/deactivate',
  requireRole('SUPER_ADMIN'),
  organizationsController.deactivateOrganization
);

export default router;

import { Router } from 'express';
import * as incidentsController from './incidents.controller.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { requireMinRole } from '../../middleware/role-guard.middleware.js';
import { enforceOrgIsolation, requireOrgMembership } from '../../middleware/org-isolation.middleware.js';
import { incidentCreationLimiter } from '../../middleware/rate-limit.middleware.js';
import { idempotency } from '../../middleware/idempotency.middleware.js';
import {
  createIncidentSchema,
  updateIncidentSchema,
  updateIncidentStatusSchema,
  assignIncidentSchema,

  addIncidentNoteSchema,
  incidentQuerySchema,
  nearbyIncidentsSchema,
} from './incidents.schema.js';
import mediaRoutes from './media.routes.js';

const router = Router();

// Mount media upload routes
router.use('/media', mediaRoutes);

/**
 * @swagger
 * /incidents/nearby:
 *   get:
 *     tags: [Incidents]
 *     summary: Get nearby incidents
 *     description: Find incidents within a radius of given coordinates
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: excludeResolved
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: List of nearby incidents
 */
router.get(
  '/nearby',
  optionalAuth,
  validateQuery(nearbyIncidentsSchema),
  incidentsController.getNearbyIncidents
);

router.use(authenticate);

/**
 * @swagger
 * /incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List incidents
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
 *         name: hazardType
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of incidents
 */
router.get(
  '/',
  enforceOrgIsolation,
  validateQuery(incidentQuerySchema),
  incidentsController.listIncidents
);

/**
 * @swagger
 * /incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident by ID
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
 *         description: Incident details
 */
router.get('/:id', incidentsController.getIncident);

/**
 * @swagger
 * /incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Create/report a new incident
 *     description: Report a new emergency incident. Requires Idempotency-Key header.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
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
 *               - hazardType
 *               - title
 *               - description
 *               - location
 *             properties:
 *               hazardType:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       201:
 *         description: Incident created
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/',
  incidentCreationLimiter,
  ...idempotency,
  validateBody(createIncidentSchema),
  incidentsController.createIncident
);

/**
 * @swagger
 * /incidents/{id}:
 *   patch:
 *     tags: [Incidents]
 *     summary: Update incident
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
 *         description: Incident updated
 */
router.patch(
  '/:id',
  requireMinRole('RESPONDER'),
  enforceOrgIsolation,
  validateBody(updateIncidentSchema),
  incidentsController.updateIncident
);

/**
 * @swagger
 * /incidents/{id}/status:
 *   patch:
 *     tags: [Incidents]
 *     summary: Update incident status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Idempotency-Key
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  '/:id/status',
  requireMinRole('RESPONDER'),
  enforceOrgIsolation,
  ...idempotency,
  validateBody(updateIncidentStatusSchema),
  incidentsController.updateIncidentStatus
);

/**
 * @swagger
 * /incidents/{id}/assign:
 *   post:
 *     tags: [Incidents]
 *     summary: Assign incident to organization
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
 *               - orgId
 *             properties:
 *               orgId:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Organization assigned
 */
router.post(
  '/:id/assign',
  requireMinRole('DISPATCHER'),
  validateBody(assignIncidentSchema),
  incidentsController.assignIncident
);



/**
 * @swagger
 * /incidents/{id}/notes:
 *   post:
 *     tags: [Incidents]
 *     summary: Add internal note to incident
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
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note added
 */
router.post(
  '/:id/notes',
  requireMinRole('RESPONDER'),
  requireOrgMembership,
  validateBody(addIncidentNoteSchema),
  incidentsController.addIncidentNote
);

/**
 * @swagger
 * /incidents/{id}/confirm:
 *   post:
 *     tags: [Incidents]
 *     summary: Confirm incident (community validation)
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
 *         description: Incident confirmed
 */
router.post('/:id/confirm', incidentsController.confirmIncident);

export default router;

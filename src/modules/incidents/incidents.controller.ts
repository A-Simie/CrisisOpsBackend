import { Request, Response } from 'express';
import { incidentsService } from './incidents.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import { asyncHandler } from '../../utils/async-handler.util.js';
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  UpdateIncidentStatusInput,
  AssignIncidentInput,

  AddIncidentNoteInput,
  IncidentQueryInput,
  NearbyIncidentsInput,
} from './incidents.schema.js';

import { incidentQuerySchema, nearbyIncidentsSchema } from './incidents.schema.js';

export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const query = incidentQuerySchema.parse(req.query);
  const result = await incidentsService.list(query, req.user!.role as any, req.user!.orgId);

  sendSuccess(res, result.incidents, 'Incidents retrieved', 200, {
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  });
});

export const getIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const incident = await incidentsService.getById(
    id as string,
    req.user!.role as any,
    req.user!.id,
    req.user!.orgId
  );
  sendSuccess(res, incident, 'Incident retrieved');
});

export const createIncident = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateIncidentInput;
  const incident = await incidentsService.create(input, req.user!.id, req.requestId);
  sendCreated(res, incident, 'Incident reported successfully');
});

export const updateIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateIncidentInput;
  const incident = await incidentsService.update(
    id as string,
    input,
    req.user!.id,
    req.user!.role as any,
    req.user!.orgId
  );
  sendSuccess(res, incident, 'Incident updated');
});

export const updateIncidentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateIncidentStatusInput;
  const incident = await incidentsService.updateStatus(
    id as string,
    input,
    req.user!.id,
    req.user!.orgId,
    req.requestId
  );
  sendSuccess(res, incident, 'Incident status updated');
});

export const assignIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as AssignIncidentInput;
  const incident = await incidentsService.assignToOrganization(id as string, input, req.user!.id);
  sendSuccess(res, incident, 'Organization assigned to incident');
});



export const addIncidentNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as AddIncidentNoteInput;
  const incident = await incidentsService.addNote(id as string, input, req.user!.id, req.user!.orgId as string);
  sendSuccess(res, incident, 'Note added to incident');
});

export const getNearbyIncidents = asyncHandler(async (req: Request, res: Response) => {
  const query = nearbyIncidentsSchema.parse(req.query);
  const incidents = await incidentsService.getNearby(query);
  sendSuccess(res, incidents, 'Nearby incidents retrieved');
});

export const confirmIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const incident = await incidentsService.confirmIncident(id as string, req.user!.id);
  sendSuccess(res, incident, 'Incident confirmed');
});

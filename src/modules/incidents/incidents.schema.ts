import { z } from 'zod';
import { HazardType, IncidentSeverity, IncidentStatus } from '@prisma/client';

const hazardTypeValues = Object.values(HazardType) as [string, ...string[]];
const incidentSeverityValues = Object.values(IncidentSeverity) as [string, ...string[]];
const incidentStatusValues = Object.values(IncidentStatus) as [string, ...string[]];

export const createIncidentSchema = z.object({
  hazardType: z.enum(hazardTypeValues),
  severity: z.enum(incidentSeverityValues).optional(),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }),
  estimatedAffectedCount: z.number().int().min(0).optional(),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.enum(['IMAGE', 'VIDEO']),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  severity: z.enum(incidentSeverityValues).optional(),
  estimatedAffectedCount: z.number().int().min(0).optional(),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(incidentStatusValues),
  note: z.string().max(500).optional(),
});

export const assignIncidentSchema = z.object({
  orgId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});



export const addIncidentNoteSchema = z.object({
  note: z.string().min(1).max(1000),
});

export const incidentQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  hazardType: z.enum(hazardTypeValues).optional(),
  severity: z.enum(incidentSeverityValues).optional(),
  status: z.enum(incidentStatusValues).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  reporterId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const nearbyIncidentsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
  hazardType: z.enum(hazardTypeValues).optional(),
  severity: z.enum(incidentSeverityValues).optional(),
  excludeResolved: z.coerce.boolean().default(true),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof updateIncidentStatusSchema>;
export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;

export type AddIncidentNoteInput = z.infer<typeof addIncidentNoteSchema>;
export type IncidentQueryInput = z.infer<typeof incidentQuerySchema>;
export type NearbyIncidentsInput = z.infer<typeof nearbyIncidentsSchema>;

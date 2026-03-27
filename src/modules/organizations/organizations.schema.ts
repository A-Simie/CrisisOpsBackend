import { z } from 'zod';
import { OrganizationType, OrganizationTier } from '@prisma/client';

const organizationTypeValues = Object.values(OrganizationType) as [string, ...string[]];
const organizationTierValues = Object.values(OrganizationTier) as [string, ...string[]];

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(organizationTypeValues),
  tier: z.enum(organizationTierValues).default('BASIC'),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10).max(20),
  headquarters: z.object({
    address: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  serviceArea: z.object({
    states: z.array(z.string()).min(1),
    cities: z.array(z.string()).default([]),
    radiusKm: z.number().positive().optional(),
  }),
  settings: z
    .object({
      requireSupervisorApproval: z.boolean().default(false),
      maxResponseTimeMinutes: z.number().positive().default(30),
      autoAssignIncidents: z.boolean().default(true),
      allowCrossOrgCollaboration: z.boolean().default(true),
    })
    .optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(10).max(20).optional(),
  headquarters: z
    .object({
      address: z.string().min(5),
      city: z.string().min(2),
      state: z.string().min(2),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  serviceArea: z
    .object({
      states: z.array(z.string()).min(1),
      cities: z.array(z.string()).default([]),
      radiusKm: z.number().positive().optional(),
    })
    .optional(),
});

export const updateOrganizationSettingsSchema = z.object({
  requireSupervisorApproval: z.boolean().optional(),
  maxResponseTimeMinutes: z.number().positive().optional(),
  autoAssignIncidents: z.boolean().optional(),
  allowCrossOrgCollaboration: z.boolean().optional(),
});

export const organizationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(organizationTypeValues).optional(),
  tier: z.enum(organizationTierValues).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  state: z.string().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
export type OrganizationQueryInput = z.infer<typeof organizationQuerySchema>;

import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.util.js';
import { calculateDistance } from '../../utils/geospatial.util.js';
import { tryDecrypt } from '../../utils/crypto.util.js';

import { auditService } from '../../services/audit.service.js';
import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  UpdateIncidentStatusInput,
  AssignIncidentInput,

  AddIncidentNoteInput,
  IncidentQueryInput,
  NearbyIncidentsInput,
} from './incidents.schema.js';
import { 
  type UserRoleType, 
  type IncidentStatusType, 
  STATUS_TRANSITIONS 
} from '../../types/enums.js';

interface IncidentResponse {
  id: string;
  reporterId: string;
  primaryOrgId: string | null;
  hazardType: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  media: unknown[];
  estimatedAffectedCount: number;
  communityConfirmations: number;
  responseTimeMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IncidentListResult {
  incidents: IncidentResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class IncidentsService {
  async list(
    query: IncidentQueryInput,
    userRole: UserRoleType,
    userOrgId?: string | null
  ): Promise<IncidentListResult> {
    const {
      cursor,
      limit = 20,
      hazardType,
      severity,
      status,
      city,
      state,
      reporterId,
      orgId,
      startDate,
      endDate,
    } = query;

    const where: any = {};

    if (hazardType) where.hazardType = hazardType;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (city) where.locationCity = city;
    if (state) where.locationState = state;
    if (reporterId) where.reporterId = reporterId;
    if (cursor) where.id = { gt: cursor };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (!['GOV_ADMIN', 'SUPER_ADMIN'].includes(userRole) && userOrgId) {
      where.OR = [{ primaryOrgId: userOrgId }, { assignedOrgs: { some: { orgId: userOrgId } } }];
    }

    if (orgId && ['GOV_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      where.OR = [{ primaryOrgId: orgId }, { assignedOrgs: { some: { orgId } } }];
    }

    const take = Number(limit) + 1;

    const incidents = await prisma.incident.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedOrgs: true,
      },
    });

    const hasMore = incidents.length > limit;
    const items = hasMore ? incidents.slice(0, -1) : incidents;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]?.id ?? null : null;

    return {
      incidents: items.map((inc: any) => this.formatIncident(inc)),
      nextCursor,
      hasMore,
    };
  }

  async getById(
    id: string,
    userRole: UserRoleType,
    userId: string,
    userOrgId?: string | null
  ): Promise<IncidentResponse> {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        assignedOrgs: true,
        assignedResponders: true,
        allocatedResources: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!incident) {
      throw new NotFoundError('Incident not found');
    }

    if (userRole === 'CITIZEN' && incident.reporterId !== userId) {
      throw new ForbiddenError('Cannot access this incident');
    }

    if (
      !['GOV_ADMIN', 'SUPER_ADMIN', 'CITIZEN'].includes(userRole) &&
      userOrgId &&
      incident.primaryOrgId !== userOrgId &&
      !incident.assignedOrgs.some((ao: any) => ao.orgId === userOrgId)
    ) {
      throw new ForbiddenError('Cannot access incident from other organization');
    }

    return this.formatIncident(incident as any);
  }

  async create(
    input: CreateIncidentInput,
    reporterId: string,
    requestId?: string
  ): Promise<IncidentResponse> {
    let finalLat = input.location.latitude;
    let finalLng = input.location.longitude;

    // If coordinates are 0,0 (default/invalid) but address is provided, try to geocode
    if (finalLat === 0 && finalLng === 0 && input.location.address) {
      // Geocoding logic removed
    }

    // Decrypt PII fields sent encrypted from the frontend
    const decryptedDescription = tryDecrypt(input.description) ?? input.description;
    const decryptedAddress = tryDecrypt(input.location.address) ?? input.location.address;

    const incident = await prisma.incident.create({
      data: {
        reporterId,
        hazardType: input.hazardType as any,
        severity: (input.severity as any) ?? 'MEDIUM',
        status: 'REPORTED',
        title: input.title,
        description: decryptedDescription,
        locationLat: finalLat,
        locationLng: finalLng,
        locationAddress: decryptedAddress,
        locationCity: input.location.city,
        locationState: input.location.state,
        mediaJson: input.media ?? [],
        estimatedAffectedCount: input.estimatedAffectedCount ?? 0,
      },
    });

    await prisma.incidentStatusHistory.create({
      data: {
        incidentId: incident.id,
        toStatus: 'REPORTED',
        changedBy: reporterId,
        note: 'Incident reported',
      },
    });

    await auditService.logIncidentEvent(incident.id, 'INCIDENT_CREATED', reporterId, undefined, undefined, requestId);

    logger.info('Incident created', { 
      incidentId: incident.id, 
      hazardType: incident.hazardType,
      reporterId: incident.reporterId
    });

    return this.formatIncident(incident as any);
  }

  async update(
    id: string,
    input: UpdateIncidentInput,
    userId: string,
    userRole: UserRoleType,
    userOrgId?: string | null
  ): Promise<IncidentResponse> {
    const existing = await prisma.incident.findUnique({
      where: { id },
      include: { assignedOrgs: true },
    });

    if (!existing) {
      throw new NotFoundError('Incident not found');
    }

    if (
      !['GOV_ADMIN', 'SUPER_ADMIN'].includes(userRole) &&
      userOrgId &&
      existing.primaryOrgId !== userOrgId
    ) {
      throw new ForbiddenError('Cannot update incident from other organization');
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.severity && { severity: input.severity as any }),
        ...(input.estimatedAffectedCount !== undefined && {
          estimatedAffectedCount: input.estimatedAffectedCount,
        }),
      },
    });

    logger.info('Incident updated', { incidentId: id, updatedBy: userId });

    return this.formatIncident(incident as any);
  }

  async updateStatus(
    id: string,
    input: UpdateIncidentStatusInput,
    userId: string,
    userOrgId?: string | null,
    requestId?: string
  ): Promise<IncidentResponse> {
    const existing = await prisma.incident.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Incident not found');
    }

    const allowedTransitions = STATUS_TRANSITIONS[existing.status as IncidentStatusType];
    const newStatus = input.status as IncidentStatusType;

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestError(
        `Cannot transition from ${existing.status} to ${newStatus}. Allowed: ${allowedTransitions?.join(', ') ?? 'none'}`
      );
    }

    const updateData: any = { status: newStatus };

    if (newStatus === 'VERIFIED') updateData.verifiedAt = new Date();
    if (newStatus === 'DISPATCHED') updateData.dispatchedAt = new Date();
    if (newStatus === 'IN_PROGRESS') updateData.arrivedAt = new Date();
    if (newStatus === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      if (existing.dispatchedAt) {
        const responseTime = Math.round(
          (Date.now() - existing.dispatchedAt.getTime()) / 60000
        );
        updateData.responseTimeMinutes = responseTime;
      }
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    await prisma.incidentStatusHistory.create({
      data: {
        incidentId: id,
        fromStatus: existing.status,
        toStatus: newStatus,
        changedBy: userId,
        note: input.note,
      },
    });

    await auditService.logIncidentEvent(
      id,
      'INCIDENT_STATUS_CHANGED',
      userId,
      userOrgId ?? undefined,
      { before: { status: existing.status }, after: { status: newStatus } },
      requestId
    );

    logger.info('Incident status updated', {
      incidentId: id,
      from: existing.status,
      to: newStatus,
      changedBy: userId
    });

    return this.formatIncident(incident as any);
  }

  async assignToOrganization(
    id: string,
    input: AssignIncidentInput,
    userId: string
  ): Promise<IncidentResponse> {
    const existing = await prisma.incident.findUnique({
      where: { id },
      include: { assignedOrgs: true },
    });

    if (!existing) {
      throw new NotFoundError('Incident not found');
    }

    const org = await prisma.organization.findUnique({ where: { id: input.orgId } });

    if (!org || !org.isActive) {
      throw new BadRequestError('Organization not found or inactive');
    }

    const alreadyAssigned = existing.assignedOrgs.some((ao: any) => ao.orgId === input.orgId);

    if (alreadyAssigned) {
      throw new BadRequestError('Organization already assigned to this incident');
    }

    await prisma.incidentOrg.create({
      data: {
        incidentId: id,
        orgId: input.orgId,
        isPrimary: input.isPrimary,
        assignedBy: userId,
      },
    });

    if (input.isPrimary) {
      await prisma.incident.update({
        where: { id },
        data: { primaryOrgId: input.orgId },
      });
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { assignedOrgs: true },
    });

    logger.info('Organization assigned to incident', {
      incidentId: id,
      orgId: input.orgId,
      isPrimary: input.isPrimary,
    });

    return this.formatIncident(incident as any);
  }



  async addNote(
    id: string,
    input: AddIncidentNoteInput,
    userId: string,
    userOrgId: string
  ): Promise<IncidentResponse> {
    const existing = await prisma.incident.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Incident not found');
    }

    const currentNotes = existing.internalNotesJson as any[];

    const newNote = {
      orgId: userOrgId,
      note: input.note,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        internalNotesJson: [...currentNotes, newNote],
      },
    });

    logger.info('Note added to incident', { incidentId: id, userId });

    return this.formatIncident(incident as any);
  }

  async getNearby(input: NearbyIncidentsInput): Promise<IncidentResponse[]> {
    const { latitude, longitude, radiusKm, hazardType, severity, excludeResolved, limit } = input;

    const where: any = {};

    if (hazardType) where.hazardType = hazardType;
    if (severity) where.severity = severity;
    if (excludeResolved) {
      where.status = { notIn: ['RESOLVED', 'CLOSED', 'FALSE_ALARM'] };
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit * 5,
    });

    const nearby = incidents
      .map((inc: any) => ({
        incident: inc,
        distance: calculateDistance(
          { latitude, longitude },
          { latitude: inc.locationLat, longitude: inc.locationLng }
        ),
      }))
      .filter((item: any) => item.distance <= radiusKm)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, limit)
      .map((item: any) => this.formatIncident(item.incident));

    return nearby;
  }

  async confirmIncident(id: string, userId: string): Promise<IncidentResponse> {
    const existing = await prisma.incident.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Incident not found');
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        communityConfirmations: { increment: 1 },
      },
    });

    logger.info('Incident confirmed by community', { incidentId: id, userId });

    return this.formatIncident(incident as any);
  }

  private formatIncident(incident: any): IncidentResponse {
    return {
      id: incident.id,
      reporterId: incident.reporterId,
      primaryOrgId: incident.primaryOrgId,
      hazardType: incident.hazardType,
      severity: incident.severity,
      status: incident.status,
      title: incident.title,
      description: incident.description,
      location: {
        latitude: incident.locationLat,
        longitude: incident.locationLng,
        address: incident.locationAddress,
        city: incident.locationCity,
        state: incident.locationState,
      },
      media: incident.mediaJson as unknown[],
      estimatedAffectedCount: incident.estimatedAffectedCount,
      communityConfirmations: incident.communityConfirmations,
      responseTimeMinutes: incident.responseTimeMinutes,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
    };
  }
}

export const incidentsService = new IncidentsService();

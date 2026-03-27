import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.util.js';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationSettingsInput,
  OrganizationQueryInput,
} from './organizations.schema.js';

interface OrganizationResponse {
  id: string;
  name: string;
  type: string;
  tier: string;
  contactEmail: string;
  contactPhone: string;
  headquarters: Record<string, unknown>;
  serviceArea: Record<string, unknown>;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
}

interface OrganizationListResult {
  organizations: OrganizationResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class OrganizationsService {
  async list(query: OrganizationQueryInput, requestingUser: any = null): Promise<OrganizationListResult> {
    const { cursor, limit, type, tier, isActive, search, state } = query;

    const where: any = {
      ...(type && { type }),
      ...(tier && { tier }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(cursor && { id: { gt: cursor } }),
    };

    // RBAC Logic
    if (requestingUser) {
        // Handle legacy string input if any
        if (typeof requestingUser === 'string') {
             where.id = requestingUser;
        } else {
             const userRole = requestingUser.role;
             const userOrgId = requestingUser.orgId;

             if (userRole === 'ORG_ADMIN' && userOrgId) {
                 where.id = userOrgId;
             } else if (userRole === 'GOV_ADMIN' && userOrgId) {
                 // Fetch Gov Admin's Organization to determine Jurisdiction
                 const adminOrg = await prisma.organization.findUnique({
                     where: { id: userOrgId },
                     select: { serviceAreaJson: true }
                 });

                 if (adminOrg?.serviceAreaJson) {
                     const serviceArea = adminOrg.serviceAreaJson as any;
                     const allowedStates = serviceArea.states || [];
                     
                     if (allowedStates.length > 0) {
                         // Add State filter
                         where.AND = [
                             ...(where.AND || []),
                             {
                                 OR: allowedStates.map((s: string) => ({
                                     headquartersJson: {
                                         path: ['state'],
                                         equals: s
                                     }
                                 }))
                             }
                         ];
                     }
                 }
             }
             // SUPER_ADMIN sees all (no extra filter)
        }
    }

    const organizations = await prisma.organization.findMany({
      where,
      take: limit + 1,
      orderBy: { id: 'asc' },
    });

    // In-memory legacy state filter (if query.state passed)
    // We should prefer DB filtering, but for backward compat:
    let filtered = organizations;
    if (state) {
      filtered = organizations.filter((org: any) => {
        const serviceArea = org.serviceAreaJson as { states?: string[] };
        return serviceArea.states?.includes(state);
      });
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, -1) : filtered;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]?.id ?? null : null;

    return {
      organizations: items.map((org: any) => this.formatOrganization(org)),
      nextCursor,
      hasMore,
    };
  }

  async getById(id: string): Promise<OrganizationResponse> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return this.formatOrganization(org);
  }

  async create(input: CreateOrganizationInput): Promise<OrganizationResponse> {
    const existing = await prisma.organization.findFirst({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictError('Organization with this name already exists');
    }

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        type: input.type as any,
        tier: (input.tier as any) ?? 'BASIC',
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        headquartersJson: input.headquarters,
        serviceAreaJson: input.serviceArea,
        settingsJson: input.settings ?? {},
      },
    });

    logger.info('Organization created', { orgId: org.id, name: org.name });

    return this.formatOrganization(org);
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<OrganizationResponse> {
    const existing = await prisma.organization.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Organization not found');
    }

    const org = await prisma.organization.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.contactEmail && { contactEmail: input.contactEmail }),
        ...(input.contactPhone && { contactPhone: input.contactPhone }),
        ...(input.headquarters && { headquartersJson: input.headquarters }),
        ...(input.serviceArea && { serviceAreaJson: input.serviceArea }),
      },
    });

    logger.info('Organization updated', { orgId: id });

    return this.formatOrganization(org);
  }

  async updateSettings(
    id: string,
    input: UpdateOrganizationSettingsInput
  ): Promise<OrganizationResponse> {
    const existing = await prisma.organization.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Organization not found');
    }

    const currentSettings = existing.settingsJson as Record<string, unknown>;
    const newSettings = { ...currentSettings, ...input };

    const org = await prisma.organization.update({
      where: { id },
      data: { settingsJson: newSettings },
    });

    logger.info('Organization settings updated', { orgId: id });

    return this.formatOrganization(org);
  }

  async activate(id: string): Promise<OrganizationResponse> {
    const org = await prisma.organization.update({
      where: { id },
      data: { isActive: true },
    });

    logger.info('Organization activated', { orgId: id });

    return this.formatOrganization(org);
  }

  async deactivate(id: string): Promise<OrganizationResponse> {
    const org = await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Organization deactivated', { orgId: id });

    return this.formatOrganization(org);
  }

  private formatOrganization(org: any): OrganizationResponse {
    return {
      id: org.id,
      name: org.name,
      type: org.type,
      tier: org.tier,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      headquarters: org.headquartersJson as Record<string, unknown>,
      serviceArea: org.serviceAreaJson as Record<string, unknown>,
      settings: org.settingsJson as Record<string, unknown>,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }
}

export const organizationsService = new OrganizationsService();


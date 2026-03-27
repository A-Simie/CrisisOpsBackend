import { prisma } from '../config/database.js';
import { createHash } from 'crypto';

interface AuditLogInput {
  userId?: string;
  orgId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  private async getLastHash(): Promise<string | null> {
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { currentHash: true },
    });
    return lastLog?.currentHash ?? null;
  }

  private generateHash(data: Record<string, unknown>, previousHash: string | null): string {
    const content = JSON.stringify({ ...data, previousHash });
    return createHash('sha256').update(content).digest('hex');
  }

  async log(input: AuditLogInput): Promise<void> {
    const previousHash = await this.getLastHash();

    const logData = {
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      changesJson: input.changes,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      metadataJson: input.metadata,
      previousHash: previousHash ?? undefined,
      currentHash: '',
    };

    logData.currentHash = this.generateHash(logData as Record<string, unknown>, previousHash);

    const createData: Record<string, unknown> = { ...logData };

    if (input.userId) {
      createData.user = { connect: { id: input.userId } };
    }
    if (input.orgId) {
      createData.organization = { connect: { id: input.orgId } };
    }

    await prisma.auditLog.create({ data: createData as any });
  }

  async logUserAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    requestId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      requestId,
      metadata,
    });
  }

  async logIncidentEvent(
    incidentId: string,
    action: string,
    userId?: string,
    orgId?: string,
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    requestId?: string
  ): Promise<void> {
    await this.log({
      userId,
      orgId,
      action,
      resource: 'incident',
      resourceId: incidentId,
      changes,
      requestId,
    });
  }

  async logSecurityEvent(
    action: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action,
      resource: 'security',
      ipAddress,
      userAgent,
      metadata,
    });
  }
}

export const auditService = new AuditService();

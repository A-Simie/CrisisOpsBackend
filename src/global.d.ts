import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      profilePicture: string | null;
      role: UserRole;
      orgId: string | null;
      permissions: string[];
      isEmailVerified: boolean;
      tokenId: string;
      createdAt: Date;
    }

    interface Request {
      requestId: string;
      idempotencyKey?: string;
      user?: User;
      file?: Multer.File;
      files?: { [fieldname: string]: Multer.File[] } | Multer.File[];
    }
  }
}

export {};

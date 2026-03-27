import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { uploadIncidentMedia } from '../../utils/cloudinary.util.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.util.js';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as MulterFile | undefined;

  if (!file) {
    throw new BadRequestError('No file uploaded');
  }

  const isVideo = file.mimetype.startsWith('video/');
  const isImage = file.mimetype.startsWith('image/');

  if (!isVideo && !isImage) {
    throw new BadRequestError('File must be an image or video');
  }

  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image
  if (file.size > maxSize) {
    throw new BadRequestError(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`);
  }

  const resourceType = isVideo ? 'video' : 'image';
  const result = await uploadIncidentMedia(file.buffer, file.mimetype, resourceType);

  logger.info('Incident media uploaded', {
    userId: req.user?.id,
    filename: file.originalname,
    type: resourceType,
    size: file.size,
  });

  sendSuccess(res, {
    url: result.url,
    type: resourceType.toUpperCase() as 'IMAGE' | 'VIDEO',
    publicId: result.publicId,
  }, 'Media uploaded successfully');
});

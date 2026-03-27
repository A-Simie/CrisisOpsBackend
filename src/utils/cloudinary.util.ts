import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from './logger.util.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  base64Data: string,
  folder: string = 'profile-pictures'
): Promise<UploadResult> {
  try {
    const dataUri = base64Data.startsWith('data:')
      ? base64Data
      : `data:image/jpeg;base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `crisisops/${folder}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    logger.info('Image uploaded to Cloudinary', { publicId: result.public_id });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    logger.error('Cloudinary upload failed', { error });
    throw new Error('Failed to upload image');
  }
}

export async function uploadIncidentMedia(
  buffer: Buffer,
  mimetype: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<UploadResult> {
  try {
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'crisisops/incidents',
      resource_type: resourceType,
      transformation: resourceType === 'image' 
        ? [{ quality: 'auto', fetch_format: 'auto' }]
        : undefined,
    });

    logger.info('Incident media uploaded to Cloudinary', { 
      publicId: result.public_id, 
      resourceType 
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    logger.error('Cloudinary incident media upload failed', { error });
    throw new Error('Failed to upload incident media');
  }
}

export async function uploadImageFromBuffer(
  buffer: Buffer,
  mimetype: string,
  folder: string = 'profile-pictures'
): Promise<UploadResult> {
  try {
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `crisisops/${folder}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    logger.info('Image uploaded to Cloudinary', { publicId: result.public_id });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    logger.error('Cloudinary upload failed', { error });
    throw new Error('Failed to upload image');
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('Image deleted from Cloudinary', { publicId });
  } catch (error) {
    logger.error('Cloudinary delete failed', { error });
  }
}

export { cloudinary };

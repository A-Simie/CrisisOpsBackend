import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as mediaController from './media.controller.js';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

/**
 * @swagger
 * /incidents/media/upload:
 *   post:
 *     summary: Upload incident media
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file (max 10MB for images, 50MB for videos)
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [IMAGE, VIDEO]
 *                     publicId:
 *                       type: string
 */
router.post(
  '/upload',
  authenticate,
  upload.single('media'),
  mediaController.uploadMedia
);

export default router;

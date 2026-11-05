import multer from 'multer';
import sharp from 'sharp';
import { RequestHandler } from 'express';
import { ApiError } from '../utils/apiHelpers';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 150 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) callback(null, true);
    else callback(new ApiError(400, 'Profile photo must be a JPG, PNG or WebP image.'));
  },
}).single('photo');

export const studentPhotoUpload: RequestHandler = (req, res, next) => {
  upload(req, res, error => next(error instanceof multer.MulterError
    ? new ApiError(400, error.code === 'LIMIT_FILE_SIZE' ? 'Profile photo must be 5 MB or smaller.' : 'Upload one profile photo in the photo field.')
    : error));
};

export async function encodeStudentPhoto(file?: Express.Multer.File): Promise<string | undefined> {
  if (!file) return undefined;
  try {
    const image = sharp(file.buffer, { limitInputPixels: 20000000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('Invalid image format');
    // Keep a small, self-contained portrait in the existing photo field. Re-encoding strips metadata.
    const portrait = await image.rotate().resize(320, 320, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    return `data:image/webp;base64,${portrait.toString('base64')}`;
  } catch {
    throw new ApiError(400, 'This photo could not be read. Choose a valid JPG, PNG or WebP image under 20 megapixels.');
  }
}


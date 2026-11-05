import path from 'path';
import { env } from './env';
export const uploadPath = path.resolve(__dirname, '../../', env.UPLOAD_DIR);

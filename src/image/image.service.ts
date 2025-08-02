import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  async createThumbnail(
    originalPath: string,
    width: number = 200,
  ): Promise<string | null> {
    try {
      const dir = path.dirname(originalPath);
      const ext = path.extname(originalPath);
      const name = path.basename(originalPath, ext);
      const thumbnailFilename = `${name}-thumbnail${ext}`;
      const thumbnailPath = path.join(dir, thumbnailFilename);

      await sharp(originalPath).resize(width).toFile(thumbnailPath);

      // Normalize path for consistency
      return thumbnailPath.replace(/\\/g, '/');
    } catch (error) {
      this.logger.error(
        `Failed to create thumbnail for ${originalPath}`,
        error,
      );
      return null;
    }
  }
}

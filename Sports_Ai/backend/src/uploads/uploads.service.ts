import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Allowed MIME types for profile pictures
   */
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  /**
   * Maximum file size in bytes (5MB)
   */
  private readonly maxFileSize = 5 * 1024 * 1024;

  /**
   * Validate uploaded file
   */
  validateFile(file: { mimetype: string; size: number; originalname: string }): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, GIF, WebP`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 5MB`,
      );
    }
  }

  /**
   * Save profile picture to disk and return the URL
   * @param file The uploaded file buffer and metadata
   * @param userId The user's ID (used for organizing files)
   * @returns The URL path to the saved file
   */
  async saveProfilePicture(
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    userId: string,
  ): Promise<string> {
    this.validateFile(file);

    // Generate unique filename with proper extension
    const extension = this.getExtensionFromMimetype(file.mimetype);
    const filename = `${userId}-${uuidv4()}${extension}`;
    const filepath = path.join(this.uploadsDir, filename);

    // Write file to disk
    await fs.promises.writeFile(filepath, file.buffer);

    // Return URL path (relative to uploads directory)
    return `/uploads/${filename}`;
  }

  /**
   * Delete a file from the uploads directory
   * @param fileUrl The URL path of the file to delete
   * @returns true if deleted successfully, false if file doesn't exist
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;

    // Extract filename from URL
    const filename = fileUrl.replace('/uploads/', '');
    const filepath = path.join(this.uploadsDir, filename);

    try {
      // Check if file exists
      await fs.promises.access(filepath, fs.constants.F_OK);

      // Delete the file
      await fs.promises.unlink(filepath);
      console.log(`Deleted old profile picture: ${filename}`);
      return true;
    } catch (error) {
      // File doesn't exist or couldn't be deleted
      console.log(`Could not delete file ${filename}:`, error);
      return false;
    }
  }

  /**
   * Check if a file exists
   * @param fileUrl The URL path of the file
   * @returns true if file exists, false otherwise
   */
  async fileExists(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;

    const filename = fileUrl.replace('/uploads/', '');
    const filepath = path.join(this.uploadsDir, filename);

    try {
      await fs.promises.access(filepath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimetype(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return mimeToExt[mimetype] || '.jpg';
  }
}

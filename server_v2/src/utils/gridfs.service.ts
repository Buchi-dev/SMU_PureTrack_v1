/**
 * GridFS Service
 * MongoDB GridFS file storage for PDF reports
 * Provides upload, download, delete, and metadata operations
 */

import { GridFSBucket, ObjectId, Db } from 'mongodb';
import { Readable } from 'stream';
import { dbConnection } from '@core/configs';
import logger from '@utils/logger.util';

/**
 * File metadata interface
 */
interface IFileMetadata {
  filename: string;
  contentType: string;
  reportId: string;
  reportType: string;
  uploadedAt: Date;
}

/**
 * File upload result
 */
interface IUploadResult {
  fileId: ObjectId;
  filename: string;
  size: number;
  uploadedAt: Date;
}

/**
 * GridFS Service Class
 * Singleton pattern for consistent file storage operations
 */
class GridFSService {
  private bucket: GridFSBucket | null = null;
  private db: Db | null = null;

  /**
   * Initialize GridFS bucket
   * Called during app startup
   */
  async initialize(): Promise<void> {
    try {
      // Get MongoDB native connection
      const connection = dbConnection.getConnection();
      this.db = connection.db || null; // Extract native Db instance

      // Create GridFS bucket
      if (!this.db) {
        throw new Error('Database connection is null');
      }
      
      this.bucket = new GridFSBucket(this.db, {
        bucketName: 'reports', // Collection name prefix: reports.files, reports.chunks
      });

      logger.info('✅ GridFS Service: Initialized successfully');
    } catch (error) {
      logger.error('❌ GridFS Service: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Upload file to GridFS
   * @param buffer - File buffer
   * @param filename - File name
   * @param metadata - File metadata
   * @returns Upload result with fileId
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    metadata: IFileMetadata
  ): Promise<IUploadResult> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket!.openUploadStream(filename, {
        metadata: {
          contentType: metadata.contentType,
          reportId: metadata.reportId,
          reportType: metadata.reportType,
          uploadedAt: metadata.uploadedAt,
        },
      });

      // Convert buffer to readable stream
      const readableStream = Readable.from(buffer);

      uploadStream.on('finish', () => {
        logger.info(
          `✅ GridFS Service: Uploaded file ${filename} (${uploadStream.id}) - ${(buffer.length / 1024).toFixed(2)} KB`
        );

        resolve({
          fileId: uploadStream.id as ObjectId,
          filename: filename,
          size: buffer.length,
          uploadedAt: metadata.uploadedAt,
        });
      });

      uploadStream.on('error', (error) => {
        logger.error(`❌ GridFS Service: Upload failed for ${filename}:`, error);
        reject(error);
      });

      // Pipe buffer stream to GridFS
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Download file from GridFS as stream
   * @param fileId - MongoDB ObjectId of the file
   * @returns Readable stream
   */
  downloadFile(fileId: ObjectId | string): Readable {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    logger.info(`📥 GridFS Service: Downloading file ${objectId}`);

    return this.bucket.openDownloadStream(objectId);
  }

  /**
   * Download file from GridFS as buffer
   * @param fileId - MongoDB ObjectId of the file
   * @returns Buffer containing file data
   */
  async downloadFileAsBuffer(fileId: ObjectId | string): Promise<Buffer> {
    const stream = this.downloadFile(fileId);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        logger.info(`✅ GridFS Service: Downloaded file ${fileId} - ${(buffer.length / 1024).toFixed(2)} KB`);
        resolve(buffer);
      });

      stream.on('error', (error) => {
        logger.error(`❌ GridFS Service: Download failed for ${fileId}:`, error);
        reject(error);
      });
    });
  }

  /**
   * Delete file from GridFS
   * @param fileId - MongoDB ObjectId of the file
   */
  async deleteFile(fileId: ObjectId | string): Promise<void> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    try {
      await this.bucket.delete(objectId);
      logger.info(`✅ GridFS Service: Deleted file ${objectId}`);
    } catch (error) {
      logger.error(`❌ GridFS Service: Delete failed for ${objectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple files from GridFS
   * @param fileIds - Array of MongoDB ObjectIds
   */
  async deleteFiles(fileIds: Array<ObjectId | string>): Promise<void> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    const deletePromises = fileIds.map((fileId) => this.deleteFile(fileId));
    await Promise.all(deletePromises);

    logger.info(`✅ GridFS Service: Deleted ${fileIds.length} files`);
  }

  /**
   * Get file metadata from GridFS
   * @param fileId - MongoDB ObjectId of the file
   * @returns File metadata
   */
  async getFileMetadata(fileId: ObjectId | string): Promise<any> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    try {
      const filesCollection = this.db!.collection('reports.files');
      const file = await filesCollection.findOne({ _id: objectId });

      if (!file) {
        throw new Error(`File not found: ${objectId}`);
      }

      return {
        fileId: file._id,
        filename: file.filename,
        length: file.length,
        contentType: file.contentType,
        uploadDate: file.uploadDate,
        metadata: file.metadata,
      };
    } catch (error) {
      logger.error(`❌ GridFS Service: Failed to get metadata for ${objectId}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists in GridFS
   * @param fileId - MongoDB ObjectId of the file
   * @returns True if file exists, false otherwise
   */
  async fileExists(fileId: ObjectId | string): Promise<boolean> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    try {
      const filesCollection = this.db!.collection('reports.files');
      const file = await filesCollection.findOne({ _id: objectId });
      return file !== null;
    } catch (error) {
      logger.error(`❌ GridFS Service: Failed to check if file exists ${objectId}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   * @returns Storage stats (total files, total size)
   */
  async getStorageStats(): Promise<{ totalFiles: number; totalSize: number }> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }

    try {
      const filesCollection = this.db!.collection('reports.files');
      const stats = await filesCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$length' },
            },
          },
        ])
        .toArray();

      if (stats.length === 0) {
        return { totalFiles: 0, totalSize: 0 };
      }

      return {
        totalFiles: stats[0]?.totalFiles || 0,
        totalSize: stats[0]?.totalSize || 0,
      };
    } catch (error) {
      logger.error('❌ GridFS Service: Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Get bucket instance (for advanced operations)
   * @returns GridFSBucket instance
   */
  getBucket(): GridFSBucket {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized. Call initialize() first.');
    }
    return this.bucket;
  }
}

// Export singleton instance
export default new GridFSService();


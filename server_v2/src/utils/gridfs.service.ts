/**
 * GridFS Service
 * MongoDB GridFS file storage for PDF reports and backups
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
  reportId?: string;
  reportType?: string;
  backupType?: string;
  uploadedAt: Date;
  [key: string]: any;
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
  private reportsBucket: GridFSBucket | null = null;
  private backupsBucket: GridFSBucket | null = null;
  private db: Db | null = null;

  /**
   * Initialize GridFS buckets
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
      
      // Create reports bucket
      this.reportsBucket = new GridFSBucket(this.db, {
        bucketName: 'reports', // Collection name prefix: reports.files, reports.chunks
      });

      // Create backups bucket
      this.backupsBucket = new GridFSBucket(this.db, {
        bucketName: 'backups', // Collection name prefix: backups.files, backups.chunks
      });

      logger.info('✅ GridFS Service: Initialized successfully (reports & backups buckets)');
    } catch (error) {
      logger.error('❌ GridFS Service: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate bucket based on type
   */
  private getBucketByType(bucketType: 'reports' | 'backups' = 'reports'): GridFSBucket {
    const bucket = bucketType === 'backups' ? this.backupsBucket : this.reportsBucket;
    if (!bucket) {
      throw new Error(`GridFS ${bucketType} bucket not initialized. Call initialize() first.`);
    }
    return bucket;
  }

  /**
   * Upload file to GridFS
   * @param buffer - File buffer
   * @param filename - File name
   * @param metadata - File metadata
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns Upload result with fileId
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    metadata: IFileMetadata,
    bucketType: 'reports' | 'backups' = 'reports'
  ): Promise<IUploadResult> {
    const bucket = this.getBucketByType(bucketType);

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: metadata,
      });

      // Convert buffer to readable stream
      const readableStream = Readable.from(buffer);

      uploadStream.on('finish', () => {
        logger.info(
          `✅ GridFS Service: Uploaded ${bucketType} file ${filename} (${uploadStream.id}) - ${(buffer.length / 1024).toFixed(2)} KB`
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
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns Readable stream
   */
  downloadFile(fileId: ObjectId | string, bucketType: 'reports' | 'backups' = 'reports'): Readable {
    const bucket = this.getBucketByType(bucketType);
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    logger.info(`📥 GridFS Service: Downloading ${bucketType} file ${objectId}`);

    return bucket.openDownloadStream(objectId);
  }

  /**
   * Download file from GridFS as buffer
   * @param fileId - MongoDB ObjectId of the file
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns Buffer containing file data
   */
  async downloadFileAsBuffer(fileId: ObjectId | string, bucketType: 'reports' | 'backups' = 'reports'): Promise<Buffer> {
    const stream = this.downloadFile(fileId, bucketType);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        logger.info(`✅ GridFS Service: Downloaded ${bucketType} file ${fileId} - ${(buffer.length / 1024).toFixed(2)} KB`);
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
   * @param bucketType - Type of bucket ('reports' or 'backups')
   */
  async deleteFile(fileId: ObjectId | string, bucketType: 'reports' | 'backups' = 'reports'): Promise<void> {
    const bucket = this.getBucketByType(bucketType);
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    try {
      await bucket.delete(objectId);
      logger.info(`✅ GridFS Service: Deleted ${bucketType} file ${objectId}`);
    } catch (error) {
      logger.error(`❌ GridFS Service: Delete failed for ${objectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple files from GridFS
   * @param fileIds - Array of MongoDB ObjectIds
   * @param bucketType - Type of bucket ('reports' or 'backups')
   */
  async deleteFiles(fileIds: Array<ObjectId | string>, bucketType: 'reports' | 'backups' = 'reports'): Promise<void> {
    const deletePromises = fileIds.map((fileId) => this.deleteFile(fileId, bucketType));
    await Promise.all(deletePromises);

    logger.info(`✅ GridFS Service: Deleted ${fileIds.length} ${bucketType} files`);
  }

  /**
   * Get file metadata from GridFS
   * @param fileId - MongoDB ObjectId of the file
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns File metadata
   */
  async getFileMetadata(fileId: ObjectId | string, bucketType: 'reports' | 'backups' = 'reports'): Promise<any> {
    if (!this.db) {
      throw new Error('Database connection is null');
    }

    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    try {
      const filesCollection = this.db.collection(`${bucketType}.files`);
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
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns True if file exists, false otherwise
   */
  async fileExists(fileId: ObjectId | string, bucketType: 'reports' | 'backups' = 'reports'): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection is null');
    }

    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    try {
      const filesCollection = this.db.collection(`${bucketType}.files`);
      const file = await filesCollection.findOne({ _id: objectId });
      return file !== null;
    } catch (error) {
      logger.error(`❌ GridFS Service: Failed to check if file exists ${objectId}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns Storage stats (total files, total size)
   */
  async getStorageStats(bucketType: 'reports' | 'backups' = 'reports'): Promise<{ totalFiles: number; totalSize: number }> {
    if (!this.db) {
      throw new Error('Database connection is null');
    }

    try {
      const filesCollection = this.db.collection(`${bucketType}.files`);
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
      logger.error(`❌ GridFS Service: Failed to get storage stats for ${bucketType}:`, error);
      throw error;
    }
  }

  /**
   * Get bucket instance (for advanced operations)
   * @param bucketType - Type of bucket ('reports' or 'backups')
   * @returns GridFSBucket instance
   */
  getBucket(bucketType: 'reports' | 'backups' = 'reports'): GridFSBucket {
    return this.getBucketByType(bucketType);
  }
}

// Export singleton instance
export default new GridFSService();


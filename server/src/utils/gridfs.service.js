const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const logger = require('./logger');

/**
 * GridFS Service for storing and retrieving large files
 * Handles PDF reports and other binary data
 */
class GridFSService {
  constructor() {
    this.bucket = null;
    this.db = null;
  }

  /**
   * Initialize GridFS bucket
   * Should be called after mongoose connection is established
   */
  initialize() {
    try {
      this.db = mongoose.connection.db;
      this.bucket = new GridFSBucket(this.db, {
        bucketName: 'reports'
      });
      logger.info('GridFS service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GridFS service:', error);
      throw error;
    }
  }

  /**
   * Store a file in GridFS
   * @param {Buffer|ReadableStream} fileData - File data as buffer or stream
   * @param {Object} metadata - File metadata
   * @param {string} metadata.filename - Original filename
   * @param {string} metadata.contentType - MIME type
   * @param {Object} metadata.metadata - Additional metadata
   * @returns {Promise<Object>} Upload result with file ID
   */
  async storeFile(fileData, { filename, contentType = 'application/pdf', metadata = {} }) {
    return new Promise((resolve, reject) => {
      if (!this.bucket) {
        reject(new Error('GridFS bucket not initialized'));
        return;
      }

      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType,
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
          size: fileData.length || 0
        }
      });

      uploadStream.on('error', (error) => {
        logger.error('GridFS upload error:', error);
        reject(error);
      });

      uploadStream.on('finish', () => {
        logger.info(`File stored in GridFS: ${filename}, ID: ${uploadStream.id}`);
        resolve({
          fileId: uploadStream.id,
          filename,
          size: uploadStream.length,
          uploadDate: uploadStream.uploadDate
        });
      });

      // Handle both Buffer and Stream inputs
      if (Buffer.isBuffer(fileData)) {
        uploadStream.write(fileData);
        uploadStream.end();
      } else if (fileData.pipe) {
        fileData.pipe(uploadStream);
      } else {
        reject(new Error('Invalid file data type. Expected Buffer or ReadableStream'));
      }
    });
  }

  /**
   * Retrieve a file from GridFS
   * @param {string|ObjectId} fileId - GridFS file ID
   * @returns {Promise<Object>} File info and stream
   */
  async getFile(fileId) {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    try {
      const mongoose = require('mongoose');
      
      // Ensure fileId is an ObjectId
      const objectId = fileId instanceof mongoose.Types.ObjectId 
        ? fileId 
        : new mongoose.Types.ObjectId(fileId);

      const fileInfo = await this.bucket.find({ _id: objectId }).next();
      if (!fileInfo) {
        throw new Error('File not found');
      }

      const downloadStream = this.bucket.openDownloadStream(objectId);

      return {
        fileInfo,
        stream: downloadStream
      };
    } catch (error) {
      logger.error('GridFS download error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from GridFS
   * @param {string|ObjectId} fileId - GridFS file ID
   * @returns {Promise<void>}
   */
  async deleteFile(fileId) {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    try {
      await this.bucket.delete(fileId);
      logger.info(`File deleted from GridFS: ${fileId}`);
    } catch (error) {
      logger.error('GridFS delete error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata without downloading
   * @param {string|ObjectId} fileId - GridFS file ID
   * @returns {Promise<Object>} File metadata
   */
  async getFileInfo(fileId) {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    try {
      const fileInfo = await this.bucket.find({ _id: fileId }).next();
      if (!fileInfo) {
        throw new Error('File not found');
      }
      return fileInfo;
    } catch (error) {
      logger.error('GridFS file info error:', error);
      throw error;
    }
  }

  /**
   * List files with optional filtering
   * @param {Object} filter - MongoDB filter object
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of file documents
   */
  async listFiles(filter = {}, options = {}) {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    try {
      const files = await this.bucket.find(filter, options).toArray();
      return files;
    } catch (error) {
      logger.error('GridFS list files error:', error);
      throw error;
    }
  }

  /**
   * Check if GridFS bucket is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.bucket !== null;
  }
}

// Export singleton instance
const gridFSService = new GridFSService();

module.exports = gridFSService;
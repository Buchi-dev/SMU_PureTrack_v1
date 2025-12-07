/**
 * Backup Routes
 * API endpoints for backup management (Admin only)
 */

import { Router } from 'express';
import {
  triggerBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  getBackupStatus,
} from './backup.controller';
import { requireAdmin } from '@core/middlewares';

const router = Router();

/**
 * @route   GET /api/v1/backups/status
 * @desc    Get backup system status
 * @access  Protected (Admin only)
 */
router.get('/status', requireAdmin, getBackupStatus);

/**
 * @route   GET /api/v1/backups
 * @desc    List all backups
 * @access  Protected (Admin only)
 */
router.get('/', requireAdmin, listBackups);

/**
 * @route   POST /api/v1/backups/trigger
 * @desc    Trigger manual backup
 * @access  Protected (Admin only)
 */
router.post('/trigger', requireAdmin, triggerBackup);

/**
 * @route   POST /api/v1/backups/:backupId/restore
 * @desc    Restore from backup (WARNING: Replaces all data)
 * @access  Protected (Admin only)
 */
router.post('/:backupId/restore', requireAdmin, restoreBackup);

/**
 * @route   DELETE /api/v1/backups/:backupId
 * @desc    Delete specific backup
 * @access  Protected (Admin only)
 */
router.delete('/:backupId', requireAdmin, deleteBackup);

export default router;

import { Router } from 'express';
import ExampleController from './example.controller';

const router = Router();

/**
 * Example routes demonstrating Query Builder and CRUD operations
 * 
 * Query Parameters for GET /:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sort: Sort field (prefix with - for descending, e.g., -createdAt)
 * - fields: Comma-separated fields to return
 * - search: Search term for name and description
 * - status: Filter by status (active/inactive)
 * - minValue: Minimum value filter
 * - maxValue: Maximum value filter
 * - tags: Filter by tags (can be comma-separated or multiple params)
 * - startDate: Start date for date range filter
 * - endDate: End date for date range filter
 */

// Statistics endpoint (must be before :id route)
router.get('/stats', ExampleController.getStats);

// Search endpoint
router.get('/search', ExampleController.search);

// Get by tag endpoint
router.get('/tag/:tag', ExampleController.getByTag);

// Standard CRUD routes
router.get('/', ExampleController.getAll);
router.get('/:id', ExampleController.getById);
router.post('/', ExampleController.create);
router.post('/bulk', ExampleController.createMany);
router.put('/:id', ExampleController.update);
router.delete('/:id', ExampleController.delete);

// Status management routes
router.patch('/:id/activate', ExampleController.activate);
router.patch('/:id/deactivate', ExampleController.deactivate);
router.post('/bulk-activate', ExampleController.bulkActivate);
router.post('/bulk-deactivate', ExampleController.bulkDeactivate);

export default router;

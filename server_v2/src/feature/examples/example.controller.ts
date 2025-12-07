import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@utils/asyncHandler.util';
import ResponseHandler from '@utils/response.util';
import exampleService from './example.service';

/**
 * Example controller demonstrating Query Builder and CRUD operations
 */
export class ExampleController {
  /**
   * Get all items with pagination and filters
   * Query params: page, limit, sort, fields, search, status, minValue, maxValue, tags
   */
  static getAll = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const {
      page,
      limit,
      sort,
      fields,
      search,
      status,
      minValue,
      maxValue,
      tags,
      startDate,
      endDate,
    } = req.query;

    const result = await exampleService.getAllExamples({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      fields: fields as string,
      search: search as string,
      status: status as 'active' | 'inactive',
      minValue: minValue ? Number(minValue) : undefined,
      maxValue: maxValue ? Number(maxValue) : undefined,
      tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    ResponseHandler.success(
      res,
      result.data,
      'Items retrieved successfully',
      200,
      result.pagination
    );
  });

  /**
   * Get item by ID
   */
  static getById = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new Error('ID is required');
    const data = await exampleService.getExampleById(id);
    ResponseHandler.success(res, data, 'Item retrieved successfully');
  });

  /**
   * Create new item
   */
  static create = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const data = await exampleService.createExample(req.body);
    ResponseHandler.created(res, data, 'Item created successfully');
  });

  /**
   * Create multiple items
   */
  static createMany = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const data = await exampleService.createManyExamples(req.body);
    ResponseHandler.created(res, data, 'Items created successfully');
  });

  /**
   * Update item
   */
  static update = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new Error('ID is required');
    const data = await exampleService.updateExample(id, req.body);
    ResponseHandler.success(res, data, 'Item updated successfully');
  });

  /**
   * Delete item
   */
  static delete = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new Error('ID is required');
    await exampleService.deleteExample(id);
    ResponseHandler.noContent(res);
  });

  /**
   * Get statistics
   */
  static getStats = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const data = await exampleService.getExampleStats();
    ResponseHandler.success(res, data, 'Statistics retrieved successfully');
  });

  /**
   * Activate item
   */
  static activate = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new Error('ID is required');
    const data = await exampleService.activateExample(id);
    ResponseHandler.success(res, data, 'Item activated successfully');
  });

  /**
   * Deactivate item
   */
  static deactivate = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new Error('ID is required');
    const data = await exampleService.deactivateExample(id);
    ResponseHandler.success(res, data, 'Item deactivated successfully');
  });

  /**
   * Bulk activate items
   */
  static bulkActivate = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { ids } = req.body;
    const data = await exampleService.bulkActivate(ids);
    ResponseHandler.success(res, data, 'Items activated successfully');
  });

  /**
   * Bulk deactivate items
   */
  static bulkDeactivate = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { ids } = req.body;
    const data = await exampleService.bulkDeactivate(ids);
    ResponseHandler.success(res, data, 'Items deactivated successfully');
  });

  /**
   * Search items
   */
  static search = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { q } = req.query;
    const data = await exampleService.searchExamples(q as string);
    ResponseHandler.success(res, data, 'Search completed successfully');
  });

  /**
   * Get items by tag
   */
  static getByTag = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { tag } = req.params;
    if (!tag) throw new Error('Tag is required');
    const data = await exampleService.getExamplesByTag(tag);
    ResponseHandler.success(res, data, 'Items retrieved successfully');
  });
}

export default ExampleController;

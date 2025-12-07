// Type alias for Mongoose filter query
type FilterQuery<T> = Partial<Record<keyof T, any>> & Record<string, any>;
import { ExampleModel, IExampleDocument } from './example.model';
import { CRUDOperations, QueryBuilderOptions, QueryResult } from '@utils/queryBuilder.util';
import { NotFoundError, BadRequestError } from '@utils/errors.util';

/**
 * Example Service demonstrating Query Builder and CRUD Operations usage
 */
export class ExampleService {
  private crud: CRUDOperations<IExampleDocument>;

  constructor() {
    this.crud = new CRUDOperations(ExampleModel);
  }

  /**
   * Get all examples with pagination and filters
   */
  async getAllExamples(queryOptions: QueryBuilderOptions & {
    search?: string;
    status?: 'active' | 'inactive';
    minValue?: number;
    maxValue?: number;
    tags?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<QueryResult<IExampleDocument>> {
    const {
      page,
      limit,
      sort,
      fields,
      populate,
      search,
      status,
      minValue,
      maxValue,
      tags,
      startDate,
      endDate,
    } = queryOptions;

    const query = this.crud.query();

    // Apply search
    if (search) {
      query.search(['name', 'description'], search);
    }

    // Apply filters
    const filters: FilterQuery<IExampleDocument> = {};
    if (status) filters.status = status;
    query.filter(filters);

    // Apply numeric range
    if (minValue !== undefined || maxValue !== undefined) {
      query.numericRange('value', minValue, maxValue);
    }

    // Apply tags filter
    if (tags && tags.length > 0) {
      query.whereIn('tags', tags);
    }

    // Apply date range
    if (startDate || endDate) {
      query.dateRange('createdAt', startDate, endDate);
    }

    // Apply pagination and sorting
    query.paginate(page, limit).sortBy(sort);

    // Apply field selection
    if (fields) {
      query.selectFields(fields);
    }

    // Apply population
    if (populate) {
      query.populateFields(populate);
    }

    return await query.execute();
  }

  /**
   * Get example by ID
   */
  async getExampleById(id: string): Promise<IExampleDocument> {
    const example = await this.crud.findById(id);
    
    if (!example) {
      throw new NotFoundError(`Example with ID ${id} not found`);
    }

    return example;
  }

  /**
   * Create new example
   */
  async createExample(data: {
    name: string;
    description?: string;
    status?: 'active' | 'inactive';
    value: number;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<IExampleDocument> {
    // Check if example with same name exists
    const exists = await this.crud.exists({ name: data.name } as FilterQuery<IExampleDocument>);
    
    if (exists) {
      throw new BadRequestError(`Example with name "${data.name}" already exists`);
    }

    return await this.crud.create(data);
  }

  /**
   * Create multiple examples
   */
  async createManyExamples(data: Array<{
    name: string;
    description?: string;
    status?: 'active' | 'inactive';
    value: number;
    tags?: string[];
    metadata?: Record<string, any>;
  }>): Promise<IExampleDocument[]> {
    return await this.crud.createMany(data);
  }

  /**
   * Update example by ID
   */
  async updateExample(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      status: 'active' | 'inactive';
      value: number;
      tags: string[];
      metadata: Record<string, any>;
    }>
  ): Promise<IExampleDocument> {
    // Check if updating name to existing name
    if (data.name) {
      const exists = await this.crud.findOne({
        name: data.name,
        _id: { $ne: id },
      } as FilterQuery<IExampleDocument>);

      if (exists) {
        throw new BadRequestError(`Example with name "${data.name}" already exists`);
      }
    }

    const updated = await this.crud.updateById(id, data);

    if (!updated) {
      throw new NotFoundError(`Example with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Update multiple examples by filter
   */
  async updateManyExamples(
    filter: FilterQuery<IExampleDocument>,
    data: Partial<{
      status: 'active' | 'inactive';
      tags: string[];
      metadata: Record<string, any>;
    }>
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    return await this.crud.updateMany(filter, data);
  }

  /**
   * Delete example by ID
   */
  async deleteExample(id: string): Promise<void> {
    const deleted = await this.crud.deleteById(id);

    if (!deleted) {
      throw new NotFoundError(`Example with ID ${id} not found`);
    }
  }

  /**
   * Delete multiple examples by filter
   */
  async deleteManyExamples(
    filter: FilterQuery<IExampleDocument>
  ): Promise<{ deletedCount: number }> {
    return await this.crud.deleteMany(filter);
  }

  /**
   * Get example statistics
   */
  async getExampleStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalValue: number;
    averageValue: number;
  }> {
    const total = await this.crud.count();
    const active = await this.crud.count({ status: 'active' } as FilterQuery<IExampleDocument>);
    const inactive = await this.crud.count({ status: 'inactive' } as FilterQuery<IExampleDocument>);

    // Use aggregation for sum and average
    const aggregation = await ExampleModel.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$value' },
          averageValue: { $avg: '$value' },
        },
      },
    ]);

    const stats = aggregation[0] || { totalValue: 0, averageValue: 0 };

    return {
      total,
      active,
      inactive,
      totalValue: stats.totalValue,
      averageValue: stats.averageValue,
    };
  }

  /**
   * Activate example
   */
  async activateExample(id: string): Promise<IExampleDocument> {
    return await this.updateExample(id, { status: 'active' });
  }

  /**
   * Deactivate example
   */
  async deactivateExample(id: string): Promise<IExampleDocument> {
    return await this.updateExample(id, { status: 'inactive' });
  }

  /**
   * Bulk activate examples
   */
  async bulkActivate(ids: string[]): Promise<{ modifiedCount: number }> {
    const result = await this.crud.updateMany(
      { _id: { $in: ids } } as FilterQuery<IExampleDocument>,
      { status: 'active' }
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Bulk deactivate examples
   */
  async bulkDeactivate(ids: string[]): Promise<{ modifiedCount: number }> {
    const result = await this.crud.updateMany(
      { _id: { $in: ids } } as FilterQuery<IExampleDocument>,
      { status: 'inactive' }
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Get examples by tag
   */
  async getExamplesByTag(tag: string): Promise<IExampleDocument[]> {
    return await this.crud.query()
      .filter({ tags: tag } as FilterQuery<IExampleDocument>)
      .sortBy('-createdAt')
      .executeAll();
  }

  /**
   * Search examples
   */
  async searchExamples(searchTerm: string): Promise<IExampleDocument[]> {
    return await this.crud.query()
      .search(['name', 'description'], searchTerm)
      .sortBy('name')
      .executeAll();
  }
}

export default new ExampleService();

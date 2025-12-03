import { Model, QueryOptions, Document } from 'mongoose';

// Type aliases for Mongoose query types
type FilterQuery<T> = Partial<Record<keyof T, any>> & Record<string, any>;
type UpdateQuery<T> = Partial<T> & Record<string, any>;

/**
 * Query Builder options for pagination
 */
export interface QueryBuilderOptions {
  page?: number;
  limit?: number;
  sort?: string;
  fields?: string;
  populate?: string | string[];
}

/**
 * Query result with pagination metadata
 */
export interface QueryResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Generic Query Builder for MongoDB CRUD operations
 * Provides reusable methods for common database operations
 */
export class QueryBuilder<T extends Document> {
  private model: Model<T>;
  private query: FilterQuery<T>;
  private options: QueryBuilderOptions;

  constructor(model: Model<T>) {
    this.model = model;
    this.query = {};
    this.options = {
      page: 1,
      limit: 10,
      sort: '-createdAt',
    };
  }

  /**
   * Set filter conditions
   */
  public filter(conditions: FilterQuery<T>): this {
    this.query = { ...this.query, ...conditions };
    return this;
  }

  /**
   * Add search functionality (case-insensitive)
   */
  public search(fields: string[], searchTerm: string): this {
    if (searchTerm && fields.length > 0) {
      const searchRegex = new RegExp(searchTerm, 'i');
      (this.query as any).$or = fields.map((field) => ({
        [field]: searchRegex,
      }));
    }
    return this;
  }

  /**
   * Set pagination
   */
  public paginate(page?: number, limit?: number): this {
    if (page) this.options.page = Math.max(1, page);
    if (limit) this.options.limit = Math.max(1, Math.min(100, limit));
    return this;
  }

  /**
   * Set sorting
   */
  public sortBy(sort?: string): this {
    if (sort) this.options.sort = sort;
    return this;
  }

  /**
   * Select specific fields
   */
  public selectFields(fields?: string): this {
    if (fields) this.options.fields = fields;
    return this;
  }

  /**
   * Populate related documents
   */
  public populateFields(populate?: string | string[]): this {
    if (populate) this.options.populate = populate;
    return this;
  }

  /**
   * Add date range filter
   */
  public dateRange(field: string, startDate?: Date, endDate?: Date): this {
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      this.query[field as keyof FilterQuery<T>] = dateFilter;
    }
    return this;
  }

  /**
   * Add numeric range filter
   */
  public numericRange(field: string, min?: number, max?: number): this {
    if (min !== undefined || max !== undefined) {
      const rangeFilter: any = {};
      if (min !== undefined) rangeFilter.$gte = min;
      if (max !== undefined) rangeFilter.$lte = max;
      this.query[field as keyof FilterQuery<T>] = rangeFilter;
    }
    return this;
  }

  /**
   * Add "in" filter for multiple values
   */
  public whereIn(field: string, values: any[]): this {
    if (values && values.length > 0) {
      this.query[field as keyof FilterQuery<T>] = { $in: values } as any;
    }
    return this;
  }

  /**
   * Execute query and return paginated results
   */
  public async execute(): Promise<QueryResult<T>> {
    const page = this.options.page || 1;
    const limit = this.options.limit || 10;
    const skip = (page - 1) * limit;

    // Count total documents
    const total = await this.model.countDocuments(this.query);

    // Build query
    let queryBuilder = this.model
      .find(this.query)
      .skip(skip)
      .limit(limit);

    // Apply sorting
    if (this.options.sort) {
      queryBuilder = queryBuilder.sort(this.options.sort);
    }

    // Apply field selection
    if (this.options.fields) {
      queryBuilder = queryBuilder.select(this.options.fields) as any;
    }

    // Apply population
    if (this.options.populate) {
      if (Array.isArray(this.options.populate)) {
        this.options.populate.forEach((pop) => {
          queryBuilder = queryBuilder.populate(pop);
        });
      } else {
        queryBuilder = queryBuilder.populate(this.options.populate);
      }
    }

    // Execute query
    const data = await queryBuilder.exec();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Execute query and return all results (no pagination)
   */
  public async executeAll(): Promise<T[]> {
    let queryBuilder = this.model.find(this.query);

    if (this.options.sort) {
      queryBuilder = queryBuilder.sort(this.options.sort);
    }

    if (this.options.fields) {
      queryBuilder = queryBuilder.select(this.options.fields) as any;
    }

    if (this.options.populate) {
      if (Array.isArray(this.options.populate)) {
        this.options.populate.forEach((pop) => {
          queryBuilder = queryBuilder.populate(pop) as any;
        });
      } else {
        queryBuilder = queryBuilder.populate(this.options.populate) as any;
      }
    }

    return await queryBuilder.exec();
  }

  /**
   * Execute query and return first result
   */
  public async executeOne(): Promise<T | null> {
    let queryBuilder = this.model.findOne(this.query);

    if (this.options.fields) {
      queryBuilder = queryBuilder.select(this.options.fields) as any;
    }

    if (this.options.populate) {
      if (Array.isArray(this.options.populate)) {
        this.options.populate.forEach((pop) => {
          queryBuilder = queryBuilder.populate(pop);
        });
      } else {
        queryBuilder = queryBuilder.populate(this.options.populate);
      }
    }

    return await queryBuilder.exec();
  }

  /**
   * Count documents matching the query
   */
  public async count(): Promise<number> {
    return await this.model.countDocuments(this.query);
  }

  /**
   * Check if any document exists matching the query
   */
  public async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }
}

/**
 * CRUD Operations Helper
 * Provides standard CRUD operations with proper error handling
 */
export class CRUDOperations<T extends Document> {
  private model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Create a new document
   */
  public async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return await document.save();
  }

  /**
   * Create multiple documents
   */
  public async createMany(data: Partial<T>[]): Promise<T[]> {
    return await this.model.insertMany(data) as any;
  }

  /**
   * Find document by ID
   */
  public async findById(
    id: string,
    options?: { populate?: string | string[]; select?: string }
  ): Promise<T | null> {
    let query = this.model.findById(id);

    if (options?.select) {
      query = query.select(options.select) as any;
    }

    if (options?.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    return await query.exec();
  }

  /**
   * Find all documents with optional filters
   */
  public async findAll(
    filter: FilterQuery<T> = {},
    options?: QueryOptions
  ): Promise<T[]> {
    return await this.model.find(filter, null, options).exec();
  }

  /**
   * Find one document by filter
   */
  public async findOne(
    filter: FilterQuery<T>,
    options?: { populate?: string | string[]; select?: string }
  ): Promise<T | null> {
    let query = this.model.findOne(filter);

    if (options?.select) {
      query = query.select(options.select) as any;
    }

    if (options?.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    return await query.exec();
  }

  /**
   * Update document by ID
   */
  public async updateById(
    id: string,
    data: UpdateQuery<T>,
    options?: { new?: boolean; runValidators?: boolean }
  ): Promise<T | null> {
    return await this.model.findByIdAndUpdate(
      id,
      data,
      {
        new: options?.new !== false,
        runValidators: options?.runValidators !== false,
      }
    ).exec();
  }

  /**
   * Update one document by filter
   */
  public async updateOne(
    filter: FilterQuery<T>,
    data: UpdateQuery<T>,
    options?: { new?: boolean; runValidators?: boolean }
  ): Promise<T | null> {
    return await this.model.findOneAndUpdate(
      filter,
      data,
      {
        new: options?.new !== false,
        runValidators: options?.runValidators !== false,
      }
    ).exec();
  }

  /**
   * Update multiple documents
   */
  public async updateMany(
    filter: FilterQuery<T>,
    data: UpdateQuery<T>
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    const result = await this.model.updateMany(filter, data).exec();
    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  /**
   * Delete document by ID
   */
  public async deleteById(id: string): Promise<T | null> {
    return await this.model.findByIdAndDelete(id).exec();
  }

  /**
   * Delete one document by filter
   */
  public async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    return await this.model.findOneAndDelete(filter).exec();
  }

  /**
   * Delete multiple documents
   */
  public async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }> {
    const result = await this.model.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount };
  }

  /**
   * Check if document exists by ID
   */
  public async existsById(id: string): Promise<boolean> {
    const doc = await this.model.exists({ _id: id } as any);
    return doc !== null;
  }

  /**
   * Check if document exists by filter
   */
  public async exists(filter: FilterQuery<T>): Promise<boolean> {
    const doc = await this.model.exists(filter);
    return doc !== null;
  }

  /**
   * Count documents by filter
   */
  public async count(filter: FilterQuery<T> = {}): Promise<number> {
    return await this.model.countDocuments(filter).exec();
  }

  /**
   * Get paginated results using QueryBuilder
   */
  public query(): QueryBuilder<T> {
    // @ts-ignore: Type compatibility issue with Mongoose Model generics
    return new QueryBuilder<T>(this.model);
  }
}

export default CRUDOperations;

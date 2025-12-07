import { Schema, model, Document } from 'mongoose';

/**
 * Example interface for TypeScript
 */
export interface IExample {
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  value: number;
  tags: string[];
  metadata?: Record<string, any>;
}

/**
 * Example document interface (includes Mongoose Document properties)
 */
export interface IExampleDocument extends IExample, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Example Mongoose schema
 */
const exampleSchema = new Schema<IExampleDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    value: {
      type: Number,
      required: [true, 'Value is required'],
      min: [0, 'Value must be non-negative'],
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
exampleSchema.index({ name: 1 });
exampleSchema.index({ status: 1 });
exampleSchema.index({ createdAt: -1 });

// Virtual properties
exampleSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

// Instance methods
exampleSchema.methods.activate = function () {
  this.status = 'active';
  return this.save();
};

exampleSchema.methods.deactivate = function () {
  this.status = 'inactive';
  return this.save();
};

// Static methods
exampleSchema.statics.findByStatus = function (status: 'active' | 'inactive') {
  return this.find({ status });
};

/**
 * Example Model
 */
export const ExampleModel = model<IExampleDocument>('Example', exampleSchema);

export default ExampleModel;

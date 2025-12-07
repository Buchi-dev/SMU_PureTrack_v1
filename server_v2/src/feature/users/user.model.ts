/**
 * User Model
 * Mongoose schema for user management with Firebase authentication support
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  IUserDocument,
  IUserPublic,
  UserRole,
  UserStatus,
  AuthProvider,
} from './user.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * User Schema
 * Stores user information with support for Firebase/Google OAuth
 */
const userSchema = new Schema<IUserDocument>(
  {
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true, // Allows null but enforces uniqueness when present
      index: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Legacy support
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    middleName: {
      type: String,
    },
    department: {
      type: String,
      index: true,
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^\+?\d{10,15}$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid phone number!`,
      },
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STAFF,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.FIREBASE,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    profileComplete: {
      type: Boolean,
      default: false,
    },
    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: false,
      },
      sendScheduledAlerts: {
        type: Boolean,
        default: true,
      },
      alertSeverities: {
        type: [String],
        enum: ['Critical', 'Warning', 'Advisory'],
        default: ['Critical', 'Warning'],
      },
      parameters: {
        type: [String],
        enum: ['pH', 'Turbidity', 'TDS'],
        default: ['pH', 'Turbidity', 'TDS'],
      },
      devices: {
        type: [String],
        default: [],
      },
      quietHoursEnabled: {
        type: Boolean,
        default: false,
      },
      quietHoursStart: {
        type: String,
        default: '22:00',
      },
      quietHoursEnd: {
        type: String,
        default: '08:00',
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: COLLECTIONS.USERS,
  }
);

/**
 * Compound indexes for optimized queries
 */
userSchema.index({ role: 1, status: 1 });
userSchema.index({ status: 1, createdAt: -1 });

/**
 * Pre-save hook to auto-update profileComplete field
 */
userSchema.pre('save', function(next) {
  if (this.department && this.phoneNumber) {
    this.profileComplete = true;
  } else {
    this.profileComplete = false;
  }
  next();
});

/**
 * Instance method to get public profile
 * @returns Public user object safe for client consumption
 */
userSchema.methods.toPublicProfile = function (this: IUserDocument): IUserPublic {
  return {
    _id: this._id,
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    firstName: this.firstName,
    lastName: this.lastName,
    middleName: this.middleName,
    department: this.department,
    phoneNumber: this.phoneNumber,
    profilePicture: this.profilePicture,
    role: this.role,
    status: this.status,
    provider: this.provider,
    profileComplete: this.profileComplete,
    lastLogin: this.lastLogin,
    notificationPreferences: this.notificationPreferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Pre-save hook: Update lastLogin on every save if status is active
 */
userSchema.pre('save', function () {
  if (this.status === UserStatus.ACTIVE && !this.isNew) {
    this.lastLogin = new Date();
  }
});

/**
 * User Model
 */
const User: Model<IUserDocument> = mongoose.model<IUserDocument>(
  COLLECTIONS.USERS,
  userSchema
);

export default User;

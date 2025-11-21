const mongoose = require('mongoose');

/**
 * User Schema for storing user information
 * Supports both Google OAuth and traditional authentication
 */
const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true, // Allows null values but enforces uniqueness when present
      index: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values but enforces uniqueness when present (legacy)
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+?\d{10,15}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      },
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'staff',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'pending',
    },
    provider: {
      type: String,
      enum: ['google', 'firebase', 'local'],
      default: 'firebase',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
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
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

/**
 * Create compound indexes for better query performance
 * Note: email and googleId already have unique indexes from schema definition
 */
userSchema.index({ role: 1, status: 1 });

/**
 * Instance method to get public profile
 */
userSchema.methods.toPublicProfile = function () {
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
    lastLogin: this.lastLogin,
    notificationPreferences: this.notificationPreferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;

const User = require('./user.Model');

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-googleId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.toPublicProfile(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

/**
 * Get all users (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select('-googleId')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users.map(user => user.toPublicProfile()),
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

/**
 * Update user role (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'staff', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-googleId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if admin is modifying their own role (requires logout)
    const requiresLogout = req.user._id.toString() === req.params.id;

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user.toPublicProfile(),
      requiresLogout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message,
    });
  }
};

/**
 * Update user status (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-googleId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if admin is modifying their own status (requires logout)
    const requiresLogout = req.user._id.toString() === req.params.id;

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user.toPublicProfile(),
      requiresLogout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message,
    });
  }
};

/**
 * Update user profile (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserProfile = async (req, res) => {
  try {
    const { displayName, firstName, lastName, middleName, department, phoneNumber } = req.body;
    
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (middleName !== undefined) updates.middleName = middleName;
    if (department !== undefined) updates.department = department;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: user.toPublicProfile(),
      updates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user profile',
      error: error.message,
    });
  }
};

/**
 * Delete user (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      userId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

/**
 * Get user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Only allow users to view their own preferences unless admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own preferences',
      });
    }

    res.json({
      success: true,
      data: user.notificationPreferences || {},
    });
  } catch (error) {
    console.error('[User Controller] Error fetching preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences',
      error: error.message,
    });
  }
};

/**
 * Update user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserPreferences = async (req, res) => {
  try {
    const {
      emailNotifications,
      pushNotifications,
      sendScheduledAlerts,
      alertSeverities,
      parameters,
      devices,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
    } = req.body;

    // Only allow users to update their own preferences unless admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own preferences',
      });
    }

    const updates = {};
    if (emailNotifications !== undefined) updates['notificationPreferences.emailNotifications'] = emailNotifications;
    if (pushNotifications !== undefined) updates['notificationPreferences.pushNotifications'] = pushNotifications;
    if (sendScheduledAlerts !== undefined) updates['notificationPreferences.sendScheduledAlerts'] = sendScheduledAlerts;
    if (alertSeverities !== undefined) updates['notificationPreferences.alertSeverities'] = alertSeverities;
    if (parameters !== undefined) updates['notificationPreferences.parameters'] = parameters;
    if (devices !== undefined) updates['notificationPreferences.devices'] = devices;
    if (quietHoursEnabled !== undefined) updates['notificationPreferences.quietHoursEnabled'] = quietHoursEnabled;
    if (quietHoursStart !== undefined) updates['notificationPreferences.quietHoursStart'] = quietHoursStart;
    if (quietHoursEnd !== undefined) updates['notificationPreferences.quietHoursEnd'] = quietHoursEnd;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid preference fields to update',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.notificationPreferences,
    });
  } catch (error) {
    console.error('[User Controller] Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences',
      error: error.message,
    });
  }
};

/**
 * Reset user notification preferences to defaults
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetUserPreferences = async (req, res) => {
  try {
    // Only allow users to reset their own preferences unless admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only reset your own preferences',
      });
    }

    const defaultPreferences = {
      emailNotifications: true,
      pushNotifications: false,
      sendScheduledAlerts: true,
      alertSeverities: ['Critical', 'Warning'],
      parameters: ['pH', 'Turbidity', 'TDS', 'Temperature'],
      devices: [],
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { notificationPreferences: defaultPreferences },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification preferences reset to defaults',
      data: user.notificationPreferences,
    });
  } catch (error) {
    console.error('[User Controller] Error resetting preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting notification preferences',
      error: error.message,
    });
  }
};

module.exports = {
  getUserById,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserProfile,
  deleteUser,
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
};

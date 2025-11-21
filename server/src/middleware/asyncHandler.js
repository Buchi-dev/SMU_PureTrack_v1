/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass to error handler
 * Eliminates need for try-catch blocks in every controller
 * 
 * Usage:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;

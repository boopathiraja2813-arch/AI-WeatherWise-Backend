const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract the token
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, no token provided'
        });
      }

      // Decode and verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!');

      // If DB is connected, fetch full user document
      if (mongoose.connection.readyState === 1) {
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Not authorized, user not found'
          });
        }
      } else {
        // If DB is offline, attach decoded token payload so stateless protected routes (e.g. AI insights) can function
        req.user = { _id: decoded.id, isOffline: true };
      }

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token has expired'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token verification failed'
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Not authorized, no token provided'
  });
};

module.exports = { protect };

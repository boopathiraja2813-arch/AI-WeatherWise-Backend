const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const checkDBConnection = () => {
  return mongoose.connection.readyState === 1;
};

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!', {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate inputs first
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please add all fields' });
    }

    if (typeof email !== 'string' || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Now verify database connection before executing queries
    if (!checkDBConnection()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Please ensure MongoDB is running or configure MONGO_URI in .env'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user (password hashing is done in pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role && ['user', 'admin'].includes(role) ? role : 'user'
    });

    if (user) {
      return res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs first
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Verify database connection before querying
    if (!checkDBConnection()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Please ensure MongoDB is running or configure MONGO_URI in .env'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    if (!checkDBConnection()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Please ensure MongoDB is running or configure MONGO_URI in .env'
      });
    }

    // req.user is set by protect middleware
    return res.json({
      success: true,
      data: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      }
    });
  } catch (error) {
    console.error('Profile retrieval error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};

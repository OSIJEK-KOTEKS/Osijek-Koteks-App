const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      company,
      code,
      role,
      isVerified,
    } = req.body;

    const user = new User({
      email,
      password, // This will be hashed by the pre-save hook
      firstName,
      lastName,
      company,
      code,
      role: role || 'user',
      isVerified: isVerified || false,
    });

    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});

// Get a specific user by ID
router.get('/:id', getUser, (req, res) => {
  res.json(res.user);
});

// Get a user by UID
router.get('/uid/:uid', async (req, res) => {
  try {
    const user = await User.findOne({uid: req.params.uid});
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Update a user
router.patch('/:id', getUser, async (req, res) => {
  const updatableFields = [
    'firstName',
    'lastName',
    'company',
    'email', // Changed from phoneNumber to email
    'code',
    'role',
    'isVerified',
  ];

  updatableFields.forEach(field => {
    if (req.body[field] != null) {
      res.user[field] = req.body[field];
    }
  });

  try {
    const updatedUser = await res.user.save();
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const result = await User.deleteOne({_id: req.params.id});
    if (result.deletedCount === 0) {
      return res.status(404).json({message: 'Cannot find user'});
    }
    res.json({message: 'User deleted'});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Middleware function to get a user by ID
async function getUser(req, res, next) {
  let user;
  try {
    user = await User.findById(req.params.id);
    if (user == null) {
      return res.status(404).json({message: 'Cannot find user'});
    }
  } catch (err) {
    return res.status(500).json({message: err.message});
  }

  res.user = user;
  next();
}

module.exports = router;

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
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    company: req.body.company,
    phoneNumber: req.body.phoneNumber,
    code: req.body.code,
    role: req.body.role || 'user', // Default to 'user' if not provided
    isVerified: req.body.isVerified || false, // Default to false if not provided
  });

  try {
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});

// Get a specific user
router.get('/:id', getUser, (req, res) => {
  res.json(res.user);
});

// Update a user
router.patch('/:id', getUser, async (req, res) => {
  if (req.body.firstName != null) {
    res.user.firstName = req.body.firstName;
  }
  if (req.body.lastName != null) {
    res.user.lastName = req.body.lastName;
  }
  if (req.body.company != null) {
    res.user.company = req.body.company;
  }
  if (req.body.phoneNumber != null) {
    res.user.phoneNumber = req.body.phoneNumber;
  }
  if (req.body.code != null) {
    res.user.code = req.body.code;
  }
  if (req.body.role != null) {
    res.user.role = req.body.role;
  }
  if (req.body.isVerified != null) {
    res.user.isVerified = req.body.isVerified;
  }

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

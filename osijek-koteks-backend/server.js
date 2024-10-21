const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Routes
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const itemsRouter = require('./routes/items');

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/items', itemsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Function to drop the uid_1 index
const dropUidIndex = async () => {
  try {
    await mongoose.connection.collection('users').dropIndex('uid_1');
    console.log('Successfully dropped uid_1 index');
  } catch (error) {
    if (error.code === 27) {
      console.log('Index uid_1 does not exist, skipping drop');
    } else {
      console.error('Error dropping uid_1 index:', error);
    }
  }
};

// MongoDB connection and server start
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    await dropUidIndex();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

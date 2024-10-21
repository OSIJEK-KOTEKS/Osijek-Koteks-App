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

// MongoDB Connection
console.log('MONGODB_URI:', process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
const usersRouter = require('./routes/users');
const itemsRouter = require('./routes/items');
const authRouter = require('./routes/auth');

app.use('/api/users', usersRouter);
app.use('/api/items', itemsRouter);
app.use('/api/auth', authRouter);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Osijek Koteks API');
});

// Database Connection Test Route
app.get('/test-db', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({status: 'Database connected'});
  } catch (error) {
    res
      .status(500)
      .json({status: 'Database connection failed', error: error.message});
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 Route
app.use((req, res) => {
  res.status(404).send('Sorry, that route does not exist.');
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

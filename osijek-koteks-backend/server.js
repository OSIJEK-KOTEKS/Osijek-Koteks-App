const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('MONGODB_URI:', process.env.MONGODB_URI); // Add this line
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
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
  });

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

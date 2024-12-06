const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import models
const Item = require('./models/Item');

const app = express();

// Basic CORS configuration
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600,
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Basic security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route for MongoDB connection
app.get('/api/test-db', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    await mongoose.connection.db.admin().ping();
    res.json({
      status: 'success',
      message: 'Successfully connected to MongoDB Atlas',
      database: mongoose.connection.db.databaseName,
      connectionState: mongoose.connection.readyState,
    });
  } catch (error) {
    console.error('Database ping error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database',
      error: error.message,
      connectionState: mongoose.connection.readyState,
    });
  }
});

// Data retention middleware
const dataRetentionMiddleware = async (req, res, next) => {
  try {
    const retentionPeriod = process.env.DATA_RETENTION_DAYS || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);

    // Clean up old items
    if (req.path.includes('/api/items')) {
      await Item.deleteMany({
        creationDate: {$lt: cutoffDate},
        approvalStatus: {$in: ['odobreno', 'odbijen']},
      });
    }

    next();
  } catch (error) {
    console.error('Data retention error:', error);
    next(error);
  }
};

// Apply data retention middleware to API routes
app.use('/api', dataRetentionMiddleware);

// Routes
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const itemsRouter = require('./routes/items');

// GDPR Routes
app.get('/api/privacy-policy', (req, res) => {
  res.json({
    version: '1.0',
    lastUpdated: '2024-03-14',
    content: {
      dataCollection: [
        'Osobni podaci (ime, prezime, email)',
        'Podaci o lokaciji pri odobrenju dokumenata',
        'Fotografije dokumenata',
        'Podaci o korištenju aplikacije',
      ],
      dataPurpose: [
        'Autentikacija korisnika',
        'Odobravanje dokumenata',
        'Praćenje radnih naloga',
        'Poboljšanje korisničkog iskustva',
      ],
      dataRetention: `${process.env.DATA_RETENTION_DAYS || 365} dana`,
      userRights: [
        'Pravo na pristup podacima',
        'Pravo na brisanje podataka',
        'Pravo na ispravak podataka',
        'Pravo na prijenos podataka',
      ],
    },
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/items', itemsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    message: 'Došlo je do greške na poslužitelju.',
    errorId: Math.random().toString(36).substring(7),
  });
});

// MongoDB connection and server start
mongoose
  .connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Handle server shutdown gracefully
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

module.exports = app;

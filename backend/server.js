require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Updated CORS configuration for production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
       process.env.CLIENT_URL || 'https://plate-scanner-api.onrender.com',
      'https://plate-scanner-api.onrender.com'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:3000',
      'http://localhost:5500'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Serve frontend static files but don't auto-serve index.html so we control the root
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath, { index: false }));

// Connect to MongoDB with basic error handling
const mongooseOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
};

const mongoUri = process.env.MONGODB_URI || '';
mongoose.connect(mongoUri, mongooseOpts)
  .then(() => {
    console.log('MongoDB connected');
  }).catch(err => {
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
  });

// Global error handlers to surface unexpected crashes in the terminal
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  // optional: process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason && reason.stack ? reason.stack : reason);
});

const PlateSchema = new mongoose.Schema({
  plateNumber: String,
  ownerInfo: {
    name: String,
    phoneNo: String,
  },
  carInfo: {
    model: String,
    color: String,
    category: String,
    expires: Date,
  },
  status: String,
  registeredBy: String,
});

const Plate = mongoose.model("Plate", PlateSchema);

app.get("/api/plates", async (req, res) => {
  const { query, status, registeredBy } = req.query;
  let filter = {};

  if (query) {
    filter.$or = [
      { plateNumber: new RegExp(query, "i") },
      { "ownerInfo.name": new RegExp(query, "i") },
    ];
  }

  if (status && status !== "All") {
    filter.status = status;
  }

  if (registeredBy && registeredBy !== "All") {
    filter.registeredBy = registeredBy;
  }

  const plates = await Plate.find(filter);
  res.json(plates);
});

app.post("/api/plates", async (req, res) => {
  const newPlate = new Plate(req.body);
  await newPlate.save();
  res.json(newPlate);
});

app.put("/api/plates/:id", async (req, res) => {
  try {
    const updatedPlate = await Plate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedPlate);
  } catch (err) {
    res.status(400).json({ error: "Error updating plate" });
  }
});

app.delete("/api/plates/:id", async (req, res) => {
  try {
    await Plate.findByIdAndDelete(req.params.id);
    res.json({ message: "Plate deleted" });
  } catch (err) {
    res.status(400).json({ error: "Error deleting plate" });
  }
});

// mount auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// mount logs route (protected)
const logsRoutes = require('./routes/logs');
app.use('/api/logs', logsRoutes);

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Health check for DB
app.get('/health/db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    let pingOk = false;
    try {
      await mongoose.connection.db.admin().ping();
      pingOk = true;
    } catch (err) {
      pingOk = false;
    }
    res.json({ state: states[state] || state, ping: pingOk });
  } catch (err) {
    res.status(500).json({ state: 'error', error: err.message });
  }
});

// root -> serve landing page (only needed for local development)
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'landing-page.html'));
});

app.get('/index.html', (req, res) => res.redirect('/'));
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// Listen on PORT from environment or default to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
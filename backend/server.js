require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
}));

// Serve frontend static files but don't auto-serve index.html so we control the root
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath, { index: false }));


// Connect to MongoDB with basic error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/platedb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
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
      req.params.id,      // plate ID from URL
      req.body,           // new data
      { new: true }       // return updated document
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

// root -> serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'landing-page.html'));
});

const PORT = 5000;

// Ensure explicit routes; redirect index to landing page to avoid it popping up
app.get('/index.html', (req, res) => res.redirect('/'));
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
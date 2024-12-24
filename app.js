// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Initialize app and middleware
const app = express();
app.use(express.json());

// Connect to MongoDB
const mongoURI = 'mongodb://localhost:27017/matterDB';
mongoose.connect(mongoURI);

// Define Matter schema and model
const matterSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  state: { type: String, enum: ['gaseous', 'liquid', 'solid'], default: 'gaseous' },
  stateHistory: [{ state: String, updatedAt: Date }],
  createdAt: { type: Date, default: Date.now }
});

// Middleware to track state changes
matterSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('state')) {
    this.stateHistory.push({ state: this.state, updatedAt: new Date() });
  }
  next();
});

const Matter = mongoose.model('Matter', matterSchema);

// File for solid matters
const solidMattersFile = path.join(__dirname, 'solidMatters.json');

// Helper function to load solid matters from file
function loadSolidMatters() {
  if (fs.existsSync(solidMattersFile)) {
    const data = fs.readFileSync(solidMattersFile, 'utf-8');
    if (data.trim() === "") {
      return []; // If the file is empty, return an empty array
    }
    try {
      return JSON.parse(data);
    } catch (err) {
      console.error("Error parsing JSON from solidMattersFile:", err.message);
      return []; // Fallback to an empty array
    }
  }
  return [];
}

// Helper function to save solid matters to file
function saveSolidMatters(matters) {
  fs.writeFileSync(solidMattersFile, JSON.stringify(matters, null, 2));
}

// On server start, load solid matters and clean up database
async function initializeServer() {
  const solidMatters = loadSolidMatters();

  // Clear all non-solid matters from the database
  await Matter.deleteMany({ state: { $ne: 'solid' } });

  // Add solid matters back to the database if not already present
  for (const matter of solidMatters) {
    const existing = await Matter.findOne({ id: matter.id });
    if (!existing) {
      await Matter.create(matter);
    }
  }
}

initializeServer();

// Routes

// Create a new matter
app.post('/matter', async (req, res) => {
  const { id, name } = req.body;
  try {
    const matter = new Matter({ id, name });
    await matter.save();
    res.status(201).json(matter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update matter state
app.put('/matter/:id', async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  try {
    const matter = await Matter.findOne({ id });
    if (!matter) return res.status(404).json({ error: 'Matter not found' });

    if (matter.state === 'solid') {
      return res.status(400).json({ error: 'Cannot update state of a solid matter' });
    }

    matter.state = state;
    await matter.save();

    // If state becomes solid, write to the flag file
    if (state === 'solid') {
      const solidMatters = loadSolidMatters();
      solidMatters.push(matter.toObject()); // Convert to plain JavaScript object
      saveSolidMatters(solidMatters);
    }

    res.json(matter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a matter
app.delete('/matter/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const matter = await Matter.findOne({ id });
    if (!matter) return res.status(404).json({ error: 'Matter not found' });

    if (matter.state === 'solid') {
      return res.status(400).json({ error: 'Cannot delete a solid matter' });
    }

    await Matter.deleteOne({ id });
    res.json({ message: 'Matter deleted', matter });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all matters (with optional state filter)
app.get('/matters', async (req, res) => {
  const { state } = req.query;
  try {
    const filter = state ? { state } : {};
    const matters = await Matter.find(filter);
    res.json(matters);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get counts of matters by state and total
app.get('/matters/counts', async (req, res) => {
  try {
    const total = await Matter.countDocuments();
    const states = await Matter.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } }
    ]);
    res.json({ total, states });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a specific matter and its state
app.get('/matter/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const matter = await Matter.findOne({ id });
    if (!matter) return res.status(404).json({ error: 'Matter not found' });
    res.json(matter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get state transition history of a matter
app.get('/matter/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const matter = await Matter.findOne({ id });
    if (!matter) return res.status(404).json({ error: 'Matter not found' });
    res.json({ id: matter.id, name: matter.name, stateHistory: matter.stateHistory });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));


// Define a User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  qualification: String,
  email: String,
  mobile: String,
  course: String,
});

const User = mongoose.model('User', userSchema);

// POST route to handle registration
app.post('/register', async (req, res) => {
  const userData = req.body;

  try {
    const newUser = new User(userData);
    await newUser.save();
    res.status(201).json({ success: true, message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ success: false, message: 'Error registering user' });
  }
});

// Define PayAfterPlacement Schema
const payAfterPlacementSchema = new mongoose.Schema({
  fullName: String,
  mobile: String,
});

const PayAfterPlacement = mongoose.model('PayAfterPlacement', payAfterPlacementSchema);


// POST route to handle Pay After Placement submissions
app.post('/payafterplacement', async (req, res) => {
  const { fullName, mobile } = req.body;

  try {
    const newPayAfterPlacement = new PayAfterPlacement({ fullName, mobile });
    await newPayAfterPlacement.save();
    res.status(201).json({ success: true, message: 'Details stored successfully!' });
  } catch (error) {
    console.error('Error saving Pay After Placement details:', error);
    res.status(500).json({ success: false, message: 'Error storing details' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

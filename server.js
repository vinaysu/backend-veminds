const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PhonePe Configurations
const MERCHANT_KEY = "f5d4028a-34a1-4782-9878-69fa797f9053";  // Original Salt Key
const MERCHANT_ID = "VEMONLINE";  // Original Merchant ID

const MERCHANT_BASE_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";  // Production URL
const MERCHANT_STATUS_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status";  // Status URL

// Redirect URLs
const redirectUrl = "https://veminds.com/status";  // Updated to match onboarding URL
const successUrl = "https://veminds.com/payment-success";  // Success page
const failureUrl = "https://veminds.com/payment-failure";  // Failure page

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
})
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  qualification: String,
  email: String,
  mobile: String,
  course: String,
});

const User = mongoose.model('User', userSchema);

// Payment route
app.post('/order', async (req, res) => {
  const { name, mobileNumber, amount } = req.body;
  const orderId = uuidv4();  // Generate a unique order ID

  const paymentPayload = {
    merchantId: MERCHANT_ID,
    merchantUserId: name,
    mobileNumber: mobileNumber,
    amount: amount * 100,  // Convert to smallest currency unit (paise)
    merchantTransactionId: orderId,
    redirectUrl: `${redirectUrl}?id=${orderId}`,
    redirectMode: 'POST',
    paymentInstrument: {
      type: 'PAY_PAGE',
    },
  };

  const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  const keyIndex = 1;
  const string = payload + '/pg/v1/pay' + MERCHANT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###' + keyIndex;

  const option = {
    method: 'POST',
    url: MERCHANT_BASE_URL,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
    },
    data: {
      request: payload,
    },
  };

  try {
    const response = await axios.request(option);
    console.log(response.data.data.instrumentResponse.redirectInfo.url);
    res.status(200).json({ msg: "OK", url: response.data.data.instrumentResponse.redirectInfo.url });
  } catch (error) {
    console.error("Error in payment:", error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }

});

// Status check route
app.post('/status', async (req, res) => {
  const merchantTransactionId = req.query.id;

  const keyIndex = 1;
  const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###' + keyIndex;

  const option = {
    method: 'GET',
    url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': MERCHANT_ID,
    },
  };

  try {
    const response = await axios.request(option);
    if (response.data.success) {
      return res.redirect(successUrl);
    } else {
      return res.redirect(failureUrl);
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Registration route
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

// Pay After Placement Schema and route
const payAfterPlacementSchema = new mongoose.Schema({
  fullName: String,
  mobile: String,
});

const PayAfterPlacement = mongoose.model('PayAfterPlacement', payAfterPlacementSchema);

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

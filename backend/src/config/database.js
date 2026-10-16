const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured. Add a valid MongoDB connection string to backend/.env.');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    if (error.codeName === 'AtlasError' && error.code === 8000) {
      throw new Error('MongoDB authentication failed. Check the Atlas database username and password in backend/.env.');
    }

    throw error;
  }
};


module.exports = connectDB;
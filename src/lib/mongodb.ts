import mongoose from 'mongoose';

// Use MongoDB Atlas if MONGODB_URI is provided, otherwise try local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortdash';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    // Fast timeout options for quick failure
    const options = {
      serverSelectionTimeoutMS: 2000, // 2 seconds (was 5)
      socketTimeoutMS: 5000, // 5 seconds (was 45)
      connectTimeoutMS: 2000, // 2 seconds
      maxPoolSize: 1, // Minimal pool size
    };

    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log('MongoDB connected successfully to database: mortdash');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // If local MongoDB fails, suggest using MongoDB Atlas
    if (MONGODB_URI.includes('localhost')) {
      console.error('❌ Local MongoDB is not running. Please either:');
      console.error('1. Start MongoDB locally: brew services start mongodb-community');
      console.error('2. Or use MongoDB Atlas by setting MONGODB_URI in .env.local');
      console.error('   Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mortdash');
    }
    
    throw error;
  }
}

export default connectDB; 
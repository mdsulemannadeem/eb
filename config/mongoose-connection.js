const mongoose = require('mongoose');
const dbgr = require('debug')('app:mongoose');

// Use environment variables with fallback to config module
let mongoURI;

try {
  // First attempt to get from environment variables
  mongoURI = process.env.MONGODB_URI;

  // If not in env, try to get from config (for local development)
  if (!mongoURI) {
    const config = require('config');
    mongoURI = config.get('MONGODB_URI');
  }
  
  // Check if value needs to be parsed
  if (mongoURI && mongoURI.startsWith('MONGO_URI=')) {
    mongoURI = mongoURI.replace('MONGO_URI=', '');
  }

  if (!mongoURI) {
    throw new Error('MongoDB connection string not found');
  }
  
  // Append TLS parameters to URI if they don't already exist
  if (!mongoURI.includes('tls=') && !mongoURI.includes('ssl=')) {
    const separator = mongoURI.includes('?') ? '&' : '?';
    mongoURI += `${separator}tls=true`;
  }
  
} catch (err) {
  console.error('Failed to load MongoDB URI:', err.message);
  mongoURI = null;
}

// Updated connection options - removed deprecated options
const connectionOptions = {
  // Only include SSL options without the deprecated options
  ssl: true,
  tlsAllowInvalidHostnames: false
};

// Only attempt connection if we have a URI
if (mongoURI) {
  // Use mongoose.connect with updated options
  mongoose.connect(mongoURI, connectionOptions)
    .then(() => {
      dbgr('MongoDB connected successfully!');
      console.log('MongoDB connection established successfully');
    })
    .catch(err => {
      dbgr('MongoDB connection error:', err);
      console.error('MongoDB connection error:', err.message);
      
      // If the error is related to TLS, suggest running Node with environment variable
      if (err.message.includes('SSL') || err.message.includes('TLS')) {
        console.error('\n---------------------------------------------');
        console.error('TLS CONNECTION ERROR DETECTED!');
        console.error('Try ONE of these methods:');
        console.error('1. Run with this command:');
        console.error('   set NODE_OPTIONS=--tls-min-v1.0 && node app.js');
        console.error('2. Try connection string direct format:');
        console.error('   mongodb://username:password@host1:port,host2:port,host3:port/database?ssl=true&authSource=admin');
        console.error('---------------------------------------------\n');
      }
    });
} else {
  console.error('MongoDB connection skipped due to missing URI');
}

// Connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

module.exports = mongoose.connection;
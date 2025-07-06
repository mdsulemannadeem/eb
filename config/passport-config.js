const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/user-model');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Check if Google OAuth credentials are available
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (clientId && clientSecret && clientId.trim() && clientSecret.trim()) {
  console.log('Google OAuth credentials found, configuring strategy...');
  
  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: clientId.trim(),
    clientSecret: clientSecret.trim(),
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth callback triggered for user:', profile.displayName);
      
      // Check if user already exists with this Google ID
      let existingUser = await userModel.findOne({ googleId: profile.id });
      
      if (existingUser) {
        console.log('Found existing Google user:', existingUser.email);
        return done(null, existingUser);
      }
      
      // Check if user exists with the same email
      existingUser = await userModel.findOne({ email: profile.emails[0].value });
      
      if (existingUser) {
        console.log('Linking Google account to existing user:', existingUser.email);
        // Link Google account to existing user
        existingUser.googleId = profile.id;
        existingUser.profilePicture = profile.photos[0].value;
        existingUser.isGoogleUser = true;
        await existingUser.save();
        return done(null, existingUser);
      }
      
      console.log('Creating new Google user:', profile.emails[0].value);
      // Create new user
      const newUser = new userModel({
        googleId: profile.id,
        fullname: profile.displayName,
        email: profile.emails[0].value,
        profilePicture: profile.photos[0].value,
        contact: '',
        isGoogleUser: true,
        address: {
          fullName: profile.displayName,
          mobile: '',
          pincode: '',
          locality: '',
          address: '',
          city: '',
          state: '',
          landmark: '',
          alternatePhone: '',
          addressType: 'Home'
        }
      });
      
      const savedUser = await newUser.save();
      console.log('New Google user created successfully:', savedUser.email);
      done(null, savedUser);
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      done(error, null);
    }
  }));
} else {
  console.log('Google OAuth credentials not found. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file');
}

// Note: We don't export passport since it's a global module
// This file is imported for its side effects (configuring passport)

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../users/user.Model');

/**
 * Configure Passport.js for Google OAuth 2.0 authentication
 */
const configurePassport = () => {
  /**
   * Serialize user for session storage
   * Only store user ID in session
   */
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  /**
   * Deserialize user from session
   * Retrieve full user object from database using stored ID
   */
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  /**
   * Google OAuth Strategy Configuration
   */
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user information from Google profile
          const { id, emails, displayName, name, photos } = profile;

          // Check if user already exists in database
          let user = await User.findOne({ googleId: id });

          if (user) {
            // Update existing user's last login
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
          }

          // Check if user exists with same email (from different provider)
          const emailAddress = emails && emails[0] ? emails[0].value : null;
          if (emailAddress) {
            user = await User.findOne({ email: emailAddress });
            
            if (user) {
              // Link Google account to existing user
              user.googleId = id;
              user.provider = 'google';
              user.profilePicture = photos && photos[0] ? photos[0].value : user.profilePicture;
              user.lastLogin = new Date();
              await user.save();
              return done(null, user);
            }
          }

          // Create new user if doesn't exist
          const newUser = new User({
            googleId: id,
            email: emailAddress,
            displayName: displayName,
            firstName: name?.givenName || '',
            lastName: name?.familyName || '',
            profilePicture: photos && photos[0] ? photos[0].value : '',
            provider: 'google',
            role: 'staff', // Default role
            status: 'pending',
            lastLogin: new Date(),
          });

          await newUser.save();
          done(null, newUser);
        } catch (error) {
          console.error('Google OAuth Error:', error);
          done(error, null);
        }
      }
    )
  );
};

module.exports = configurePassport;

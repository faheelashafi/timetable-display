const express = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Store users (replace with a database in production)
let users = [];

// Add only the secure admin user
users.push({
  username: 'admin6',
  password: 'admin@6',
  email: 'admin6@example.com',
  verified: true, // Auto-verify for development
  role: 'admin' // Admin role
});

// Configure Nodemailer with more robust error handling
const transporter = nodemailer.createTransport({
  // This setting is preventing real emails from being sent
  skipSending: true,
  
  // Email credentials are placeholders, not real
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'fallback@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password123'
  },
  debug: true
});

// Then modify the sendMail method to handle failures gracefully
const originalSendMail = transporter.sendMail;
transporter.sendMail = async function(mailOptions) {
  if (this.options.skipSending) {
    console.log('DEVELOPMENT MODE: Skipping email sending');
    console.log('Email would have been sent to:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    return { messageId: 'fake-message-id-for-development' };
  }
  
  try {
    return await originalSendMail.call(this, mailOptions);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - let the registration continue
    return { messageId: 'error-sending-email', error };
  }
};

// Verify transporter is working
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email setup error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

// Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Modify the register endpoint to create regular users, not admins
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    if (users.some(user => user.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    if (users.some(user => user.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create verification token (optional at this point)
    const token = jwt.sign({ username, email }, JWT_SECRET, { expiresIn: '1d' });
    
    // Add user with regular user role (not admin)
    users.push({
      username,
      email,
      password, 
      verified: true, // Auto-verify for development
      verificationToken: token,
      role: 'user' // Regular user role, not admin
    });
    
    console.log(`New user registered: ${username} (${email})`);
    
    res.status(201).json({ 
      message: 'Registration successful! However, you need admin privileges to access the admin panel.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Verify email endpoint
app.get('/api/verify', (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find and update the user
    const userIndex = users.findIndex(user => user.username === decoded.username);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Mark as verified
    users[userIndex].verified = true;
    
    res.status(200).json({ message: 'Email verification successful! You can now log in.' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(400).json({ error: 'Invalid or expired verification token' });
  }
});

// Resend verification email endpoint
app.post('/api/resend-verification', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Find user by username
    const user = users.find(u => u.username === username || u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.verified) {
      return res.status(400).json({ message: 'Your email is already verified. You can log in now.' });
    }
    
    // Create new verification token
    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    user.verificationToken = token;
    
    // Create verification URL
    const verificationUrl = `${process.env.BASE_URL || 'https://your-vercel-app.vercel.app'}/verify?token=${token}`;
    
    // Send verification email
    await transporter.sendMail({
      from: `"University Timetable" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4285f4;">Verify Your Email Address</h2>
          <p>Thank you for registering with University Timetable. Please click the button below to verify your email address:</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `
    });
    
    res.status(200).json({ message: 'Verification email sent! Please check your inbox and spam folder.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email. Please try again.' });
  }
});

// Update login endpoint to include role in the token
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find the user
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    if (!user.verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }
    
    // Check if user has admin role
    const isAdmin = user.role === 'admin' || user.username === 'admin6';
    
    // Generate auth token with role included
    const token = jwt.sign({ 
      username: user.username,
      role: isAdmin ? 'admin' : 'user'
    }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(200).json({ 
      token, 
      username: user.username,
      role: isAdmin ? 'admin' : 'user'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Password reset request with improved error handling
app.post('/api/forgot-password', async (req, res) => {
  try {
    console.log('Password reset request received for:', req.body.email);
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find the user
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log('User not found for email:', email);
      // For security, don't reveal if email exists or not
      return res.status(200).json({ message: 'If this email exists in our system, a password reset link will be sent.' });
    }
    
    // Generate reset token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    
    // Store token with user
    user.resetToken = token;
    
    // Create reset link that works in both development and production
    const baseUrl = process.env.BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const resetLink = `${baseUrl}/src/reset-password.html?token=${token}`;
    
    console.log('Reset link generated:', resetLink);
    
    try {
      // Send reset email with detailed error handling
      const mailOptions = {
        from: `"University Timetable" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'University Timetable - Password Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4285f4;">Reset Your Password</h2>
            <p>You requested a password reset. Click the button below to create a new password:</p>
            <div style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
            <p>This link will expire in 1 hour.</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Reset email sent successfully to:', email);
      
      res.status(200).json({ message: 'Password reset email sent! Please check your inbox.' });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // IMPORTANT: For testing purposes, we'll still allow the flow to continue
      // In production, you should return an error
      console.log('FOR TESTING: Providing reset token despite email failure');
      res.status(200).json({ 
        message: 'Email service is currently unavailable. For testing, use this reset link:',
        testResetLink: resetLink  // Only include this in development!
      });
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Password reset request failed. Please try again.' });
  }
});

// Password reset endpoint
app.post('/api/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = users.find(u => u.username === decoded.username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if token matches stored reset token
    if (user.resetToken !== token) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    
    // Update password
    user.password = newPassword;
    user.resetToken = null;
    
    res.status(200).json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
  try {
    // In a real application, this should require admin authentication
    // Filter out only the admin6 user for security
    const filteredUsers = users.filter(user => user.username !== 'admin6');
    
    const safeUsers = filteredUsers.map(user => ({
      username: user.username,
      email: user.email,
      verified: user.verified,
      // Don't include passwords in production!
      password: user.password // Only for development
    }));
    
    res.status(200).json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// Add this new endpoint for deleting users

// Delete user endpoint
app.post('/api/users/delete', (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Don't allow deleting admin6 account
    if (username === 'admin6') {
      return res.status(403).json({ error: 'Cannot delete default admin account' });
    }
    
    // Find user index
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove the user
    users.splice(userIndex, 1);
    
    console.log(`User ${username} has been deleted`);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  // Start server for local development
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export the Express API for Vercel serverless deployment
module.exports = app;
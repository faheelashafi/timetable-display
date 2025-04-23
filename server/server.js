const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const nodemailer = require('nodemailer');

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

// Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Simplified registration endpoint without email verification
app.post('/api/register', (req, res) => {
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
    
    // Add user with admin role and auto-verify
    users.push({
      username,
      email,
      password, 
      verified: true,
      role: 'admin'
    });
    
    console.log(`New user registered: ${username} (${email}) with admin privileges`);
    
    res.status(201).json({ 
      message: 'Registration successful! You can now log in with your credentials.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});


// Update login endpoint to grant admin access to all verified users
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
    
    // All verified users get admin privileges
    // Generate auth token with admin role
    const token = jwt.sign({ 
      username: user.username,
      role: 'admin' // Grant admin role to all verified users
    }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(200).json({ 
      token, 
      username: user.username,
      role: 'admin' // Return admin role for all verified users
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Simplified password reset request
app.post('/api/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find the user
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({ 
        message: 'If this email exists in our system, a password reset link will be sent.'
      });
    }
    
    // Generate reset token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    
    // Store token with user
    user.resetToken = token;
    
    // Create reset link
    const resetLink = `/src/reset-password.html?token=${token}`;
    
    console.log('Reset link generated for development:', resetLink);
    
    // Return the token directly since we're not emailing
    res.status(200).json({ 
      message: 'For development purposes, use this reset link:',
      resetLink: resetLink
    });
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
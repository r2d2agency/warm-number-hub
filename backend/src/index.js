require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const instancesRoutes = require('./routes/instances');
const messagesRoutes = require('./routes/messages');
const clientNumbersRoutes = require('./routes/clientNumbers');
const configRoutes = require('./routes/config');
const warmingRoutes = require('./routes/warming');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Admin routes (tem seu próprio middleware de autenticação)
app.use('/api/admin', adminRoutes);

// Protected routes
app.use('/api/instances', authenticateToken, instancesRoutes);
app.use('/api/messages', authenticateToken, messagesRoutes);
app.use('/api/client-numbers', authenticateToken, clientNumbersRoutes);
app.use('/api/config', authenticateToken, configRoutes);
app.use('/api/warming-number', authenticateToken, warmingRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

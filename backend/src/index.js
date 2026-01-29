require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const instancesRoutes = require('./routes/instances');
const messagesRoutes = require('./routes/messages');
const clientNumbersRoutes = require('./routes/clientNumbers');
const configRoutes = require('./routes/config');
const warmingRoutes = require('./routes/warming');
const brandingRoutes = require('./routes/branding');
const uploadRoutes = require('./routes/upload');
 const { runMigrations } = require('./migrationsRunner');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/branding', brandingRoutes);

// Admin routes (tem seu próprio middleware de autenticação)
app.use('/api/admin', adminRoutes);

// Protected routes
app.use('/api/instances', authenticateToken, instancesRoutes);
app.use('/api/messages', authenticateToken, messagesRoutes);
app.use('/api/client-numbers', authenticateToken, clientNumbersRoutes);
app.use('/api/config', authenticateToken, configRoutes);
app.use('/api/warming-number', authenticateToken, warmingRoutes);
app.use('/api/upload', uploadRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});


 async function start() {
   try {
     await runMigrations();
   } catch (error) {
     console.error('Database migrations failed:', error);
     process.exit(1);
   }

   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
 }

 start();

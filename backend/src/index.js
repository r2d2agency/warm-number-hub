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
const webhookRoutes = require('./routes/webhook');
const { runMigrations } = require('./migrationsRunner');
const { authenticateToken } = require('./middleware/auth');
const warmingService = require('./services/warmingService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Permite qualquer origem (ou especifique: ['https://blaster.r2d2.agency'])
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
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
app.use('/api/webhook', webhookRoutes); // Webhook for Evolution API (no auth required)

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
     
     // Restore active warming sessions after a short delay
     setTimeout(async () => {
       try {
         await warmingService.restoreActiveSessions();
         console.log('Warming sessions restoration complete');
       } catch (error) {
         console.error('Error restoring warming sessions:', error);
       }
     }, 3000);
   });
 }

 start();

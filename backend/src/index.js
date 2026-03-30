require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const messagesRoutes = require('./routes/messages');
const scannerRoutes = require('./routes/scanner');
const clientsRoutes = require('./routes/clients');
const templatesRoutes = require('./routes/templates');
const { startScanner } = require('./services/scanner');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/templates', templatesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`IntentHunt backend running on port ${PORT}`);
  startScanner();
  console.log('Scanner service started');
});

module.exports = app;

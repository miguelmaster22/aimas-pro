/**
 * Enhanced API Server with Tiered Access Control
 * Integrates authentication, tier management, and database services
 */

// Core dependencies
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require("dotenv").config();

// Import services
const AuthService = require('./services/authService');
const ContractService = require('./services/contractService');
const TierService = require('./services/tierService');
const DatabaseService = require('./services/databaseService');

// Import routes and middleware
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/authMiddleware');

// Initialize services
const contractService = new ContractService();
const tierService = new TierService();
const databaseService = new DatabaseService();
const authService = new AuthService(contractService, tierService);

// Express app setup
const app = express();

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://beta.aimas.pro',
      'https://aimas.pro',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware setup
app.use(globalLimiter);
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

const port = process.env.PORT || "8000";
const RUTA = "/api/v1/";

// Health check endpoints
app.get("/", (req, res) => {
  res.json({
    service: "AIMAS PRO Tiered Access API",
    version: "2.0.0",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    // Check all service health
    const [contractHealth, dbHealth] = await Promise.all([
      contractService.healthCheck(),
      databaseService.getConnectionStatus()
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        contract: contractHealth,
        database: dbHealth,
        authentication: {
          status: 'healthy',
          activeSessions: authService.getActiveSessionsCount()
        }
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API status endpoint
app.get(RUTA, (req, res) => {
  res.json({ 
    online: true,
    version: "2.0.0",
    features: [
      "Tiered Access Control",
      "Wallet Authentication",
      "Real-time Investment Verification",
      "Multi-Database Support",
      "Role-based Permissions"
    ]
  });
});

// Authentication routes
app.use(RUTA + 'auth', authRoutes);

// Tier management routes
app.get(RUTA + 'tiers/configs', 
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['system_administration', 'all_permissions']),
  async (req, res) => {
    try {
      const configs = await tierService.getAllTierConfigs();
      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

app.get(RUTA + 'tiers/statistics',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['advanced_analytics', 'system_administration']),
  async (req, res) => {
    try {
      const stats = await tierService.getTierStatistics();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Database access routes
app.post(RUTA + 'database/query',
  authMiddleware.verifyToken,
  authMiddleware.validateDatabaseAccess,
  authMiddleware.requirePermission(['basic_operations']),
  async (req, res) => {
    try {
      const { collection, operation, query, options } = req.body;
      const dbEndpoint = req.user.dbEndpoint;

      const result = await databaseService.executeQuery(
        dbEndpoint,
        collection,
        operation,
        query,
        options
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

app.get(RUTA + 'database/collections',
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const dbEndpoint = req.user.dbEndpoint;
      const collections = databaseService.getAvailableCollections(dbEndpoint);

      res.json({
        success: true,
        data: collections
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

app.get(RUTA + 'database/stats',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['advanced_analytics', 'system_administration']),
  async (req, res) => {
    try {
      const dbEndpoint = req.user.dbEndpoint;
      const stats = await databaseService.getDatabaseStats(dbEndpoint);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Investment and contract routes
app.get(RUTA + 'investments/basic',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['view_investments']),
  authMiddleware.requireWalletOwnership,
  async (req, res) => {
    try {
      const wallet = req.user.wallet;
      const investorData = await contractService.getInvestorData(wallet);
      const deposits = await contractService.getUserDeposits(wallet);

      res.json({
        success: true,
        data: {
          investor: investorData,
          deposits: deposits
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

app.get(RUTA + 'referrals/basic',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['view_referrals']),
  async (req, res) => {
    try {
      // This would need to be implemented based on your referral system
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

app.get(RUTA + 'stats/basic',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['view_basic']),
  async (req, res) => {
    try {
      const wallet = req.user.wallet;
      const withdrawableAmount = await contractService.getWithdrawableAmount(wallet);

      res.json({
        success: true,
        data: {
          totalEarnings: withdrawableAmount,
          activeDeposits: 1, // This would need proper calculation
          monthlyInvestments: 0,
          monthlyEarnings: 0,
          monthlyReferrals: 0,
          averageROI: 0,
          successRate: 100,
          activeDays: 30,
          referralEarnings: 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Legacy routes compatibility (from original index.js)
app.post(RUTA + "retiro", 
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(['withdrawal_requests']),
  async (req, res) => {
    // Legacy withdrawal endpoint - would need to be updated
    res.json({
      success: false,
      error: "Please use the new tiered withdrawal system"
    });
  }
);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Initialize application
async function initializeApplication() {
  try {
    console.log('🚀 Starting AIMAS PRO Tiered Access API...');

    // Initialize database connections
    await databaseService.initialize();
    console.log('✅ Database connections initialized');

    // Initialize tier service database
    await tierService.initializeDatabase();
    console.log('✅ Tier service initialized');

    // Test contract service
    const contractHealth = await contractService.healthCheck();
    if (contractHealth.status === 'healthy') {
      console.log('✅ Contract service connected');
    } else {
      console.warn('⚠️ Contract service health check failed');
    }

    console.log('✅ All services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    throw error;
  }
}

// Scheduled tasks
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Running scheduled maintenance tasks...');
  
  try {
    // Clean up expired sessions
    authService.cleanupExpiredSessions();
    
    // Perform database health checks
    await databaseService.performHealthCheck();
    
    // Clean up tier history
    await tierService.cleanupTierHistory(90); // Keep 90 days
    
    console.log('✅ Scheduled maintenance completed');
  } catch (error) {
    console.error('❌ Scheduled maintenance failed:', error);
  }
}, {
  scheduled: true,
  timezone: "America/Bogota"
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    await databaseService.closeAllConnections();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    await databaseService.closeAllConnections();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
initializeApplication()
  .then(() => {
    app.listen(port, () => {
      console.log(`🌟 AIMAS PRO Tiered Access API listening on port ${port}`);
      console.log(`📊 API Documentation: http://localhost:${port}${RUTA}`);
      console.log(`🏥 Health Check: http://localhost:${port}/health`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

module.exports = app;
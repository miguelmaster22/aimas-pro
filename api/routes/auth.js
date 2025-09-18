/**
 * Authentication Routes for Tiered Access Control
 * Handles wallet connection, verification, and session management
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const ContractService = require('../services/contractService');
const TierService = require('../services/tierService');

const router = express.Router();

// Initialize services
const contractService = new ContractService();
const tierService = new TierService();
const authService = new AuthService(contractService, tierService);

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

const nonceLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 nonce requests per windowMs
  message: {
    error: 'Too many nonce requests, please try again later',
    retryAfter: 5 * 60 // 5 minutes in seconds
  }
});

// Input validation middleware
const validateWalletAddress = [
  body('wallet')
    .isLength({ min: 42, max: 42 })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
];

const validateSignature = [
  body('signature')
    .isLength({ min: 130, max: 132 })
    .matches(/^0x[a-fA-F0-9]{128,130}$/)
    .withMessage('Invalid signature format'),
];

const validateNonce = [
  body('nonce')
    .isLength({ min: 64, max: 64 })
    .matches(/^[a-fA-F0-9]{64}$/)
    .withMessage('Invalid nonce format'),
];

/**
 * POST /api/auth/request-nonce
 * Request a nonce for wallet verification
 */
router.post('/request-nonce', 
  nonceLimit,
  validateWalletAddress,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { wallet } = req.body;
      
      // Generate nonce
      const nonce = authService.generateNonce(wallet);
      
      // Create verification message
      const message = authService.createVerificationMessage(wallet, nonce);

      res.json({
        success: true,
        nonce,
        message,
        expiresIn: 300 // 5 minutes
      });

    } catch (error) {
      console.error('Nonce generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate nonce'
      });
    }
  }
);

/**
 * POST /api/auth/verify-wallet
 * Verify wallet ownership and authenticate user
 */
router.post('/verify-wallet',
  authLimiter,
  [
    ...validateWalletAddress,
    ...validateSignature,
    ...validateNonce
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { wallet, signature, nonce } = req.body;

      // Authenticate user
      const authResult = await authService.authenticate(wallet, signature, nonce);

      if (!authResult.success) {
        return res.status(401).json(authResult);
      }

      // Update user tier in database
      await tierService.updateUserTier(wallet, authResult.investment, 'Authentication login');

      res.json({
        success: true,
        token: authResult.token,
        user: {
          wallet: authResult.wallet,
          tier: authResult.tier,
          investment: authResult.investment,
          permissions: authResult.permissions,
          adminPanelUrl: authResult.adminPanelUrl,
          dbEndpoint: authResult.dbEndpoint
        },
        expiresIn: 24 * 60 * 60 // 24 hours in seconds
      });

    } catch (error) {
      console.error('Wallet verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }
);

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token
 */
router.post('/refresh-token',
  authLimiter,
  [
    body('token')
      .notEmpty()
      .withMessage('Token is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token } = req.body;

      // Refresh token
      const newToken = await authService.refreshToken(token);

      if (!newToken) {
        return res.status(401).json({
          success: false,
          error: 'Token refresh failed'
        });
      }

      // Get session info for the new token
      const sessionInfo = authService.getSessionInfo(newToken);

      res.json({
        success: true,
        token: newToken,
        user: sessionInfo,
        expiresIn: 24 * 60 * 60 // 24 hours in seconds
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  }
);

/**
 * GET /api/auth/session
 * Get current session information
 */
router.get('/session',
  async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const sessionInfo = authService.getSessionInfo(token);

      if (!sessionInfo) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      res.json({
        success: true,
        user: sessionInfo
      });

    } catch (error) {
      console.error('Session info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session info'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout',
  validateWalletAddress,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { wallet } = req.body;

      // Logout user
      const success = authService.logout(wallet);

      res.json({
        success,
        message: success ? 'Logged out successfully' : 'Logout failed'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }
);

/**
 * GET /api/auth/verify-investment
 * Verify current investment amount from blockchain
 */
router.get('/verify-investment/:wallet',
  async (req, res) => {
    try {
      const { wallet } = req.params;

      // Validate wallet address
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid wallet address'
        });
      }

      // Get real-time investment verification
      const verificationResult = await contractService.verifyInvestmentRealTime(wallet);

      res.json({
        success: verificationResult.verified,
        data: verificationResult
      });

    } catch (error) {
      console.error('Investment verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Investment verification failed'
      });
    }
  }
);

/**
 * GET /api/auth/tier-info/:wallet
 * Get tier information for a wallet
 */
router.get('/tier-info/:wallet',
  async (req, res) => {
    try {
      const { wallet } = req.params;

      // Validate wallet address
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid wallet address'
        });
      }

      // Get user tier information
      const userTier = await tierService.getUserTier(wallet);

      if (!userTier) {
        return res.status(404).json({
          success: false,
          error: 'User tier not found'
        });
      }

      // Get upgrade requirements
      const upgradeRequirements = tierService.getUpgradeRequirements(userTier.currentTier);

      res.json({
        success: true,
        data: {
          ...userTier,
          upgradeRequirements
        }
      });

    } catch (error) {
      console.error('Tier info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tier information'
      });
    }
  }
);

/**
 * GET /api/auth/permissions/:wallet/:permission
 * Check if user has specific permission
 */
router.get('/permissions/:wallet/:permission',
  async (req, res) => {
    try {
      const { wallet, permission } = req.params;

      // Validate wallet address
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid wallet address'
        });
      }

      // Check permission
      const hasPermission = await tierService.hasPermission(wallet, permission);

      res.json({
        success: true,
        hasPermission,
        wallet,
        permission
      });

    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  }
);

/**
 * GET /api/auth/stats
 * Get authentication service statistics (admin only)
 */
router.get('/stats',
  async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Check if user has admin permissions
      const hasPermission = authService.hasPermission(token, 'system_administration');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Get statistics
      const activeSessionsCount = authService.getActiveSessionsCount();
      const tierStats = await tierService.getTierStatistics();
      const contractStats = contractService.getCacheStats();

      res.json({
        success: true,
        data: {
          activeSessions: activeSessionsCount,
          tierStatistics: tierStats,
          contractService: contractStats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }
);

// Cleanup expired sessions periodically
setInterval(() => {
  authService.cleanupExpiredSessions();
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = router;
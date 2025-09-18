/**
 * Authentication and Authorization Middleware
 * Handles JWT verification, permission checks, and tier-based access control
 */

const jwt = require('jsonwebtoken');
const AuthService = require('../services/authService');
const TierService = require('../services/tierService');
const ContractService = require('../services/contractService');

class AuthMiddleware {
  constructor() {
    this.contractService = new ContractService();
    this.tierService = new TierService();
    this.authService = new AuthService(this.contractService, this.tierService);
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  }

  /**
   * Verify JWT token middleware
   */
  verifyToken = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'No authorization header provided'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Verify token using auth service
      const decoded = this.authService.verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Add user info to request
      req.user = {
        wallet: decoded.wallet,
        tier: decoded.tier,
        permissions: decoded.permissions,
        investment: decoded.investment,
        dbEndpoint: decoded.dbEndpoint,
        adminPanelUrl: decoded.adminPanelUrl
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Token verification failed'
      });
    }
  };

  /**
   * Check if user has required permission
   * @param {string|Array} requiredPermissions - Required permission(s)
   * @returns {Function} - Middleware function
   */
  requirePermission = (requiredPermissions) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated'
          });
        }

        const userPermissions = req.user.permissions || [];
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

        // Check if user has all_permissions
        if (userPermissions.includes('all_permissions')) {
          return next();
        }

        // Check if user has any of the required permissions
        const hasPermission = permissions.some(permission => 
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            required: permissions,
            current: userPermissions
          });
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        return res.status(500).json({
          success: false,
          error: 'Permission check failed'
        });
      }
    };
  };

  /**
   * Check if user has required tier level
   * @param {string|Array} requiredTiers - Required tier(s)
   * @returns {Function} - Middleware function
   */
  requireTier = (requiredTiers) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated'
          });
        }

        const userTier = req.user.tier;
        const tiers = Array.isArray(requiredTiers) ? requiredTiers : [requiredTiers];

        if (!tiers.includes(userTier)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient tier level',
            required: tiers,
            current: userTier
          });
        }

        next();
      } catch (error) {
        console.error('Tier check error:', error);
        return res.status(500).json({
          success: false,
          error: 'Tier check failed'
        });
      }
    };
  };

  /**
   * Check minimum investment amount
   * @param {number} minInvestment - Minimum investment required
   * @returns {Function} - Middleware function
   */
  requireMinInvestment = (minInvestment) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated'
          });
        }

        const userInvestment = req.user.investment || 0;

        if (userInvestment < minInvestment) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient investment amount',
            required: minInvestment,
            current: userInvestment
          });
        }

        next();
      } catch (error) {
        console.error('Investment check error:', error);
        return res.status(500).json({
          success: false,
          error: 'Investment check failed'
        });
      }
    };
  };

  /**
   * Verify real-time investment and update tier if needed
   */
  verifyRealTimeInvestment = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const wallet = req.user.wallet;

      // Get current investment from blockchain
      const verificationResult = await this.contractService.verifyInvestmentRealTime(wallet);

      if (!verificationResult.verified) {
        return res.status(500).json({
          success: false,
          error: 'Failed to verify investment amount'
        });
      }

      // Check if investment has changed significantly (more than 1% difference)
      const currentInvestment = req.user.investment;
      const newInvestment = verificationResult.totalInvestment;
      const investmentDifference = Math.abs(newInvestment - currentInvestment);
      const percentageDifference = (investmentDifference / Math.max(currentInvestment, 1)) * 100;

      if (percentageDifference > 1) {
        // Update user tier
        await this.tierService.updateUserTier(wallet, newInvestment, 'Real-time investment verification');
        
        // Update request user info
        const newTier = this.tierService.calculateTier(newInvestment);
        req.user.investment = newInvestment;
        req.user.tier = newTier.tierName;
        req.user.permissions = newTier.permissions;
        req.user.dbEndpoint = newTier.dbEndpoint;
        req.user.adminPanelUrl = newTier.adminPanelUrl;
      }

      next();
    } catch (error) {
      console.error('Real-time investment verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Investment verification failed'
      });
    }
  };

  /**
   * Check if user owns the wallet address in the request
   */
  requireWalletOwnership = (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const requestedWallet = req.params.wallet || req.body.wallet;
      const userWallet = req.user.wallet;

      if (!requestedWallet) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address not provided'
        });
      }

      if (requestedWallet.toLowerCase() !== userWallet.toLowerCase()) {
        // Check if user has admin permissions to access other wallets
        if (!req.user.permissions.includes('all_permissions') && 
            !req.user.permissions.includes('user_management')) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: wallet ownership required'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Wallet ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Wallet ownership check failed'
      });
    }
  };

  /**
   * Rate limiting based on user tier
   */
  tierBasedRateLimit = (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const tier = req.user.tier;
      const clientIP = req.ip || req.connection.remoteAddress;
      const key = `rate_limit_${tier}_${clientIP}`;

      // Define rate limits per tier
      const rateLimits = {
        'UNREGISTERED': { requests: 10, window: 60 * 1000 }, // 10 requests per minute
        'BRONZE': { requests: 50, window: 60 * 1000 }, // 50 requests per minute
        'SILVER': { requests: 100, window: 60 * 1000 }, // 100 requests per minute
        'GOLD': { requests: 200, window: 60 * 1000 }, // 200 requests per minute
        'PLATINUM': { requests: 500, window: 60 * 1000 } // 500 requests per minute
      };

      const limit = rateLimits[tier] || rateLimits['UNREGISTERED'];

      // Simple in-memory rate limiting (use Redis in production)
      if (!this.rateLimitStore) {
        this.rateLimitStore = new Map();
      }

      const now = Date.now();
      const windowStart = now - limit.window;

      // Clean old entries
      const userRequests = this.rateLimitStore.get(key) || [];
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);

      if (validRequests.length >= limit.requests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          tier: tier,
          limit: limit.requests,
          window: limit.window / 1000,
          retryAfter: Math.ceil((validRequests[0] + limit.window - now) / 1000)
        });
      }

      // Add current request
      validRequests.push(now);
      this.rateLimitStore.set(key, validRequests);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.requests,
        'X-RateLimit-Remaining': limit.requests - validRequests.length,
        'X-RateLimit-Reset': new Date(now + limit.window).toISOString()
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };

  /**
   * Log user activity for audit purposes
   */
  logActivity = (action) => {
    return (req, res, next) => {
      try {
        if (req.user) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            wallet: req.user.wallet,
            tier: req.user.tier,
            action: action,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method
          };

          // Log to console (implement proper logging service in production)
          console.log('User Activity:', JSON.stringify(logEntry));

          // Add to request for potential database logging
          req.activityLog = logEntry;
        }

        next();
      } catch (error) {
        console.error('Activity logging error:', error);
        next(); // Continue on error
      }
    };
  };

  /**
   * Validate database endpoint access
   */
  validateDatabaseAccess = (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const requestedEndpoint = req.body.dbEndpoint || req.params.dbEndpoint;
      const userEndpoint = req.user.dbEndpoint;

      if (requestedEndpoint && requestedEndpoint !== userEndpoint) {
        // Check if user has admin permissions to access other databases
        if (!req.user.permissions.includes('all_permissions') && 
            !req.user.permissions.includes('system_administration')) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: insufficient database permissions'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Database access validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database access validation failed'
      });
    }
  };

  /**
   * Clean up rate limit store periodically
   */
  cleanupRateLimit = () => {
    if (this.rateLimitStore) {
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      for (const [key, requests] of this.rateLimitStore.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > now - maxAge);
        if (validRequests.length === 0) {
          this.rateLimitStore.delete(key);
        } else {
          this.rateLimitStore.set(key, validRequests);
        }
      }
    }
  };
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Clean up rate limit store every 5 minutes
setInterval(() => {
  authMiddleware.cleanupRateLimit();
}, 5 * 60 * 1000);

module.exports = authMiddleware;
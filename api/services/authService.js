/**
 * Authentication Service for Tiered Access Control
 * Handles wallet verification, signature validation, and session management
 */

const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const crypto = require('crypto');
const BigNumber = require('bignumber.js');

class AuthService {
  constructor(contractService, tierService) {
    this.contractService = contractService;
    this.tierService = tierService;
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.tokenExpiry = process.env.TOKEN_EXPIRY || '24h';
    this.activeSessions = new Map(); // In-memory session store (use Redis in production)
  }

  /**
   * Generate a random nonce for wallet verification
   * @param {string} wallet - Wallet address
   * @returns {string} - Generated nonce
   */
  generateNonce(wallet) {
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // Store nonce with expiration (5 minutes)
    this.activeSessions.set(`nonce_${wallet.toLowerCase()}`, {
      nonce,
      timestamp,
      expires: timestamp + (5 * 60 * 1000) // 5 minutes
    });
    
    return nonce;
  }

  /**
   * Create verification message for wallet signing
   * @param {string} wallet - Wallet address
   * @param {string} nonce - Generated nonce
   * @returns {string} - Message to be signed
   */
  createVerificationMessage(wallet, nonce) {
    return `AIMAS PRO - Verify wallet ownership\n\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  }

  /**
   * Verify wallet ownership through signature verification
   * @param {string} wallet - Wallet address
   * @param {string} signature - Signed message
   * @param {string} nonce - Original nonce
   * @returns {boolean} - Verification result
   */
  async verifyWalletSignature(wallet, signature, nonce) {
    try {
      // Check if nonce exists and is valid
      const nonceData = this.activeSessions.get(`nonce_${wallet.toLowerCase()}`);
      if (!nonceData || nonceData.expires < Date.now()) {
        throw new Error('Invalid or expired nonce');
      }

      if (nonceData.nonce !== nonce) {
        throw new Error('Nonce mismatch');
      }

      // Create the original message
      const message = this.createVerificationMessage(wallet, nonce);
      
      // Verify signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      const isValid = recoveredAddress.toLowerCase() === wallet.toLowerCase();

      if (isValid) {
        // Clean up used nonce
        this.activeSessions.delete(`nonce_${wallet.toLowerCase()}`);
      }

      return isValid;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get investment amount from blockchain
   * @param {string} wallet - Wallet address
   * @returns {Promise<number>} - Investment amount in USDT
   */
  async getInvestmentAmount(wallet) {
    try {
      const investmentData = await this.contractService.getInvestorData(wallet);
      return new BigNumber(investmentData.invested).shiftedBy(-18).toNumber();
    } catch (error) {
      console.error('Error fetching investment amount:', error);
      return 0;
    }
  }

  /**
   * Generate JWT token with tier information
   * @param {string} wallet - Wallet address
   * @param {Object} tierInfo - Tier information
   * @returns {string} - JWT token
   */
  generateToken(wallet, tierInfo) {
    const payload = {
      wallet: wallet.toLowerCase(),
      tier: tierInfo.tierName,
      permissions: tierInfo.permissions,
      dbEndpoint: tierInfo.dbEndpoint,
      adminPanelUrl: tierInfo.adminPanelUrl,
      investment: tierInfo.investment,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = jwt.sign(payload, this.jwtSecret);
    
    // Store session
    this.activeSessions.set(`session_${wallet.toLowerCase()}`, {
      token,
      tierInfo,
      lastActivity: Date.now(),
      expires: payload.exp * 1000
    });

    return token;
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded token or null if invalid
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check if session exists
      const sessionData = this.activeSessions.get(`session_${decoded.wallet}`);
      if (!sessionData || sessionData.token !== token) {
        return null;
      }

      // Update last activity
      sessionData.lastActivity = Date.now();
      
      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Refresh JWT token
   * @param {string} oldToken - Current token
   * @returns {string|null} - New token or null if refresh failed
   */
  async refreshToken(oldToken) {
    try {
      const decoded = this.verifyToken(oldToken);
      if (!decoded) {
        return null;
      }

      // Get current investment and tier
      const investment = await this.getInvestmentAmount(decoded.wallet);
      const tierInfo = this.tierService.calculateTier(investment);
      tierInfo.investment = investment;

      // Generate new token
      return this.generateToken(decoded.wallet, tierInfo);
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Complete authentication process
   * @param {string} wallet - Wallet address
   * @param {string} signature - Signed message
   * @param {string} nonce - Original nonce
   * @returns {Promise<Object>} - Authentication result
   */
  async authenticate(wallet, signature, nonce) {
    try {
      // Verify wallet signature
      const isValidSignature = await this.verifyWalletSignature(wallet, signature, nonce);
      if (!isValidSignature) {
        return {
          success: false,
          error: 'Invalid wallet signature'
        };
      }

      // Get investment amount
      const investment = await this.getInvestmentAmount(wallet);
      
      // Calculate tier
      const tierInfo = this.tierService.calculateTier(investment);
      tierInfo.investment = investment;

      // Generate token
      const token = this.generateToken(wallet, tierInfo);

      return {
        success: true,
        token,
        wallet: wallet.toLowerCase(),
        tier: tierInfo.tierName,
        investment,
        permissions: tierInfo.permissions,
        adminPanelUrl: tierInfo.adminPanelUrl,
        dbEndpoint: tierInfo.dbEndpoint
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Logout user and invalidate session
   * @param {string} wallet - Wallet address
   * @returns {boolean} - Success status
   */
  logout(wallet) {
    try {
      this.activeSessions.delete(`session_${wallet.toLowerCase()}`);
      this.activeSessions.delete(`nonce_${wallet.toLowerCase()}`);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} token - JWT token
   * @param {string} permission - Required permission
   * @returns {boolean} - Permission check result
   */
  hasPermission(token, permission) {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return false;
    }

    return decoded.permissions.includes(permission) || decoded.permissions.includes('all_permissions');
  }

  /**
   * Get current user session info
   * @param {string} token - JWT token
   * @returns {Object|null} - Session info or null
   */
  getSessionInfo(token) {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return null;
    }

    return {
      wallet: decoded.wallet,
      tier: decoded.tier,
      permissions: decoded.permissions,
      investment: decoded.investment,
      adminPanelUrl: decoded.adminPanelUrl,
      dbEndpoint: decoded.dbEndpoint,
      expiresAt: new Date(decoded.exp * 1000)
    };
  }

  /**
   * Clean up expired sessions and nonces
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    
    // Clean up expired nonces
    for (const [key, data] of this.activeSessions.entries()) {
      if (key.startsWith('nonce_') && data.expires < now) {
        this.activeSessions.delete(key);
      }
    }

    // Clean up expired sessions
    for (const [key, data] of this.activeSessions.entries()) {
      if (key.startsWith('session_') && data.expires < now) {
        this.activeSessions.delete(key);
      }
    }
  }

  /**
   * Get active sessions count
   * @returns {number} - Number of active sessions
   */
  getActiveSessionsCount() {
    let count = 0;
    for (const key of this.activeSessions.keys()) {
      if (key.startsWith('session_')) {
        count++;
      }
    }
    return count;
  }
}

module.exports = AuthService;
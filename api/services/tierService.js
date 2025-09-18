/**
 * Tier Service for Investment-Based Access Control
 * Handles tier calculation, permission mapping, and tier management
 */

const mongoose = require('mongoose');

class TierService {
  constructor() {
    this.initializeTierConfigurations();
    this.setupTierSchema();
  }

  /**
   * Initialize default tier configurations
   */
  initializeTierConfigurations() {
    this.defaultTiers = {
      UNREGISTERED: {
        tierName: 'UNREGISTERED',
        minInvestment: 0,
        maxInvestment: 0,
        dbEndpoint: 'public_db',
        adminPanelUrl: '/public',
        permissions: ['view_public'],
        features: ['basic_info'],
        priority: 0,
        isActive: true
      },
      BRONZE: {
        tierName: 'BRONZE',
        minInvestment: 25,
        maxInvestment: 49.99,
        dbEndpoint: 'bronze_db',
        adminPanelUrl: '/admin/bronze',
        permissions: [
          'view_basic',
          'basic_operations',
          'view_investments',
          'view_referrals'
        ],
        features: [
          'basic_dashboard',
          'investment_tracking',
          'referral_system',
          'basic_reports'
        ],
        priority: 1,
        isActive: true
      },
      SILVER: {
        tierName: 'SILVER',
        minInvestment: 50,
        maxInvestment: 999.99,
        dbEndpoint: 'silver_db',
        adminPanelUrl: '/admin/silver',
        permissions: [
          'view_basic',
          'basic_operations',
          'view_investments',
          'view_referrals',
          'advanced_view',
          'binary_network_view',
          'withdrawal_requests'
        ],
        features: [
          'enhanced_dashboard',
          'investment_tracking',
          'referral_system',
          'binary_network',
          'advanced_reports',
          'withdrawal_management',
          'performance_analytics'
        ],
        priority: 2,
        isActive: true
      },
      GOLD: {
        tierName: 'GOLD',
        minInvestment: 1000,
        maxInvestment: 9999.99,
        dbEndpoint: 'gold_db',
        adminPanelUrl: '/admin/gold',
        permissions: [
          'view_basic',
          'basic_operations',
          'view_investments',
          'view_referrals',
          'advanced_view',
          'binary_network_view',
          'withdrawal_requests',
          'gold_features',
          'team_management',
          'advanced_analytics'
        ],
        features: [
          'premium_dashboard',
          'investment_tracking',
          'referral_system',
          'binary_network',
          'team_management',
          'advanced_reports',
          'withdrawal_management',
          'performance_analytics',
          'market_insights',
          'priority_support'
        ],
        priority: 3,
        isActive: true
      },
      PLATINUM: {
        tierName: 'PLATINUM',
        minInvestment: 10000,
        maxInvestment: Infinity,
        dbEndpoint: 'platinum_db',
        adminPanelUrl: '/admin/platinum',
        permissions: [
          'all_permissions',
          'platinum_exclusive',
          'system_administration',
          'user_management',
          'financial_oversight',
          'system_configuration'
        ],
        features: [
          'executive_dashboard',
          'complete_system_access',
          'user_management',
          'financial_oversight',
          'system_configuration',
          'advanced_analytics',
          'custom_reports',
          'api_access',
          'white_label_features',
          'dedicated_support'
        ],
        priority: 4,
        isActive: true
      }
    };
  }

  /**
   * Setup MongoDB schema for tier configurations
   */
  setupTierSchema() {
    const tierConfigSchema = new mongoose.Schema({
      tierName: { type: String, required: true, unique: true },
      minInvestment: { type: Number, required: true },
      maxInvestment: { type: Number, required: true },
      dbEndpoint: { type: String, required: true },
      adminPanelUrl: { type: String, required: true },
      permissions: [{ type: String }],
      features: [{ type: String }],
      priority: { type: Number, required: true },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const userTierSchema = new mongoose.Schema({
      wallet: { type: String, required: true, unique: true },
      currentTier: { type: String, required: true },
      totalInvestment: { type: Number, required: true },
      tierHistory: [{
        tier: String,
        timestamp: { type: Date, default: Date.now },
        investment: Number,
        reason: String
      }],
      lastVerified: { type: Date, default: Date.now },
      permissions: [{ type: String }],
      features: [{ type: String }],
      adminPanelUrl: { type: String },
      dbEndpoint: { type: String },
      isActive: { type: Boolean, default: true }
    });

    this.TierConfig = mongoose.model('TierConfig', tierConfigSchema);
    this.UserTier = mongoose.model('UserTier', userTierSchema);
  }

  /**
   * Initialize tier configurations in database
   */
  async initializeDatabase() {
    try {
      // Check if tiers already exist
      const existingTiers = await this.TierConfig.find({});
      
      if (existingTiers.length === 0) {
        // Insert default tier configurations
        const tierConfigs = Object.values(this.defaultTiers);
        await this.TierConfig.insertMany(tierConfigs);
        console.log('Default tier configurations initialized');
      }
    } catch (error) {
      console.error('Error initializing tier database:', error);
    }
  }

  /**
   * Calculate tier based on investment amount
   * @param {number} investment - Investment amount in USDT
   * @returns {Object} - Tier information
   */
  calculateTier(investment) {
    // Handle unregistered users
    if (investment === 0) {
      return { ...this.defaultTiers.UNREGISTERED };
    }

    // Find appropriate tier based on investment amount
    const tiers = Object.values(this.defaultTiers)
      .filter(tier => tier.isActive && tier.tierName !== 'UNREGISTERED')
      .sort((a, b) => a.priority - b.priority);

    for (const tier of tiers) {
      if (investment >= tier.minInvestment && investment <= tier.maxInvestment) {
        return { ...tier };
      }
    }

    // Default to highest tier if investment exceeds all limits
    return { ...this.defaultTiers.PLATINUM };
  }

  /**
   * Get tier configuration from database
   * @param {string} tierName - Tier name
   * @returns {Promise<Object>} - Tier configuration
   */
  async getTierConfig(tierName) {
    try {
      const config = await this.TierConfig.findOne({ 
        tierName: tierName.toUpperCase(),
        isActive: true 
      });
      return config ? config.toObject() : null;
    } catch (error) {
      console.error('Error fetching tier config:', error);
      return null;
    }
  }

  /**
   * Get all active tier configurations
   * @returns {Promise<Array>} - Array of tier configurations
   */
  async getAllTierConfigs() {
    try {
      const configs = await this.TierConfig.find({ isActive: true })
        .sort({ priority: 1 });
      return configs.map(config => config.toObject());
    } catch (error) {
      console.error('Error fetching all tier configs:', error);
      return [];
    }
  }

  /**
   * Update user tier information
   * @param {string} wallet - Wallet address
   * @param {number} investment - Current investment amount
   * @param {string} reason - Reason for tier change
   * @returns {Promise<Object>} - Updated user tier info
   */
  async updateUserTier(wallet, investment, reason = 'Investment update') {
    try {
      const newTier = this.calculateTier(investment);
      
      // Get existing user tier data
      let userTier = await this.UserTier.findOne({ wallet: wallet.toLowerCase() });
      
      if (!userTier) {
        // Create new user tier record
        userTier = new this.UserTier({
          wallet: wallet.toLowerCase(),
          currentTier: newTier.tierName,
          totalInvestment: investment,
          tierHistory: [{
            tier: newTier.tierName,
            timestamp: new Date(),
            investment,
            reason: 'Initial tier assignment'
          }],
          permissions: newTier.permissions,
          features: newTier.features,
          adminPanelUrl: newTier.adminPanelUrl,
          dbEndpoint: newTier.dbEndpoint
        });
      } else {
        // Check if tier has changed
        const tierChanged = userTier.currentTier !== newTier.tierName;
        
        // Update user tier data
        userTier.currentTier = newTier.tierName;
        userTier.totalInvestment = investment;
        userTier.lastVerified = new Date();
        userTier.permissions = newTier.permissions;
        userTier.features = newTier.features;
        userTier.adminPanelUrl = newTier.adminPanelUrl;
        userTier.dbEndpoint = newTier.dbEndpoint;
        
        // Add to tier history if tier changed
        if (tierChanged) {
          userTier.tierHistory.push({
            tier: newTier.tierName,
            timestamp: new Date(),
            investment,
            reason
          });
        }
      }
      
      await userTier.save();
      return userTier.toObject();
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw error;
    }
  }

  /**
   * Get user tier information
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} - User tier information
   */
  async getUserTier(wallet) {
    try {
      const userTier = await this.UserTier.findOne({ 
        wallet: wallet.toLowerCase(),
        isActive: true 
      });
      return userTier ? userTier.toObject() : null;
    } catch (error) {
      console.error('Error fetching user tier:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} wallet - Wallet address
   * @param {string} permission - Required permission
   * @returns {Promise<boolean>} - Permission check result
   */
  async hasPermission(wallet, permission) {
    try {
      const userTier = await this.getUserTier(wallet);
      if (!userTier) {
        return false;
      }
      
      return userTier.permissions.includes(permission) || 
             userTier.permissions.includes('all_permissions');
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has access to specific feature
   * @param {string} wallet - Wallet address
   * @param {string} feature - Required feature
   * @returns {Promise<boolean>} - Feature access result
   */
  async hasFeatureAccess(wallet, feature) {
    try {
      const userTier = await this.getUserTier(wallet);
      if (!userTier) {
        return false;
      }
      
      return userTier.features.includes(feature) || 
             userTier.permissions.includes('all_permissions');
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Get tier statistics
   * @returns {Promise<Object>} - Tier distribution statistics
   */
  async getTierStatistics() {
    try {
      const stats = await this.UserTier.aggregate([
        { $match: { isActive: true } },
        { $group: {
          _id: '$currentTier',
          count: { $sum: 1 },
          totalInvestment: { $sum: '$totalInvestment' },
          avgInvestment: { $avg: '$totalInvestment' }
        }},
        { $sort: { _id: 1 } }
      ]);
      
      const totalUsers = await this.UserTier.countDocuments({ isActive: true });
      const totalInvestment = stats.reduce((sum, tier) => sum + tier.totalInvestment, 0);
      
      return {
        totalUsers,
        totalInvestment,
        tierDistribution: stats,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching tier statistics:', error);
      return null;
    }
  }

  /**
   * Get users by tier
   * @param {string} tierName - Tier name
   * @param {number} limit - Maximum number of users to return
   * @param {number} skip - Number of users to skip
   * @returns {Promise<Array>} - Array of users in the tier
   */
  async getUsersByTier(tierName, limit = 100, skip = 0) {
    try {
      const users = await this.UserTier.find({ 
        currentTier: tierName.toUpperCase(),
        isActive: true 
      })
      .select('wallet currentTier totalInvestment lastVerified')
      .sort({ totalInvestment: -1 })
      .limit(limit)
      .skip(skip);
      
      return users.map(user => user.toObject());
    } catch (error) {
      console.error('Error fetching users by tier:', error);
      return [];
    }
  }

  /**
   * Update tier configuration
   * @param {string} tierName - Tier name
   * @param {Object} updates - Configuration updates
   * @returns {Promise<Object>} - Updated tier configuration
   */
  async updateTierConfig(tierName, updates) {
    try {
      const updatedConfig = await this.TierConfig.findOneAndUpdate(
        { tierName: tierName.toUpperCase() },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      
      return updatedConfig ? updatedConfig.toObject() : null;
    } catch (error) {
      console.error('Error updating tier config:', error);
      throw error;
    }
  }

  /**
   * Deactivate user tier (soft delete)
   * @param {string} wallet - Wallet address
   * @returns {Promise<boolean>} - Success status
   */
  async deactivateUserTier(wallet) {
    try {
      await this.UserTier.findOneAndUpdate(
        { wallet: wallet.toLowerCase() },
        { isActive: false, updatedAt: new Date() }
      );
      return true;
    } catch (error) {
      console.error('Error deactivating user tier:', error);
      return false;
    }
  }

  /**
   * Get tier upgrade requirements
   * @param {string} currentTier - Current tier name
   * @returns {Object} - Next tier requirements
   */
  getUpgradeRequirements(currentTier) {
    const tiers = Object.values(this.defaultTiers)
      .filter(tier => tier.isActive)
      .sort((a, b) => a.priority - b.priority);
    
    const currentIndex = tiers.findIndex(tier => tier.tierName === currentTier);
    
    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return null; // Invalid tier or already at highest tier
    }
    
    const nextTier = tiers[currentIndex + 1];
    return {
      nextTier: nextTier.tierName,
      requiredInvestment: nextTier.minInvestment,
      newFeatures: nextTier.features.filter(feature => 
        !tiers[currentIndex].features.includes(feature)
      ),
      newPermissions: nextTier.permissions.filter(permission => 
        !tiers[currentIndex].permissions.includes(permission)
      )
    };
  }

  /**
   * Clean up old tier history entries
   * @param {number} daysToKeep - Number of days of history to keep
   * @returns {Promise<number>} - Number of entries cleaned up
   */
  async cleanupTierHistory(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await this.UserTier.updateMany(
        {},
        {
          $pull: {
            tierHistory: {
              timestamp: { $lt: cutoffDate }
            }
          }
        }
      );
      
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up tier history:', error);
      return 0;
    }
  }
}

module.exports = TierService;
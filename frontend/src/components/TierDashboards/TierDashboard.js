/**
 * Tier-Specific Dashboard Component
 * Renders appropriate dashboard based on user's investment tier
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BronzeDashboard from './BronzeDashboard';
import SilverDashboard from './SilverDashboard';
import GoldDashboard from './GoldDashboard';
import PlatinumDashboard from './PlatinumDashboard';
import UnregisteredDashboard from './UnregisteredDashboard';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';

const TierDashboard = () => {
  const { 
    user, 
    tier, 
    investment, 
    permissions, 
    isLoading, 
    error, 
    verifyInvestment,
    hasPermission,
    hasTierAccess 
  } = useAuth();

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [tierUpgradeAvailable, setTierUpgradeAvailable] = useState(false);

  // Verify investment on component mount and periodically
  useEffect(() => {
    const verifyAndUpdate = async () => {
      try {
        await verifyInvestment();
      } catch (error) {
        console.error('Investment verification failed:', error);
      } finally {
        setDashboardLoading(false);
      }
    };

    if (user && user.wallet) {
      verifyAndUpdate();

      // Set up periodic investment verification (every 5 minutes)
      const interval = setInterval(verifyAndUpdate, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setDashboardLoading(false);
    }
  }, [user, verifyInvestment]);

  // Check for tier upgrade availability
  useEffect(() => {
    const checkUpgradeAvailability = () => {
      const tierThresholds = {
        'UNREGISTERED': 25,
        'BRONZE': 50,
        'SILVER': 1000,
        'GOLD': 10000
      };

      const nextTierThreshold = tierThresholds[tier];
      if (nextTierThreshold && investment >= nextTierThreshold) {
        setTierUpgradeAvailable(true);
      } else {
        setTierUpgradeAvailable(false);
      }
    };

    if (tier && investment !== undefined) {
      checkUpgradeAvailability();
    }
  }, [tier, investment]);

  // Show loading state
  if (isLoading || dashboardLoading) {
    return (
      <div className="tier-dashboard-loading">
        <LoadingSpinner />
        <p>Loading your personalized dashboard...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="tier-dashboard-error">
        <ErrorMessage message={error} />
      </div>
    );
  }

  // Show unauthenticated state
  if (!user) {
    return (
      <div className="tier-dashboard-unauth">
        <h2>Welcome to AIMAS PRO</h2>
        <p>Please connect your wallet to access your personalized dashboard.</p>
      </div>
    );
  }

  // Tier upgrade notification
  const TierUpgradeNotification = () => {
    if (!tierUpgradeAvailable) return null;

    return (
      <div className="tier-upgrade-notification">
        <div className="upgrade-alert">
          <h4>🎉 Tier Upgrade Available!</h4>
          <p>Your investment qualifies you for a higher tier with additional features.</p>
          <button 
            className="btn btn-primary"
            onClick={verifyInvestment}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  };

  // Render tier-specific dashboard
  const renderTierDashboard = () => {
    switch (tier) {
      case 'BRONZE':
        return <BronzeDashboard user={user} />;
      case 'SILVER':
        return <SilverDashboard user={user} />;
      case 'GOLD':
        return <GoldDashboard user={user} />;
      case 'PLATINUM':
        return <PlatinumDashboard user={user} />;
      case 'UNREGISTERED':
      default:
        return <UnregisteredDashboard user={user} />;
    }
  };

  return (
    <div className="tier-dashboard">
      {/* Header with tier information */}
      <div className="tier-header">
        <div className="tier-info">
          <h1>Welcome to your {tier} Dashboard</h1>
          <div className="tier-stats">
            <div className="stat-item">
              <span className="stat-label">Current Tier:</span>
              <span className={`stat-value tier-${tier.toLowerCase()}`}>
                {tier}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Investment:</span>
              <span className="stat-value">
                ${investment?.toLocaleString() || '0'} USDT
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Wallet:</span>
              <span className="stat-value wallet-address">
                {user.wallet?.slice(0, 6)}...{user.wallet?.slice(-4)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="tier-actions">
          {hasPermission('view_investments') && (
            <button className="btn btn-outline">
              View Investments
            </button>
          )}
          {hasPermission('withdrawal_requests') && (
            <button className="btn btn-outline">
              Withdraw Funds
            </button>
          )}
          {hasPermission('advanced_analytics') && (
            <button className="btn btn-outline">
              Analytics
            </button>
          )}
        </div>
      </div>

      {/* Tier upgrade notification */}
      <TierUpgradeNotification />

      {/* Tier-specific dashboard content */}
      <div className="tier-content">
        {renderTierDashboard()}
      </div>

      {/* Footer with tier benefits */}
      <div className="tier-footer">
        <div className="tier-benefits">
          <h4>Your {tier} Benefits:</h4>
          <div className="benefits-grid">
            {permissions.map((permission, index) => (
              <div key={index} className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">
                  {formatPermissionName(permission)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format permission names for display
const formatPermissionName = (permission) => {
  const permissionNames = {
    'view_basic': 'Basic Dashboard Access',
    'basic_operations': 'Basic Operations',
    'view_investments': 'Investment Tracking',
    'view_referrals': 'Referral System',
    'advanced_view': 'Advanced Features',
    'binary_network_view': 'Binary Network View',
    'withdrawal_requests': 'Withdrawal Management',
    'gold_features': 'Gold Exclusive Features',
    'team_management': 'Team Management',
    'advanced_analytics': 'Advanced Analytics',
    'all_permissions': 'Full System Access',
    'platinum_exclusive': 'Platinum Exclusive',
    'system_administration': 'System Administration',
    'user_management': 'User Management',
    'financial_oversight': 'Financial Oversight',
    'system_configuration': 'System Configuration'
  };

  return permissionNames[permission] || permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default TierDashboard;
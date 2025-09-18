/**
 * Admin Panel Router Component
 * Routes users to tier-specific admin interfaces based on access levels
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BronzeAdminPanel from './BronzeAdminPanel';
import SilverAdminPanel from './SilverAdminPanel';
import GoldAdminPanel from './GoldAdminPanel';
import PlatinumAdminPanel from './PlatinumAdminPanel';
import AccessDenied from '../Common/AccessDenied';
import LoadingSpinner from '../Common/LoadingSpinner';

const AdminRouter = () => {
  const { 
    user, 
    tier, 
    permissions, 
    adminPanelUrl, 
    hasPermission, 
    hasTierAccess,
    isLoading,
    verifyInvestment 
  } = useAuth();

  const [adminLoading, setAdminLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState(null);

  // Verify access and determine admin level
  useEffect(() => {
    const determineAccessLevel = async () => {
      try {
        // Verify current investment to ensure tier is up to date
        await verifyInvestment();

        // Determine admin access level based on tier and permissions
        let level = null;

        if (hasPermission('system_administration') || hasPermission('all_permissions')) {
          level = 'PLATINUM';
        } else if (hasPermission('team_management') && hasTierAccess('GOLD')) {
          level = 'GOLD';
        } else if (hasPermission('advanced_view') && hasTierAccess('SILVER')) {
          level = 'SILVER';
        } else if (hasPermission('basic_operations') && hasTierAccess('BRONZE')) {
          level = 'BRONZE';
        }

        setAccessLevel(level);
      } catch (error) {
        console.error('Error determining admin access level:', error);
        setAccessLevel(null);
      } finally {
        setAdminLoading(false);
      }
    };

    if (user && !isLoading) {
      determineAccessLevel();
    } else if (!isLoading) {
      setAdminLoading(false);
    }
  }, [user, tier, permissions, hasPermission, hasTierAccess, verifyInvestment, isLoading]);

  // Show loading state
  if (isLoading || adminLoading) {
    return (
      <div className="admin-router-loading">
        <LoadingSpinner />
        <p>Verifying admin access...</p>
      </div>
    );
  }

  // Show access denied if no admin access
  if (!accessLevel) {
    return (
      <AccessDenied 
        message="You don't have access to the admin panel. Minimum Bronze tier required."
        requiredTier="BRONZE"
        currentTier={tier}
        currentInvestment={user?.investment}
      />
    );
  }

  // Render appropriate admin panel based on access level
  const renderAdminPanel = () => {
    switch (accessLevel) {
      case 'PLATINUM':
        return <PlatinumAdminPanel user={user} />;
      case 'GOLD':
        return <GoldAdminPanel user={user} />;
      case 'SILVER':
        return <SilverAdminPanel user={user} />;
      case 'BRONZE':
        return <BronzeAdminPanel user={user} />;
      default:
        return <AccessDenied message="Invalid access level" />;
    }
  };

  return (
    <div className="admin-router">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-title">
          <h1>Admin Panel - {accessLevel} Access</h1>
          <p>Manage your account and access tier-specific features</p>
        </div>
        
        <div className="admin-user-info">
          <div className="user-tier">
            <span className={`tier-badge tier-${tier?.toLowerCase()}`}>
              {tier}
            </span>
          </div>
          <div className="user-wallet">
            {user?.wallet?.slice(0, 6)}...{user?.wallet?.slice(-4)}
          </div>
          <div className="user-investment">
            ${user?.investment?.toLocaleString() || '0'} USDT
          </div>
        </div>
      </div>

      {/* Navigation Breadcrumb */}
      <div className="admin-breadcrumb">
        <span>Admin Panel</span>
        <span className="breadcrumb-separator">›</span>
        <span>{accessLevel} Dashboard</span>
      </div>

      {/* Admin Panel Content */}
      <div className="admin-content">
        {renderAdminPanel()}
      </div>

      {/* Admin Footer */}
      <div className="admin-footer">
        <div className="access-info">
          <h4>Your Access Level: {accessLevel}</h4>
          <div className="permissions-list">
            <h5>Available Permissions:</h5>
            <div className="permissions-grid">
              {permissions?.map((permission, index) => (
                <div key={index} className="permission-item">
                  <span className="permission-icon">✓</span>
                  <span className="permission-name">
                    {formatPermissionName(permission)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upgrade Information */}
        {accessLevel !== 'PLATINUM' && (
          <div className="upgrade-info">
            <h4>Upgrade Your Access</h4>
            <div className="upgrade-options">
              {accessLevel === 'BRONZE' && (
                <div className="upgrade-option">
                  <h5>Silver Access - $50+ Investment</h5>
                  <ul>
                    <li>Binary Network Management</li>
                    <li>Advanced Analytics</li>
                    <li>Withdrawal Management</li>
                  </ul>
                </div>
              )}
              {(accessLevel === 'BRONZE' || accessLevel === 'SILVER') && (
                <div className="upgrade-option">
                  <h5>Gold Access - $1,000+ Investment</h5>
                  <ul>
                    <li>Team Management Tools</li>
                    <li>Advanced Reports</li>
                    <li>Market Insights</li>
                  </ul>
                </div>
              )}
              {accessLevel !== 'PLATINUM' && (
                <div className="upgrade-option">
                  <h5>Platinum Access - $10,000+ Investment</h5>
                  <ul>
                    <li>Full System Administration</li>
                    <li>User Management</li>
                    <li>Financial Oversight</li>
                    <li>System Configuration</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format permission names
const formatPermissionName = (permission) => {
  const permissionNames = {
    'view_basic': 'Basic Dashboard Access',
    'basic_operations': 'Basic Operations',
    'view_investments': 'Investment Management',
    'view_referrals': 'Referral System',
    'advanced_view': 'Advanced Features',
    'binary_network_view': 'Binary Network',
    'withdrawal_requests': 'Withdrawal Management',
    'gold_features': 'Gold Features',
    'team_management': 'Team Management',
    'advanced_analytics': 'Advanced Analytics',
    'all_permissions': 'Full Access',
    'platinum_exclusive': 'Platinum Features',
    'system_administration': 'System Admin',
    'user_management': 'User Management',
    'financial_oversight': 'Financial Oversight',
    'system_configuration': 'System Config'
  };

  return permissionNames[permission] || permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default AdminRouter;
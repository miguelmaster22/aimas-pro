/**
 * Bronze Tier Dashboard Component
 * Basic features for Bronze tier users ($25-$49.99 investment)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import cons from '../../cons';

const BronzeDashboard = ({ user }) => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    investments: [],
    referrals: [],
    basicStats: {},
    loading: true,
    error: null
  });

  const API_BASE = cons.API || 'http://localhost:8000';

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch basic investment data
        const investmentResponse = await fetch(`${API_BASE}/api/v1/investments/basic`, {
          headers
        });

        // Fetch referral data
        const referralResponse = await fetch(`${API_BASE}/api/v1/referrals/basic`, {
          headers
        });

        // Fetch basic statistics
        const statsResponse = await fetch(`${API_BASE}/api/v1/stats/basic`, {
          headers
        });

        const [investmentData, referralData, statsData] = await Promise.all([
          investmentResponse.json(),
          referralResponse.json(),
          statsResponse.json()
        ]);

        setDashboardData({
          investments: investmentData.success ? investmentData.data : [],
          referrals: referralData.success ? referralData.data : [],
          basicStats: statsData.success ? statsData.data : {},
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching Bronze dashboard data:', error);
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token, API_BASE]);

  if (dashboardData.loading) {
    return (
      <div className="bronze-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your Bronze dashboard...</p>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="bronze-dashboard-error">
        <p>Error loading dashboard: {dashboardData.error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bronze-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-card">
          <h2>🥉 Welcome to Bronze Tier</h2>
          <p>You have access to basic investment tracking and referral features.</p>
          <div className="upgrade-hint">
            <p>💡 Invest $50+ to unlock Silver tier with advanced features!</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>${user.investment?.toLocaleString() || '0'}</h3>
              <p>Total Investment</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>${dashboardData.basicStats.totalEarnings || '0'}</h3>
              <p>Total Earnings</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{dashboardData.referrals.length || '0'}</h3>
              <p>Direct Referrals</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{dashboardData.basicStats.activeDeposits || '0'}</h3>
              <p>Active Deposits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Tracking */}
      <div className="investment-section">
        <div className="section-header">
          <h3>📊 Investment Tracking</h3>
          <p>Monitor your investment performance</p>
        </div>
        
        <div className="investment-cards">
          {dashboardData.investments.length > 0 ? (
            dashboardData.investments.map((investment, index) => (
              <div key={index} className="investment-card">
                <div className="investment-header">
                  <span className="investment-amount">
                    ${investment.amount?.toLocaleString() || '0'}
                  </span>
                  <span className={`investment-status ${investment.status}`}>
                    {investment.status}
                  </span>
                </div>
                <div className="investment-details">
                  <p><strong>Date:</strong> {new Date(investment.date).toLocaleDateString()}</p>
                  <p><strong>ROI:</strong> {investment.roi || '0'}%</p>
                  <p><strong>Duration:</strong> {investment.duration || 'N/A'} days</p>
                </div>
                <div className="investment-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${investment.progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{investment.progress || 0}% Complete</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-investments">
              <p>No investments found. Start investing to see your portfolio here!</p>
              <button className="btn btn-primary">Make First Investment</button>
            </div>
          )}
        </div>
      </div>

      {/* Referral System */}
      <div className="referral-section">
        <div className="section-header">
          <h3>🤝 Referral System</h3>
          <p>Earn rewards by referring new users</p>
        </div>
        
        <div className="referral-content">
          <div className="referral-link-card">
            <h4>Your Referral Link</h4>
            <div className="referral-link-container">
              <input 
                type="text" 
                value={`https://aimas.pro/?ref=${user.wallet}`}
                readOnly
                className="referral-link-input"
              />
              <button 
                className="btn btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(`https://aimas.pro/?ref=${user.wallet}`);
                  alert('Referral link copied!');
                }}
              >
                Copy
              </button>
            </div>
            <p className="referral-commission">Earn 5% commission on direct referrals</p>
          </div>

          <div className="referral-stats">
            <div className="referral-stat">
              <span className="stat-number">{dashboardData.referrals.length}</span>
              <span className="stat-label">Total Referrals</span>
            </div>
            <div className="referral-stat">
              <span className="stat-number">${dashboardData.basicStats.referralEarnings || '0'}</span>
              <span className="stat-label">Referral Earnings</span>
            </div>
          </div>

          {dashboardData.referrals.length > 0 && (
            <div className="referral-list">
              <h4>Recent Referrals</h4>
              <div className="referral-items">
                {dashboardData.referrals.slice(0, 5).map((referral, index) => (
                  <div key={index} className="referral-item">
                    <div className="referral-info">
                      <span className="referral-wallet">
                        {referral.wallet?.slice(0, 6)}...{referral.wallet?.slice(-4)}
                      </span>
                      <span className="referral-date">
                        {new Date(referral.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="referral-earnings">
                      +${referral.commission || '0'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Basic Reports */}
      <div className="reports-section">
        <div className="section-header">
          <h3>📋 Basic Reports</h3>
          <p>Simple overview of your activity</p>
        </div>
        
        <div className="reports-grid">
          <div className="report-card">
            <h4>Monthly Summary</h4>
            <div className="report-data">
              <p><strong>Investments:</strong> ${dashboardData.basicStats.monthlyInvestments || '0'}</p>
              <p><strong>Earnings:</strong> ${dashboardData.basicStats.monthlyEarnings || '0'}</p>
              <p><strong>Referrals:</strong> {dashboardData.basicStats.monthlyReferrals || '0'}</p>
            </div>
          </div>
          
          <div className="report-card">
            <h4>Performance</h4>
            <div className="report-data">
              <p><strong>ROI:</strong> {dashboardData.basicStats.averageROI || '0'}%</p>
              <p><strong>Success Rate:</strong> {dashboardData.basicStats.successRate || '0'}%</p>
              <p><strong>Active Days:</strong> {dashboardData.basicStats.activeDays || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Promotion */}
      <div className="upgrade-section">
        <div className="upgrade-card">
          <h3>🚀 Upgrade to Silver Tier</h3>
          <p>Unlock advanced features with just $50+ investment:</p>
          <ul className="upgrade-benefits">
            <li>✓ Binary Network Visualization</li>
            <li>✓ Advanced Analytics</li>
            <li>✓ Withdrawal Management</li>
            <li>✓ Performance Insights</li>
            <li>✓ Priority Support</li>
          </ul>
          <button className="btn btn-upgrade">
            Invest More to Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};

export default BronzeDashboard;
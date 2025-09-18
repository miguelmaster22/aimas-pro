/**
 * Comprehensive Integration Test for Tiered Access Control System
 * Tests authentication, tier management, database access, and permissions
 */

const { ethers } = require('ethers');
const fetch = require('node-fetch');
require('dotenv').config();

// Test configuration
const TEST_CONFIG = {
  API_BASE: process.env.TEST_API_URL || 'http://localhost:8000/api/v1',
  TEST_WALLET: process.env.TEST_WALLET || '0x742d35Cc6634C0532925a3b8D0C9C0E3C5d5c8E9',
  TEST_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY,
  INVESTMENT_AMOUNTS: [0, 25, 50, 1000, 10000], // Test different tier levels
  TIMEOUT: 30000 // 30 seconds timeout
};

class TieredSystemTester {
  constructor() {
    this.testResults = [];
    this.authTokens = new Map();
    this.testWallets = [];
  }

  /**
   * Log test result
   */
  logResult(testName, success, message, data = null) {
    const result = {
      test: testName,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
    
    if (data && process.env.VERBOSE_TESTS) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Generate test wallet
   */
  generateTestWallet() {
    const wallet = ethers.Wallet.createRandom();
    this.testWallets.push({
      address: wallet.address,
      privateKey: wallet.privateKey
    });
    return wallet;
  }

  /**
   * Sign message with wallet
   */
  async signMessage(privateKey, message) {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  }

  /**
   * Test API health check
   */
  async testHealthCheck() {
    try {
      const response = await fetch(`${TEST_CONFIG.API_BASE.replace('/api/v1', '')}/health`);
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        this.logResult('Health Check', true, 'API is healthy', data);
        return true;
      } else {
        this.logResult('Health Check', false, 'API health check failed', data);
        return false;
      }
    } catch (error) {
      this.logResult('Health Check', false, `Health check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Test wallet authentication flow
   */
  async testWalletAuthentication(walletAddress, privateKey, expectedTier = 'UNREGISTERED') {
    try {
      // Step 1: Request nonce
      const nonceResponse = await fetch(`${TEST_CONFIG.API_BASE}/auth/request-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress })
      });

      const nonceData = await nonceResponse.json();
      
      if (!nonceData.success) {
        this.logResult('Nonce Request', false, `Nonce request failed: ${nonceData.error}`);
        return null;
      }

      this.logResult('Nonce Request', true, 'Nonce generated successfully');

      // Step 2: Sign message
      const signature = await this.signMessage(privateKey, nonceData.message);
      this.logResult('Message Signing', true, 'Message signed successfully');

      // Step 3: Verify wallet
      const authResponse = await fetch(`${TEST_CONFIG.API_BASE}/auth/verify-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          signature: signature,
          nonce: nonceData.nonce
        })
      });

      const authData = await authResponse.json();

      if (!authData.success) {
        this.logResult('Wallet Verification', false, `Authentication failed: ${authData.error}`);
        return null;
      }

      // Verify tier assignment
      if (authData.user.tier === expectedTier) {
        this.logResult('Tier Assignment', true, `Correct tier assigned: ${expectedTier}`);
      } else {
        this.logResult('Tier Assignment', false, 
          `Incorrect tier: expected ${expectedTier}, got ${authData.user.tier}`);
      }

      this.logResult('Wallet Authentication', true, 'Authentication successful', {
        wallet: authData.user.wallet,
        tier: authData.user.tier,
        investment: authData.user.investment
      });

      // Store token for further tests
      this.authTokens.set(walletAddress, authData.token);
      
      return authData;
    } catch (error) {
      this.logResult('Wallet Authentication', false, `Authentication error: ${error.message}`);
      return null;
    }
  }

  /**
   * Test tier-specific permissions
   */
  async testTierPermissions(walletAddress, expectedPermissions) {
    try {
      const token = this.authTokens.get(walletAddress);
      if (!token) {
        this.logResult('Permission Test', false, 'No auth token available');
        return false;
      }

      // Test session endpoint
      const sessionResponse = await fetch(`${TEST_CONFIG.API_BASE}/auth/session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        this.logResult('Session Validation', false, 'Session validation failed');
        return false;
      }

      this.logResult('Session Validation', true, 'Session is valid');

      // Check permissions
      const userPermissions = sessionData.user.permissions;
      const hasExpectedPermissions = expectedPermissions.every(permission => 
        userPermissions.includes(permission) || userPermissions.includes('all_permissions')
      );

      if (hasExpectedPermissions) {
        this.logResult('Permission Check', true, 'All expected permissions present');
      } else {
        this.logResult('Permission Check', false, 
          `Missing permissions. Expected: ${expectedPermissions.join(', ')}, Got: ${userPermissions.join(', ')}`);
      }

      return hasExpectedPermissions;
    } catch (error) {
      this.logResult('Permission Test', false, `Permission test error: ${error.message}`);
      return false;
    }
  }

  /**
   * Test database access based on tier
   */
  async testDatabaseAccess(walletAddress, expectedDbEndpoint) {
    try {
      const token = this.authTokens.get(walletAddress);
      if (!token) {
        this.logResult('Database Access Test', false, 'No auth token available');
        return false;
      }

      // Test collections endpoint
      const collectionsResponse = await fetch(`${TEST_CONFIG.API_BASE}/database/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const collectionsData = await collectionsResponse.json();

      if (!collectionsData.success) {
        this.logResult('Database Collections', false, 'Failed to get collections');
        return false;
      }

      this.logResult('Database Collections', true, 
        `Collections accessible: ${collectionsData.data.length}`);

      // Test basic query
      const queryResponse = await fetch(`${TEST_CONFIG.API_BASE}/database/query`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collection: 'user_data',
          operation: 'count',
          query: {}
        })
      });

      const queryData = await queryResponse.json();

      if (queryData.success) {
        this.logResult('Database Query', true, 'Database query successful');
        return true;
      } else {
        this.logResult('Database Query', false, `Query failed: ${queryData.error}`);
        return false;
      }
    } catch (error) {
      this.logResult('Database Access Test', false, `Database test error: ${error.message}`);
      return false;
    }
  }

  /**
   * Test investment verification
   */
  async testInvestmentVerification(walletAddress) {
    try {
      const verifyResponse = await fetch(
        `${TEST_CONFIG.API_BASE}/auth/verify-investment/${walletAddress}`
      );

      const verifyData = await verifyResponse.json();

      if (verifyData.success && verifyData.data.verified) {
        this.logResult('Investment Verification', true, 
          `Investment verified: $${verifyData.data.totalInvestment}`);
        return verifyData.data;
      } else {
        this.logResult('Investment Verification', false, 
          'Investment verification failed');
        return null;
      }
    } catch (error) {
      this.logResult('Investment Verification', false, 
        `Verification error: ${error.message}`);
      return null;
    }
  }

  /**
   * Test tier statistics (admin only)
   */
  async testTierStatistics(adminWallet) {
    try {
      const token = this.authTokens.get(adminWallet);
      if (!token) {
        this.logResult('Tier Statistics Test', false, 'No admin token available');
        return false;
      }

      const statsResponse = await fetch(`${TEST_CONFIG.API_BASE}/tiers/statistics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const statsData = await statsResponse.json();

      if (statsData.success) {
        this.logResult('Tier Statistics', true, 'Statistics retrieved successfully', {
          totalUsers: statsData.data.totalUsers,
          totalInvestment: statsData.data.totalInvestment
        });
        return true;
      } else {
        this.logResult('Tier Statistics', false, `Statistics failed: ${statsData.error}`);
        return false;
      }
    } catch (error) {
      this.logResult('Tier Statistics Test', false, `Statistics error: ${error.message}`);
      return false;
    }
  }

  /**
   * Test token refresh
   */
  async testTokenRefresh(walletAddress) {
    try {
      const token = this.authTokens.get(walletAddress);
      if (!token) {
        this.logResult('Token Refresh Test', false, 'No token to refresh');
        return false;
      }

      const refreshResponse = await fetch(`${TEST_CONFIG.API_BASE}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const refreshData = await refreshResponse.json();

      if (refreshData.success) {
        this.logResult('Token Refresh', true, 'Token refreshed successfully');
        this.authTokens.set(walletAddress, refreshData.token);
        return true;
      } else {
        this.logResult('Token Refresh', false, `Refresh failed: ${refreshData.error}`);
        return false;
      }
    } catch (error) {
      this.logResult('Token Refresh Test', false, `Refresh error: ${error.message}`);
      return false;
    }
  }

  /**
   * Run comprehensive test suite
   */
  async runTestSuite() {
    console.log('🚀 Starting Tiered Access Control System Tests...\n');

    // Test 1: Health Check
    const healthOk = await this.testHealthCheck();
    if (!healthOk) {
      console.log('❌ Health check failed, aborting tests');
      return this.generateReport();
    }

    // Test 2: Generate test wallets and test different tiers
    const tierTests = [
      { investment: 0, tier: 'UNREGISTERED', permissions: ['view_public'] },
      { investment: 25, tier: 'BRONZE', permissions: ['view_basic', 'basic_operations'] },
      { investment: 50, tier: 'SILVER', permissions: ['view_basic', 'advanced_view'] },
      { investment: 1000, tier: 'GOLD', permissions: ['view_basic', 'gold_features'] },
      { investment: 10000, tier: 'PLATINUM', permissions: ['all_permissions'] }
    ];

    for (const tierTest of tierTests) {
      console.log(`\n📊 Testing ${tierTest.tier} tier (Investment: $${tierTest.investment})...`);
      
      const testWallet = this.generateTestWallet();
      
      // Test authentication
      const authResult = await this.testWalletAuthentication(
        testWallet.address, 
        testWallet.privateKey, 
        tierTest.tier
      );

      if (authResult) {
        // Test permissions
        await this.testTierPermissions(testWallet.address, tierTest.permissions);
        
        // Test database access
        await this.testDatabaseAccess(testWallet.address, authResult.user.dbEndpoint);
        
        // Test investment verification
        await this.testInvestmentVerification(testWallet.address);
        
        // Test token refresh
        await this.testTokenRefresh(testWallet.address);
      }
    }

    // Test 3: Admin-specific features (using highest tier wallet)
    if (this.testWallets.length > 0) {
      const adminWallet = this.testWallets[this.testWallets.length - 1];
      console.log('\n👑 Testing admin features...');
      await this.testTierStatistics(adminWallet.address);
    }

    return this.generateReport();
  }

  /**
   * Generate test report
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);

    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${successRate}%`
      },
      results: this.testResults,
      testWallets: this.testWallets.map(w => ({ address: w.address })),
      timestamp: new Date().toISOString()
    };

    console.log('\n📋 Test Report Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${successRate}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new TieredSystemTester();
  
  tester.runTestSuite()
    .then(report => {
      console.log('\n✅ Test suite completed');
      
      // Save report to file
      const fs = require('fs');
      const reportPath = `test-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Exit with appropriate code
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = TieredSystemTester;
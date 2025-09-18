/**
 * Contract Service for Blockchain Interaction
 * Handles investment amount verification and blockchain data retrieval
 */

const { Web3 } = require('web3');
const BigNumber = require('bignumber.js');

class ContractService {
  constructor() {
    // Initialize Web3 instances with multiple RPC endpoints for redundancy
    this.rpcEndpoints = [
      process.env.APP_RED || "https://bsc-dataseed.binance.org/",
      "https://bsc-dataseed1.binance.org/",
      "https://bsc-dataseed2.binance.org/",
      "https://bsc-dataseed3.binance.org/",
      "https://bsc-dataseed4.binance.org/"
    ];
    
    this.web3Instances = this.rpcEndpoints.map(endpoint => new Web3(endpoint));
    this.currentRpcIndex = 0;
    
    // Contract configuration
    this.contractAddress = process.env.SC_PROXY || "0x86bce12014a6c721156C536Be22DA7F30b6F33C1";
    this.contractABI = require("../binaryV2.js");
    
    // Initialize contract instances
    this.contracts = this.web3Instances.map(web3 => 
      new web3.eth.Contract(this.contractABI, this.contractAddress)
    );
    
    // Cache for recent queries to reduce blockchain calls
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get current Web3 instance with failover
   * @returns {Web3} - Current Web3 instance
   */
  getCurrentWeb3() {
    return this.web3Instances[this.currentRpcIndex];
  }

  /**
   * Get current contract instance with failover
   * @returns {Contract} - Current contract instance
   */
  getCurrentContract() {
    return this.contracts[this.currentRpcIndex];
  }

  /**
   * Switch to next RPC endpoint on failure
   */
  switchRpcEndpoint() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    console.log(`Switched to RPC endpoint: ${this.rpcEndpoints[this.currentRpcIndex]}`);
  }

  /**
   * Execute contract call with failover mechanism
   * @param {Function} contractCall - Contract method to call
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>} - Contract call result
   */
  async executeWithFailover(contractCall, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await contractCall(this.getCurrentContract());
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Contract call failed (attempt ${attempt + 1}):`, error.message);
        
        if (attempt < maxRetries - 1) {
          this.switchRpcEndpoint();
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Delay utility function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cached result or execute function
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if not cached
   * @returns {Promise<any>} - Cached or fresh result
   */
  async getCachedOrExecute(key, fn) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    const result = await fn();
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Get investor data from blockchain
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} - Investor data
   */
  async getInvestorData(wallet) {
    const cacheKey = `investor_${wallet.toLowerCase()}`;
    
    return await this.getCachedOrExecute(cacheKey, async () => {
      return await this.executeWithFailover(async (contract) => {
        const investor = await contract.methods.investors(wallet).call();
        return {
          registered: investor.registered,
          invested: investor.invested,
          paidAt: investor.paidAt,
          withdrawn: investor.withdrawn
        };
      });
    });
  }

  /**
   * Get user deposits from blockchain
   * @param {string} wallet - Wallet address
   * @returns {Promise<Array>} - Array of deposits
   */
  async getUserDeposits(wallet) {
    const cacheKey = `deposits_${wallet.toLowerCase()}`;
    
    return await this.getCachedOrExecute(cacheKey, async () => {
      return await this.executeWithFailover(async (contract) => {
        const deposits = await contract.methods.verListaDepositos(wallet).call();
        return deposits.map(deposit => ({
          inicio: deposit.inicio,
          valor: deposit.valor,
          factor: deposit.factor,
          retirado: deposit.retirado,
          pasivo: deposit.pasivo
        }));
      });
    });
  }

  /**
   * Calculate total investment amount for a wallet
   * @param {string} wallet - Wallet address
   * @returns {Promise<number>} - Total investment in USDT
   */
  async getTotalInvestment(wallet) {
    try {
      const investorData = await this.getInvestorData(wallet);
      
      if (!investorData.registered) {
        return 0;
      }

      // Get deposits for more accurate calculation
      const deposits = await this.getUserDeposits(wallet);
      
      let totalInvestment = new BigNumber(0);
      let totalLeaderInvestment = new BigNumber(0);

      // Calculate total from deposits
      for (const deposit of deposits) {
        const depositValue = new BigNumber(deposit.valor);
        
        if (deposit.pasivo) {
          totalInvestment = totalInvestment.plus(depositValue);
        } else {
          totalLeaderInvestment = totalLeaderInvestment.plus(depositValue);
        }
      }

      // Use the higher value between direct investment and calculated from deposits
      const directInvestment = new BigNumber(investorData.invested);
      const calculatedTotal = totalInvestment.plus(totalLeaderInvestment);
      
      const finalInvestment = BigNumber.maximum(directInvestment, calculatedTotal);
      
      // Convert from wei to USDT (18 decimals)
      return finalInvestment.shiftedBy(-18).toNumber();
    } catch (error) {
      console.error('Error calculating total investment:', error);
      return 0;
    }
  }

  /**
   * Get user's upline information
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} - Upline information
   */
  async getUplineInfo(wallet) {
    const cacheKey = `upline_${wallet.toLowerCase()}`;
    
    return await this.getCachedOrExecute(cacheKey, async () => {
      return await this.executeWithFailover(async (contract) => {
        const upline = await contract.methods.upline(wallet).call();
        return {
          referer: upline._referer,
          lado: parseInt(upline._lado)
        };
      });
    });
  }

  /**
   * Get user's level from contract
   * @param {string} wallet - Wallet address
   * @returns {Promise<number>} - User level
   */
  async getUserLevel(wallet) {
    const cacheKey = `level_${wallet.toLowerCase()}`;
    
    return await this.getCachedOrExecute(cacheKey, async () => {
      return await this.executeWithFailover(async (contract) => {
        const level = await contract.methods.leveling(wallet).call();
        return parseInt(level);
      });
    });
  }

  /**
   * Get user's binary network information
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} - Binary network data
   */
  async getBinaryNetworkInfo(wallet) {
    const cacheKey = `binary_${wallet.toLowerCase()}`;
    
    return await this.getCachedOrExecute(cacheKey, async () => {
      return await this.executeWithFailover(async (contract) => {
        // This would need to be implemented based on your binary system logic
        // For now, returning basic structure
        return {
          leftVolume: 0,
          rightVolume: 0,
          leftCount: 0,
          rightCount: 0,
          binaryEarnings: 0
        };
      });
    });
  }

  /**
   * Verify if wallet is registered in the system
   * @param {string} wallet - Wallet address
   * @returns {Promise<boolean>} - Registration status
   */
  async isWalletRegistered(wallet) {
    try {
      const investorData = await this.getInvestorData(wallet);
      return investorData.registered;
    } catch (error) {
      console.error('Error checking wallet registration:', error);
      return false;
    }
  }

  /**
   * Get withdrawable amount for user
   * @param {string} wallet - Wallet address
   * @returns {Promise<number>} - Withdrawable amount in USDT
   */
  async getWithdrawableAmount(wallet) {
    const cacheKey = `withdrawable_${wallet.toLowerCase()}`;
    
    return await this.getCachedOrExecute(cacheKey, async () => {
      return await this.executeWithFailover(async (contract) => {
        const withdrawable = await contract.methods.withdrawable(wallet).call();
        return new BigNumber(withdrawable).shiftedBy(-18).toNumber();
      });
    });
  }

  /**
   * Get real-time investment verification
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} - Investment verification data
   */
  async verifyInvestmentRealTime(wallet) {
    try {
      // Clear cache for this wallet to get fresh data
      const cacheKeys = Array.from(this.cache.keys()).filter(key => 
        key.includes(wallet.toLowerCase())
      );
      cacheKeys.forEach(key => this.cache.delete(key));

      const [
        investorData,
        totalInvestment,
        isRegistered,
        withdrawableAmount,
        userLevel
      ] = await Promise.all([
        this.getInvestorData(wallet),
        this.getTotalInvestment(wallet),
        this.isWalletRegistered(wallet),
        this.getWithdrawableAmount(wallet),
        this.getUserLevel(wallet)
      ]);

      return {
        wallet: wallet.toLowerCase(),
        isRegistered,
        totalInvestment,
        directInvestment: new BigNumber(investorData.invested).shiftedBy(-18).toNumber(),
        withdrawableAmount,
        userLevel,
        lastVerified: new Date().toISOString(),
        verified: true
      };
    } catch (error) {
      console.error('Real-time investment verification failed:', error);
      return {
        wallet: wallet.toLowerCase(),
        isRegistered: false,
        totalInvestment: 0,
        directInvestment: 0,
        withdrawableAmount: 0,
        userLevel: 0,
        lastVerified: new Date().toISOString(),
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache for specific wallet or all cache
   * @param {string} wallet - Optional wallet address to clear specific cache
   */
  clearCache(wallet = null) {
    if (wallet) {
      const cacheKeys = Array.from(this.cache.keys()).filter(key => 
        key.includes(wallet.toLowerCase())
      );
      cacheKeys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      currentRpcIndex: this.currentRpcIndex,
      currentRpcEndpoint: this.rpcEndpoints[this.currentRpcIndex]
    };
  }

  /**
   * Health check for contract service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const web3 = this.getCurrentWeb3();
      const blockNumber = await web3.eth.getBlockNumber();
      
      return {
        status: 'healthy',
        blockNumber,
        rpcEndpoint: this.rpcEndpoints[this.currentRpcIndex],
        contractAddress: this.contractAddress,
        cacheSize: this.cache.size
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        rpcEndpoint: this.rpcEndpoints[this.currentRpcIndex]
      };
    }
  }
}

module.exports = ContractService;
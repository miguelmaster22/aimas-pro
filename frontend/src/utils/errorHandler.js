// Enhanced error handling utilities for blockchain interactions
// Simplified version without external dependencies

// Error types and their user-friendly messages
const ERROR_MESSAGES = {
  // MetaMask/Wallet errors
  'User denied transaction signature': 'Transaction was cancelled by user',
  'User rejected the request': 'Connection request was rejected',
  'MetaMask Tx Signature: User denied transaction signature': 'Transaction cancelled',
  'execution reverted': 'Transaction failed - contract requirements not met',
  
  // Network errors
  'Network Error': 'Network connection failed. Please check your internet connection',
  'Invalid JSON RPC response': 'Network error. Please try again',
  'CONNECTION ERROR': 'Failed to connect to blockchain network',
  
  // Contract errors
  'insufficient funds': 'Insufficient funds for transaction',
  'gas required exceeds allowance': 'Transaction requires more gas than allowed',
  'nonce too low': 'Transaction nonce error. Please reset your MetaMask account',
  'replacement transaction underpriced': 'Transaction fee too low',
  
  // Custom contract errors
  'onlyOwner': 'Only contract owner can perform this action',
  'onlyAdmin': 'Only admin can perform this action',
  'onlySubOwner': 'Only sub-owner can perform this action',
  'MIN_RETIRO': 'Amount below minimum withdrawal limit',
  'MAX_RETIRO': 'Amount exceeds maximum withdrawal limit',
  'timerOut': 'Withdrawal cooldown period not met',
  'onOffWitdrawl': 'Withdrawals are currently disabled',
  'registered': 'User already registered',
  'not registered': 'User not registered in the system'
};

// Transaction status types
export const TX_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Simple notification system (fallback for toast)
class SimpleNotification {
  static show(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.cssText = `
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 10px;
    `;
    
    // Add close button
    notification.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span>${message}</span>
        <button type="button" class="btn-close btn-close-white ms-2" aria-label="Close"></button>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Add close functionality
    const closeBtn = notification.querySelector('.btn-close');
    const closeNotification = () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    };
    
    closeBtn.addEventListener('click', closeNotification);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(closeNotification, duration);
    }
    
    return notification;
  }
  
  static error(message, duration = 7000) {
    return this.show(message, 'danger', duration);
  }
  
  static success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }
  
  static warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }
  
  static info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }
}

// Enhanced error handler class
export class ErrorHandler {
  
  // Parse and format error messages
  static parseError(error) {
    if (!error) return 'Unknown error occurred';
    
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message || error.toString();
    
    // Check for known error patterns
    for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
      if (errorString.includes(pattern.toLowerCase())) {
        return message;
      }
    }
    
    // Extract revert reason if available
    if (errorString.includes('revert')) {
      const revertMatch = errorMessage.match(/revert (.+?)(?:\s|$)/i);
      if (revertMatch) {
        return `Transaction failed: ${revertMatch[1]}`;
      }
    }
    
    // Return original message if no pattern matches
    return errorMessage.length > 100 
      ? 'Transaction failed. Please try again or contact support.'
      : errorMessage;
  }
  
  // Handle transaction errors with user feedback
  static handleTransactionError(error, context = '') {
    const userMessage = this.parseError(error);
    const fullMessage = context ? `${context}: ${userMessage}` : userMessage;
    
    console.error('Transaction Error:', error);
    SimpleNotification.error(fullMessage);
    
    return userMessage;
  }
  
  // Handle network connection errors
  static handleNetworkError(error) {
    const message = this.parseError(error);
    console.error('Network Error:', error);
    
    SimpleNotification.error(`Network Error: ${message}`, 7000);
    
    return message;
  }
  
  // Handle contract call errors
  static handleContractError(error, functionName = '') {
    const message = this.parseError(error);
    const context = functionName ? `Contract call (${functionName})` : 'Contract call';

    console.error(`${context} Error:`, error);
    SimpleNotification.error(`${context} failed: ${message}`, 6000);

    return message;
  }

  // Handle critical application errors with simple alert
  static handleCriticalError(error, context = 'Application Error') {
    // Log to console first
    console.error(`${context}:`, error);

    // Show simple alert to user (non-intrusive, doesn't interfere with app)
    setTimeout(() => {
      alert('Something went wrong. Please contact support if this issue persists.');
    }, 100);

    return error;
  }

  // Handle unhandled promise rejections
  static handleUnhandledRejection(event) {
    console.error('Unhandled promise rejection:', event.reason, event.promise);

    // Show alert for unhandled errors
    setTimeout(() => {
      alert('An unexpected error occurred. Please contact support if this issue persists.');
    }, 100);

    // Prevent the default browser error handling
    event.preventDefault();
  }
}

// Transaction manager for handling blockchain transactions
export class TransactionManager {
  
  // Execute transaction with proper error handling and user feedback
  static async executeTransaction(
    contractMethod, 
    options = {}, 
    callbacks = {}
  ) {
    const {
      onStart = () => {},
      onSuccess = () => {},
      onError = () => {},
      onFinally = () => {}
    } = callbacks;
    
    let pendingNotification = null;
    
    try {
      onStart();
      
      // Show pending transaction notification
      pendingNotification = SimpleNotification.info('Transaction pending...', 0); // 0 = don't auto-close
      
      // Execute transaction
      const result = await contractMethod.send(options);
      
      // Remove pending notification
      if (pendingNotification && pendingNotification.parentNode) {
        pendingNotification.parentNode.removeChild(pendingNotification);
      }
      
      // Show success notification
      SimpleNotification.success('Transaction successful!');
      
      onSuccess(result);
      return result;
      
    } catch (error) {
      // Remove pending notification
      if (pendingNotification && pendingNotification.parentNode) {
        pendingNotification.parentNode.removeChild(pendingNotification);
      }
      
      // Handle different error types
      if (error.code === 4001) {
        SimpleNotification.error('Transaction cancelled by user');
      } else {
        ErrorHandler.handleTransactionError(error);
      }
      
      onError(error);
      throw error;
      
    } finally {
      onFinally();
    }
  }
  
  // Execute contract call (read-only) with error handling
  static async executeCall(contractMethod, options = {}) {
    try {
      return await contractMethod.call(options);
    } catch (error) {
      ErrorHandler.handleContractError(error, 'Contract call');
      throw error;
    }
  }
  
  // Estimate gas for transaction
  static async estimateGas(contractMethod, options = {}) {
    try {
      const gasEstimate = await contractMethod.estimateGas(options);
      // Add 20% buffer to gas estimate
      return Math.floor(gasEstimate * 1.2);
    } catch (error) {
      console.warn('Gas estimation failed, using default:', error);
      return 500000; // Default gas limit
    }
  }
}

// Validation utilities
export class ValidationUtils {
  
  // Validate Ethereum address
  static isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  // Validate amount (positive number)
  static isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  }
  
  // Validate transaction hash
  static isValidTxHash(hash) {
    if (!hash || typeof hash !== 'string') return false;
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }
  
  // Format address for display (truncate middle)
  static formatAddress(address, startChars = 6, endChars = 4) {
    if (!address || !this.isValidAddress(address)) return 'Invalid Address';
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }
  
  // Format large numbers with commas
  static formatNumber(number, decimals = 2) {
    if (isNaN(number)) return '0';
    return parseFloat(number).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
}

// Network utilities
export class NetworkUtils {
  
  // Check if user is on correct network
  static async checkNetwork(web3, expectedChainId) {
    try {
      const currentChainId = await web3.eth.getChainId();
      const expectedId = parseInt(expectedChainId, 16);
      
      if (currentChainId !== expectedId) {
        SimpleNotification.warning(`Please switch to the correct network (Chain ID: ${expectedId})`);
        return false;
      }
      
      return true;
    } catch (error) {
      ErrorHandler.handleNetworkError(error);
      return false;
    }
  }
  
  // Request network switch
  static async switchNetwork(chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      return true;
    } catch (error) {
      ErrorHandler.handleNetworkError(error);
      return false;
    }
  }
}

export default {
  ErrorHandler,
  TransactionManager,
  ValidationUtils,
  NetworkUtils,
  TX_STATUS
};
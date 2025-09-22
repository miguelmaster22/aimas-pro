/**
 * Enhanced CrowdFunding Component for Investment Management
 * 
 * IMPROVEMENTS MADE:
 * - Fixed memory leaks with proper interval cleanup
 * - Removed global variables and race conditions
 * - Enhanced error handling with user-friendly messages
 * - Added loading states and accessibility improvements
 * - Implemented proper form validation
 * - Enhanced security by removing XSS vulnerabilities
 * - Added responsive design improvements
 * - Optimized performance with debounced inputs
 */
import React, { Component } from "react";
import cons from "../../cons.js";
import { ErrorHandler, ValidationUtils, TransactionManager } from "../../utils/errorHandler";

const BigNumber = require("bignumber.js");

// Loading component
const LoadingSpinner = ({ size = "sm", message }) => (
  <div className="d-flex align-items-center justify-content-center">
    <div className={`spinner-border spinner-border-${size} me-2`} role="status" aria-hidden="true"></div>
    {message && <span className="sr-only">{message}</span>}
  </div>
);

// Modal component for better UX
const AlertModal = ({ show, title, body, onClose }) => {
  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-labelledby="alertModalLabel" aria-hidden="false">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="alertModalLabel">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>{body}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced CrowdFunding component with improved error handling and performance
 */
export default class CrowdFunding extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // Investment data
      min: 25,
      deposito: "Loading...",
      balance: "Loading...",
      currentAccount: this.props.currentAccount,
      porcentaje: "Loading...",
      dias: "Loading...",
      partner: "Loading...",
      balanceTRX: "Loading...",
      balanceUSDT: "Loading...",
      precioSITE: 1,
      valueUSDT: 1,
      valueUSDTResult: 25,
      planPrice: 25,
      hand: 0,
      balanceSite: 0,
      
      // User info
      id: "##",
      upline: "----------------------",
      
      // Modal state
      modal: {
        show: false,
        title: "",
        body: ""
      },
      
      // Loading and error states
      isLoading: true,
      isProcessing: false,
      error: null,
      
      // Form validation
      formErrors: {},
      
      // Migration state (removed global variable)
      isMigrating: false
    };

    // Bind methods
    this.deposit = this.deposit.bind(this);
    this.updateState = this.updateState.bind(this);
    this.handleChangeUSDT = this.handleChangeUSDT.bind(this);
    this.handleChangeUSDTResult = this.handleChangeUSDTResult.bind(this);
    this.migrate = this.migrate.bind(this);
    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.validateForm = this.validateForm.bind(this);
    
    // Store interval reference for cleanup
    this.updateInterval = null;
    this.initialTimeout = null;
    
    // Debounce timer for input changes
    this.inputDebounceTimer = null;
  }

  /**
   * Component lifecycle with proper cleanup
   */
  async componentDidMount() {
    // Initial state update immediately
    this.updateState();

    // Set up periodic updates every 10 seconds
    this.updateInterval = setInterval(() => {
      this.updateState();
    }, 10000);
  }

  /**
   * Cleanup intervals and timeouts
   */
  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.initialTimeout) {
      clearTimeout(this.initialTimeout);
      this.initialTimeout = null;
    }
    
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
      this.inputDebounceTimer = null;
    }
  }

  /**
   * Show modal with enhanced accessibility
   */
  showModal(title, body) {
    this.setState({
      modal: {
        show: true,
        title,
        body
      }
    });
  }

  /**
   * Hide modal
   */
  hideModal() {
    this.setState({
      modal: {
        show: false,
        title: "",
        body: ""
      }
    });
  }

  /**
   * Enhanced input handler with debouncing and validation
   */
  handleChangeUSDT(event) {
    const value = Math.max(1, parseInt(event.target.value) || 1);
    
    // Clear previous debounce timer
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
    }
    
    // Debounce the state update
    this.inputDebounceTimer = setTimeout(() => {
      this.setState({
        valueUSDT: value,
        valueUSDTResult: value * this.state.planPrice,
        formErrors: { ...this.state.formErrors, valueUSDT: null }
      });
    }, 300);
  }

  /**
   * Enhanced result input handler with validation
   */
  handleChangeUSDTResult(event) {
    let value = parseInt(event.target.value) || this.state.planPrice;
    
    // Ensure minimum value
    if (value < this.state.planPrice) {
      value = this.state.planPrice;
    }
    
    // Round to nearest plan price multiple
    const remainder = value % this.state.planPrice;
    if (remainder > 0) {
      value = remainder > this.state.planPrice / 2 
        ? value - remainder + this.state.planPrice
        : value - remainder;
    }

    // Clear previous debounce timer
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
    }
    
    // Debounce the state update
    this.inputDebounceTimer = setTimeout(() => {
      this.setState({
        valueUSDTResult: value,
        valueUSDT: value / this.state.planPrice,
        formErrors: { ...this.state.formErrors, valueUSDTResult: null }
      });
    }, 300);
  }

  /**
   * Validate form inputs
   */
  validateForm() {
    const errors = {};
    
    if (!ValidationUtils.isValidAmount(this.state.valueUSDT)) {
      errors.valueUSDT = "Please enter a valid amount";
    }
    
    if (this.state.valueUSDT < 1) {
      errors.valueUSDT = "Minimum investment is 1 contract";
    }
    
    if (this.state.balanceSite < this.state.valueUSDTResult) {
      errors.balance = `Insufficient balance. Required: ${this.state.valueUSDTResult} USDT, Available: ${this.state.balanceSite} USDT`;
    }
    
    this.setState({ formErrors: errors });
    return Object.keys(errors).length === 0;
  }

  /**
   * Enhanced state update with comprehensive error handling
   */
  async updateState() {
    try {
      this.setState({ isLoading: true, error: null });

      if (!this.props.contract?.binaryProxy || !this.props.currentAccount) {
        throw new Error("Contract or account not available");
      }

      const accountAddress = this.props.currentAccount;
      
      // Update wallet display with security improvements
      this.updateWalletDisplay(accountAddress);
      
      // Fetch contract data
      const contractData = await this.fetchContractData(accountAddress);
      
      // Process investor data
      const investorData = await this.processInvestorData(accountAddress);
      
      // Update partner information
      const partnerInfo = await this.getPartnerInfo(accountAddress, investorData.registered);
      
      // Get plan pricing
      const planPrice = await this.getPlanPrice();
      
      this.setState({
        ...contractData,
        ...investorData,
        ...partnerInfo,
        planPrice,
        isLoading: false,
        currentAccount: accountAddress
      });

      // Update investor-specific data if available
      if (this.props.investor?.registered) {
        this.setState({
          id: this.props.investor.id || "##",
          upline: this.props.investor.upline || "----------------------"
        });
      }

    } catch (error) {
      console.error("State update error:", error);
      this.setState({
        error: ErrorHandler.parseError(error),
        isLoading: false
      });
    }
  }

  /**
   * Update wallet display with XSS protection
   */
  updateWalletDisplay(accountAddress) {
    const walletElement = document.getElementById("login-my-wallet");
    const linkElement = document.getElementById("login");
    
    if (walletElement && linkElement) {
      const formattedAddress = ValidationUtils.formatAddress(accountAddress);
      
      // Use textContent instead of innerHTML to prevent XSS
      walletElement.textContent = formattedAddress;
      linkElement.href = `https://bscscan.com/address/${accountAddress}`;
    }
  }

  /**
   * Fetch contract data with parallel requests
   */
  async fetchContractData(accountAddress) {
    const [
      nameToken1,
      allowance,
      decimals,
      balance,
      tiempo,
      porcentaje
    ] = await Promise.all([
      this.props.contract.contractToken.methods.symbol().call({ from: accountAddress }),
      this.props.contract.contractToken.methods.allowance(accountAddress, this.props.contract.binaryProxy._address).call({ from: accountAddress }),
      this.props.contract.contractToken.methods.decimals().call({ from: accountAddress }),
      this.props.contract.contractToken.methods.balanceOf(accountAddress).call({ from: accountAddress }),
      this.props.contract.binaryProxy.methods.tiempo().call({ from: accountAddress }),
      this.props.contract.binaryProxy.methods.porcent().call({ from: accountAddress })
    ]);

    const balanceFormatted = new BigNumber(balance).shiftedBy(-decimals).toNumber();
    
    return {
      nameToken1,
      decimales: decimals,
      balanceSite: balanceFormatted,
      balanceUSDT: balanceFormatted,
      dias: tiempo,
      porcentaje: parseInt(porcentaje),
      allowance: new BigNumber(allowance).shiftedBy(-18).toNumber()
    };
  }

  /**
   * Process investor data
   */
  async processInvestorData(accountAddress) {
    const inversors = await this.props.contract.binaryProxy.methods
      .investors(accountAddress)
      .call({ from: accountAddress });

    let depositoText = "Allow wallet";
    
    if (this.state.allowance > 0) {
      depositoText = inversors.registered ? "Buy Plan" : "Register";
    }

    // Check if plan needs update
    const tiempo = await this.props.contract.binaryProxy.methods
      .tiempo()
      .call({ from: accountAddress });

    const timeProgress = ((Date.now() - 1000) * 100) / (tiempo * 1000);
    
    if (timeProgress < 100 && inversors.registered) {
      depositoText = "Update Plan";
    }

    return {
      deposito: depositoText,
      balance: inversors.plan ? inversors.plan / 10 ** 8 : 0,
      investorNew: inversors
    };
  }

  /**
   * Get partner information with enhanced URL parsing
   */
  async getPartnerInfo(accountAddress, isRegistered) {
    if (isRegistered) {
      const partner = await this.props.contract.binaryProxy.methods
        .padre(accountAddress)
        .call({ from: accountAddress });

      if (partner !== "0x0000000000000000000000000000000000000000") {
        const partnerUpline = await this.props.contract.binaryProxy.methods
          .upline(accountAddress)
          .call();

        const side = parseInt(partnerUpline._lado);
        const sideText = side === 0 ? "Left" : side === 1 ? "Right" : "";
        
        return {
          partner: sideText ? `${sideText} of ${ValidationUtils.formatAddress(partner)}` : ValidationUtils.formatAddress(partner),
          hand: side
        };
      }
      
      return { partner: "Direct registration", hand: 0 };
    }

    // Parse URL for referral information
    return this.parseReferralFromUrl(accountAddress);
  }

  /**
   * Parse referral information from URL with enhanced security
   */
  async parseReferralFromUrl(accountAddress) {
    try {
      const url = new URL(window.location.href);
      const refParam = url.searchParams.get('ref');
      const handParam = url.searchParams.get('hand');
      
      if (!refParam) {
        return { partner: cons.WS, hand: 0 };
      }

      // Validate and get wallet from ID
      const wallet = await this.props.contract.binaryProxy.methods
        .idToAddress(refParam)
        .call({ from: accountAddress });

      if (!ValidationUtils.isValidAddress(wallet)) {
        return { partner: cons.WS, hand: 0 };
      }

      // Check if referrer is registered
      const referrerData = await this.props.contract.binaryProxy.methods
        .investors(wallet)
        .call({ from: accountAddress });

      if (!referrerData.registered) {
        return { partner: cons.WS, hand: 0 };
      }

      const hand = handParam === "right" ? 1 : 0;
      const handText = hand === 1 ? "Right" : "Left";
      
      return {
        partner: `${handText} of ${ValidationUtils.formatAddress(wallet)}`,
        hand
      };

    } catch (error) {
      console.warn("URL parsing error:", error);
      return { partner: cons.WS, hand: 0 };
    }
  }

  /**
   * Get plan price
   */
  async getPlanPrice() {
    try {
      const planPrice = await this.props.contract.binaryProxy.methods
        .plan()
        .call({ from: this.props.currentAccount });
      
      return new BigNumber(planPrice).shiftedBy(-18).toNumber();
    } catch (error) {
      console.warn("Plan price fetch error:", error);
      return 25; // Default plan price
    }
  }

  /**
   * Enhanced deposit function with comprehensive validation and error handling
   */
  async deposit() {
    try {
      // Check if in view mode
      if (this.props.view) {
        this.showModal("ALERT!", "This is view-only mode. Transactions are not allowed.");
        return;
      }

      // Validate form
      if (!this.validateForm()) {
        this.showModal("Validation Error", "Please correct the form errors and try again.");
        return;
      }

      this.setState({ isProcessing: true });

      const { balanceSite, valueUSDT, balance } = this.state;
      
      // Check allowance
      const allowance = await this.props.contract.contractToken.methods
        .allowance(this.props.currentAccount, this.props.contract.binaryProxy._address)
        .call({ from: this.props.currentAccount });

      const allowanceFormatted = new BigNumber(allowance).shiftedBy(-18).toNumber();

      // Request approval if needed
      if (allowanceFormatted <= 10000) {
        await this.requestApproval();
        return; // Exit and let user try again after approval
      }

      // Calculate required amount
      const planPrice = await this.props.contract.binaryProxy.methods
        .plan()
        .call({ from: this.props.currentAccount });
      
      const planPriceFormatted = new BigNumber(planPrice).shiftedBy(-18).toNumber();
      const requiredAmount = (planPriceFormatted * valueUSDT) - balance;

      // Check balance
      if (balanceSite < requiredAmount) {
        this.showModal(
          "Insufficient Balance",
          `You need ${requiredAmount.toFixed(2)} USDT but only have ${balanceSite.toFixed(2)} USDT in your wallet.`
        );
        return;
      }

      // Process registration or investment
      await this.processInvestment(valueUSDT);

    } catch (error) {
      console.error("Deposit error:", error);
      this.showModal("Transaction Error", ErrorHandler.parseError(error));
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  /**
   * Request token approval
   */
  async requestApproval() {
    try {
      await TransactionManager.executeTransaction(
        this.props.contract.contractToken.methods.approve(
          this.props.contract.binaryProxy._address,
          "115792089237316195423570985008687907853269984665640564039457584007913129639935"
        ),
        { from: this.props.currentAccount },
        {
          onSuccess: () => {
            this.showModal("Success", "Token approval successful! You can now proceed with your investment.");
            this.updateState(); // Refresh state
          },
          onError: (error) => {
            this.showModal("Approval Failed", ErrorHandler.parseError(error));
          }
        }
      );
    } catch (error) {
      console.error("Approval error:", error);
    }
  }

  /**
   * Process investment with registration if needed
   */
  async processInvestment(valueUSDT) {
    const investors = await this.props.contract.binaryProxy.methods
      .investors(this.props.currentAccount)
      .call({ from: this.props.currentAccount });

    // Handle registration
    if (!investors.registered) {
      await this.handleRegistration();
    }

    // Validate leveling for investment
    const leveling = await this.props.contract.binaryProxy.methods
      .leveling(this.props.currentAccount)
      .call({ from: this.props.currentAccount });

    if (parseInt(leveling) < 1) {
      this.showModal("Investment Error", "You need proper authorization level to make investments.");
      return;
    }

    // Execute investment
    await TransactionManager.executeTransaction(
      this.props.contract.binaryProxy.methods.buyPlan(valueUSDT),
      { from: this.props.currentAccount },
      {
        onSuccess: (_result) => {
          this.showModal("Success!", "Congratulations! Your investment was successful.");
          this.updateState(); // Refresh state
          
          // Scroll to services section
          const servicesElement = document.getElementById("services");
          if (servicesElement) {
            servicesElement.scrollIntoView({ block: "start", behavior: "smooth" });
          }
        },
        onError: (error) => {
          this.showModal("Investment Failed", ErrorHandler.parseError(error));
        }
      }
    );
  }

  /**
   * Handle user registration
   */
  async handleRegistration() {
    const referralInfo = await this.parseReferralFromUrl(this.props.currentAccount);
    
    if (referralInfo.partner === cons.WS) {
      this.showModal("Registration Required", "You need a valid referral link to register.");
      throw new Error("No valid referral");
    }

    // Get sponsor wallet
    const url = new URL(window.location.href);
    const refParam = url.searchParams.get('ref');
    
    const sponsorWallet = await this.props.contract.binaryProxy.methods
      .idToAddress(refParam)
      .call({ from: this.props.currentAccount });

    // Validate sponsor
    const sponsorData = await this.props.contract.binaryProxy.methods
      .investors(sponsorWallet)
      .call({ from: this.props.currentAccount });

    if (!sponsorData.registered) {
      this.showModal("Registration Error", "Your referrer must be registered to proceed.");
      throw new Error("Invalid sponsor");
    }

    // Execute registration
    await TransactionManager.executeTransaction(
      this.props.contract.binaryProxy.methods.registro(sponsorWallet, referralInfo.hand),
      { from: this.props.currentAccount },
      {
        onSuccess: () => {
          this.showModal("Welcome!", "Registration successful! You can now make investments.");
        },
        onError: (error) => {
          this.showModal("Registration Failed", ErrorHandler.parseError(error));
          throw error;
        }
      }
    );
  }

  /**
   * Enhanced migrate function with proper state management
   */
  async migrate(wallet) {
    if (this.state.isMigrating) {
      this.showModal("Please Wait", "Migration is already in progress. Please try again later.");
      return;
    }

    if (!ValidationUtils.isValidAddress(wallet)) {
      this.showModal("Invalid Address", "Please enter a valid wallet address.");
      return;
    }

    if (this.props.view) {
      this.showModal("ALERT!", "This is view-only mode. Migrations are not allowed.");
      return;
    }

    try {
      this.setState({ isMigrating: true });

      const response = await fetch(`${cons.API}usuario/actualizar/?wallet=${wallet}`);
      
      if (!response.ok) {
        throw new Error(`Migration request failed: ${response.status}`);
      }

      this.showModal("Success", "Migration request submitted successfully.");

    } catch (error) {
      console.error("Migration error:", error);
      this.showModal("Migration Failed", ErrorHandler.parseError(error));
    } finally {
      this.setState({ isMigrating: false });
    }
  }

  /**
   * Enhanced render method with improved accessibility and loading states
   */
  render() {
    const { isLoading, isProcessing, error, modal, formErrors } = this.state;

    return (
      <>
        <div className="container">
          <div className="row">
            {/* User Information Section */}
            <div className="col-lg-6 col-md-6">
              <div className="icon-box" data-aos="zoom-in-left">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-person" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                
                <h4 className="title">
                  <a href="#User" aria-describedby="user-info">User ID: {this.state.id}</a>
                </h4>
                
                <div className="description" id="user-info">
                  <p>
                    <strong>Wallet:</strong>{" "}
                    <span style={{ wordWrap: "break-word" }} aria-label="Wallet address">
                      {ValidationUtils.formatAddress(this.state.currentAccount)}
                    </span>
                  </p>
                  
                  <p>
                    <strong>USDT Balance:</strong>{" "}
                    <span aria-label={`Balance: ${this.state.balanceSite} USDT`}>
                      {ValidationUtils.formatNumber(this.state.balanceSite, 2)}
                    </span>
                  </p>
                  
                  <p>
                    <strong>Partner:</strong>{" "}
                    <span style={{ wordWrap: "break-word" }}>
                      {this.state.partner}
                    </span>
                  </p>
                  
                  <p>
                    <strong>Upline:</strong>{" "}
                    <span style={{ wordWrap: "break-word" }}>
                      {this.state.upline}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Investment Section */}
            <div className="col-lg-6 col-md-6">
              <div className="icon-box" data-aos="zoom-in-left">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-currency-dollar" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                
                <h4 className="title text-center">
                  <a href="#Invest">Investment Calculator</a>
                </h4>
                
                <div className="description text-center">
                  <p><strong>Contract / USDT</strong></p>
                  
                  {/* Investment Form */}
                  <form onSubmit={(e) => { e.preventDefault(); this.deposit(); }} aria-label="Investment form">
                    <div className="mb-3">
                      <label htmlFor="contracts-input" className="form-label sr-only">
                        Number of contracts
                      </label>
                      <input
                        id="contracts-input"
                        type="number"
                        min="1"
                        value={this.state.valueUSDT}
                        step="1"
                        onChange={this.handleChangeUSDT}
                        className={`form-control ${formErrors.valueUSDT ? 'is-invalid' : ''}`}
                        aria-describedby="contracts-help"
                        disabled={isLoading || isProcessing}
                      />
                      <div id="contracts-help" className="form-text">
                        Number of contracts to purchase
                      </div>
                      {formErrors.valueUSDT && (
                        <div className="invalid-feedback">{formErrors.valueUSDT}</div>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <span aria-hidden="true"> = </span>
                      <label htmlFor="usdt-input" className="form-label sr-only">
                        USDT amount
                      </label>
                      <input
                        id="usdt-input"
                        type="number"
                        value={this.state.valueUSDTResult}
                        step={this.state.planPrice}
                        onChange={this.handleChangeUSDTResult}
                        className={`form-control ${formErrors.valueUSDTResult ? 'is-invalid' : ''}`}
                        aria-describedby="usdt-help"
                        disabled={isLoading || isProcessing}
                      />
                      <div id="usdt-help" className="form-text">
                        Total USDT amount
                      </div>
                      {formErrors.valueUSDTResult && (
                        <div className="invalid-feedback">{formErrors.valueUSDTResult}</div>
                      )}
                    </div>
                    
                    {/* Balance Error */}
                    {formErrors.balance && (
                      <div className="alert alert-warning" role="alert">
                        {formErrors.balance}
                      </div>
                    )}
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-success btn-lg"
                      disabled={isLoading || isProcessing || Object.keys(formErrors).length > 0}
                      aria-describedby="submit-help"
                    >
                      {isProcessing ? (
                        <LoadingSpinner message="Processing..." />
                      ) : (
                        this.state.deposito
                      )}
                    </button>
                    
                    <div id="submit-help" className="form-text mt-2">
                      {isProcessing ? "Please wait while we process your transaction..." : "Click to proceed with investment"}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Modal */}
        <AlertModal
          show={modal.show}
          title={modal.title}
          body={modal.body}
          onClose={this.hideModal}
        />

        {/* Loading Indicator - Non-blocking */}
        {isLoading && (
          <div className="alert alert-info mt-3" role="status" aria-live="polite">
            <div className="d-flex align-items-center">
              <LoadingSpinner size="sm" message="Loading investment data..." />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            <h6>⚠️ Error Loading Data</h6>
            <p>{error}</p>
            <button className="btn btn-outline-danger btn-sm" onClick={() => this.setState({ error: null })}>
              Dismiss
            </button>
          </div>
        )}
      </>
    );
  }
}

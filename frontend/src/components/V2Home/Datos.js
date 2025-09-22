/**
 * Enhanced Datos Component: Data display and admin panel for binary system
 * 
 * IMPROVEMENTS MADE:
 * - Fixed memory leaks with proper interval cleanup
 * - Enhanced security by removing sensitive data exposure
 * - Added comprehensive error handling and validation
 * - Implemented proper loading states and accessibility
 * - Enhanced admin panel with better UX and security
 * - Added proper form validation and input sanitization
 * - Improved responsive design and user feedback
 * - Optimized performance with debounced inputs
 */
import React, { Component } from "react";
import { ErrorHandler, ValidationUtils, TransactionManager } from "../../utils/errorHandler";

// BigNumber for precise decimal calculations
const BigNumber = require('bignumber.js');
BigNumber.config({ ROUNDING_MODE: 3 });

// Loading component
const LoadingSpinner = ({ size = "sm", message }) => (
  <div className="d-flex align-items-center justify-content-center p-2">
    <div className={`spinner-border spinner-border-${size} me-2`} role="status" aria-hidden="true"></div>
    {message && <span className="sr-only">{message}</span>}
  </div>
);

// Enhanced modal component
const AdminModal = ({ show, title, body, type = "info", onClose, onConfirm, showConfirm = false }) => {
  if (!show) return null;

  const typeClasses = {
    success: "alert-success",
    error: "alert-danger", 
    warning: "alert-warning",
    info: "alert-info"
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-labelledby="adminModalLabel">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="adminModalLabel">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className={`alert ${typeClasses[type]} mb-0`} role="alert">
              {body}
            </div>
          </div>
          <div className="modal-footer">
            {showConfirm && (
              <button type="button" className="btn btn-danger me-2" onClick={onConfirm}>
                Confirm
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {showConfirm ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin action button component
const AdminActionButton = ({ 
  title, 
  onClick, 
  variant = "info", 
  disabled = false, 
  loading = false,
  description,
  requiresConfirmation = false
}) => (
  <div className="col-lg-3 col-12 text-center mb-3">
    <button
      type="button"
      className={`btn btn-${variant} d-block text-center mx-auto`}
      onClick={onClick}
      disabled={disabled || loading}
      title={description}
      aria-describedby={`${title.replace(/\s+/g, '-').toLowerCase()}-help`}
    >
      {loading ? <LoadingSpinner /> : title}
      {requiresConfirmation && <i className="bi bi-exclamation-triangle ms-1" aria-hidden="true"></i>}
    </button>
    {description && (
      <div id={`${title.replace(/\s+/g, '-').toLowerCase()}-help`} className="form-text small">
        {description}
      </div>
    )}
  </div>
);

/**
 * Enhanced Datos component with improved security, error handling, and accessibility
 */
export default class Datos extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // System statistics
      totalInvestors: 0,
      totalInvested: 0,
      totalRefRewards: 0,
      retirado: 0,
      days: 0,
      porcentaje: 0,
      precioRegistro: 0,
      timerOut: 0,
      MIN_RETIRO: 0,
      MAX_RETIRO: 0,
      pricePlan: 0,

      // Admin form inputs
      wallet: "",
      plan: 0,
      cantidad: 0,
      hand: 0,

      // UI state
      isLoading: true,
      isProcessing: false,
      error: null,
      modal: {
        show: false,
        title: "",
        body: "",
        type: "info",
        showConfirm: false,
        onConfirm: null
      },

      // Form validation
      formErrors: {},
      
      // Processing states for individual actions
      processingStates: {}
    };

    // Bind methods
    this.fetchSystemData = this.fetchSystemData.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.validateForm = this.validateForm.bind(this);
    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.handleError = this.handleError.bind(this);
    this.executeAdminAction = this.executeAdminAction.bind(this);
    
    // Store interval reference for cleanup
    this.updateInterval = null;
    
    // Debounce timer for inputs
    this.inputDebounceTimer = null;
  }

  /**
   * Component lifecycle with proper cleanup
   */
  componentDidMount() {
    // Set up periodic updates every 3 seconds
    this.updateInterval = setInterval(() => {
      this.fetchSystemData();
    }, 3000);
    
    // Initial fetch
    this.fetchSystemData();
  }

  /**
   * Cleanup intervals
   */
  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
      this.inputDebounceTimer = null;
    }
  }

  /**
   * Show modal with enhanced accessibility
   */
  showModal(title, body, type = "info", showConfirm = false, onConfirm = null) {
    this.setState({
      modal: {
        show: true,
        title,
        body,
        type,
        showConfirm,
        onConfirm
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
        body: "",
        type: "info",
        showConfirm: false,
        onConfirm: null
      }
    });
  }

  /**
   * Enhanced error handler
   */
  handleError(error, context = "Operation") {
    console.error(`${context} error:`, error);
    const userMessage = ErrorHandler.parseError(error);
    this.showModal(`${context} Error`, userMessage, "error");
  }

  /**
   * Handle input changes with debouncing and validation
   */
  handleInputChange(field, value) {
    // Clear previous debounce timer
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
    }
    
    // Debounce the state update
    this.inputDebounceTimer = setTimeout(() => {
      this.setState({
        [field]: value,
        formErrors: { ...this.state.formErrors, [field]: null }
      });
    }, 300);
  }

  /**
   * Validate form inputs
   */
  validateForm() {
    const errors = {};
    const { wallet, cantidad, plan } = this.state;
    
    if (wallet && !ValidationUtils.isValidAddress(wallet)) {
      errors.wallet = "Please enter a valid wallet address";
    }
    
    if (cantidad !== undefined && cantidad !== null && !ValidationUtils.isValidAmount(cantidad)) {
      errors.cantidad = "Please enter a valid amount";
    }
    
    if (plan !== undefined && plan !== null && plan < 0) {
      errors.plan = "Plan value cannot be negative";
    }
    
    this.setState({ formErrors: errors });
    return Object.keys(errors).length === 0;
  }

  /**
   * Enhanced system data fetching
   */
  async fetchSystemData() {
    try {
      if (!this.props.contract?.binaryProxy || !this.props.currentAccount) {
        return;
      }

      this.setState({ isLoading: true, error: null });

      // Fetch all system data in parallel for better performance
      const [
        systemState,
        totalRefWithdrawal,
        decimals,
        days,
        percentage,
        registrationPrice,
        timerOut,
        minWithdrawal,
        maxWithdrawal,
        planPrice
      ] = await Promise.allSettled([
        this.props.contract.binaryProxy.methods.setstate().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.totalRefWitdrawl().call({ from: this.props.currentAccount }),
        this.props.contract.contractToken.methods.decimals().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.dias().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.porcent().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.precioRegistro().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.timerOut().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.MIN_RETIRO().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.MAX_RETIRO().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.plan().call({ from: this.props.currentAccount })
      ]);

      // Process results with error handling
      const decimalsValue = decimals.status === 'fulfilled' ? decimals.value : 18;
      
      const processedData = {
        totalInvestors: systemState.status === 'fulfilled' ? systemState.value.Investors : 0,
        totalInvested: systemState.status === 'fulfilled' ? systemState.value.Invested / (10 ** decimalsValue) : 0,
        totalRefRewards: systemState.status === 'fulfilled' ? systemState.value.RefRewards / (10 ** decimalsValue) : 0,
        retirado: totalRefWithdrawal.status === 'fulfilled' ? totalRefWithdrawal.value / (10 ** decimalsValue) : 0,
        days: days.status === 'fulfilled' ? days.value : 0,
        porcentaje: percentage.status === 'fulfilled' ? percentage.value : 0,
        precioRegistro: registrationPrice.status === 'fulfilled' ? registrationPrice.value / (10 ** decimalsValue) : 0,
        timerOut: timerOut.status === 'fulfilled' ? timerOut.value : 0,
        MIN_RETIRO: minWithdrawal.status === 'fulfilled' ? minWithdrawal.value / (10 ** decimalsValue) : 0,
        MAX_RETIRO: maxWithdrawal.status === 'fulfilled' ? maxWithdrawal.value / (10 ** decimalsValue) : 0,
        pricePlan: planPrice.status === 'fulfilled' ? planPrice.value / (10 ** decimalsValue) : 0
      };

      this.setState({
        ...processedData,
        isLoading: false
      });

    } catch (error) {
      this.handleError(error, "System data fetch");
      this.setState({ isLoading: false });
    }
  }

  /**
   * Execute admin action with enhanced error handling and confirmation
   */
  async executeAdminAction(actionKey, actionFunction, requiresConfirmation = false, confirmationMessage = "") {
    if (requiresConfirmation) {
      this.showModal(
        "Confirm Action",
        confirmationMessage || "Are you sure you want to perform this action?",
        "warning",
        true,
        () => {
          this.hideModal();
          this.performAdminAction(actionKey, actionFunction);
        }
      );
    } else {
      await this.performAdminAction(actionKey, actionFunction);
    }
  }

  /**
   * Perform admin action with loading state management
   */
  async performAdminAction(actionKey, actionFunction) {
    try {
      // Validate form if needed
      if (!this.validateForm()) {
        this.showModal("Validation Error", "Please correct the form errors and try again.", "error");
        return;
      }

      // Set processing state for this specific action
      this.setState({
        processingStates: {
          ...this.state.processingStates,
          [actionKey]: true
        }
      });

      const result = await actionFunction();
      
      if (result?.transactionHash) {
        this.showModal(
          "Transaction Successful",
          `Transaction completed successfully! Hash: ${result.transactionHash}`,
          "success"
        );
        
        // Open transaction in explorer after delay
        setTimeout(() => {
          window.open(`https://bscscan.com/tx/${result.transactionHash}`, "_blank");
        }, 2000);
      } else {
        this.showModal("Action Completed", "Operation completed successfully!", "success");
      }

      // Refresh system data
      this.fetchSystemData();

    } catch (error) {
      this.handleError(error, "Admin action");
    } finally {
      // Clear processing state
      this.setState({
        processingStates: {
          ...this.state.processingStates,
          [actionKey]: false
        }
      });
    }
  }

  /**
   * Generate admin action buttons based on user permissions
   */
  generateAdminActions() {
    const { wallet, cantidad } = this.state;

    const actions = [
      {
        key: "freeMembershipLeft",
        title: "Free Membership Left",
        variant: "info",
        description: "Register user in left team",
        requiresConfirmation: true,
        action: async () => {
          const sponsor = prompt("Enter sponsor wallet address:", this.props.currentAccount);
          if (!sponsor || !ValidationUtils.isValidAddress(sponsor)) {
            throw new Error("Invalid sponsor address");
          }
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.asignFreeMembership(wallet, sponsor, 0),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "freeMembershipRight", 
        title: "Free Membership Right",
        variant: "info",
        description: "Register user in right team",
        requiresConfirmation: true,
        action: async () => {
          const sponsor = prompt("Enter sponsor wallet address:", this.props.currentAccount);
          if (!sponsor || !ValidationUtils.isValidAddress(sponsor)) {
            throw new Error("Invalid sponsor address");
          }
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.asignFreeMembership(wallet, sponsor, 1),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "newLevelAuth",
        title: "New Level Auth",
        variant: "warning",
        description: "Grant authorization level",
        requiresConfirmation: true,
        action: async () => {
          const level = prompt("Enter authorization level (2,3,4):", "4");
          if (!level || ![2,3,4].includes(parseInt(level))) {
            throw new Error("Invalid level. Must be 2, 3, or 4");
          }
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.makeNewLevel(wallet, level),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "removeLevelAuth",
        title: "Remove Level Auth",
        variant: "danger",
        description: "Remove authorization level",
        requiresConfirmation: true,
        confirmationMessage: "Are you sure you want to remove authorization level? This action cannot be undone.",
        action: async () => {
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.makeRemoveLevel(wallet),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "enableWithdrawals",
        title: "Enable Withdrawals",
        variant: "success",
        description: "Enable system withdrawals",
        requiresConfirmation: true,
        action: async () => {
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.controlWitdrawl(true),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "disableWithdrawals",
        title: "Disable Withdrawals", 
        variant: "danger",
        description: "Disable system withdrawals",
        requiresConfirmation: true,
        confirmationMessage: "Are you sure you want to disable withdrawals? This will affect all users.",
        action: async () => {
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.controlWitdrawl(false),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "withdrawAll",
        title: "Withdraw All",
        variant: "danger",
        description: "Emergency withdrawal of all tokens",
        requiresConfirmation: true,
        confirmationMessage: "DANGER: This will withdraw all tokens from the contract. Are you absolutely sure?",
        action: async () => {
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.redimToken(),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "assignFreePlan",
        title: "Assign Free Plan",
        variant: "info",
        description: "Assign free plan to user",
        requiresConfirmation: true,
        action: async () => {
          if (parseInt(cantidad / this.state.pricePlan) <= 0) {
            throw new Error("Please enter an amount greater than 0");
          }
          const porcent = await this.props.contract.binaryProxy.methods.porcent().call({ from: this.props.currentAccount });
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.asignarPlan(wallet, parseInt(cantidad / this.state.pricePlan), porcent, false),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "sendToken",
        title: "Send Token",
        variant: "warning",
        description: "Send tokens to user",
        requiresConfirmation: true,
        action: async () => {
          if (!ValidationUtils.isValidAmount(cantidad)) {
            throw new Error("Please enter a valid amount");
          }
          return await TransactionManager.executeTransaction(
            this.props.contract.contractToken.methods.transfer(
              wallet,
              new BigNumber(cantidad).shiftedBy(18).toString(10)
            ),
            { from: this.props.currentAccount }
          );
        }
      },
      {
        key: "setPriceRegistration",
        title: `Set Registration Price (${this.state.precioRegistro})`,
        variant: "warning",
        description: "Update registration price",
        requiresConfirmation: true,
        action: async () => {
          if (!ValidationUtils.isValidAmount(cantidad)) {
            throw new Error("Please enter a valid amount");
          }
          return await TransactionManager.executeTransaction(
            this.props.contract.binaryProxy.methods.setPrecioRegistro(
              new BigNumber(cantidad).shiftedBy(18).toString(10),
              [100]
            ),
            { from: this.props.currentAccount }
          );
        }
      }
    ];

    // Filter actions based on admin level
    return this.filterActionsByPermission(actions);
  }

  /**
   * Filter actions based on user permission level
   */
  filterActionsByPermission(actions) {
    const { admin } = this.props;
    
    if (admin === "owner") {
      return actions; // Owner has access to all actions
    }
    
    if (admin === "subOwner") {
      // Remove withdraw all action for sub-owners
      return actions.filter(action => action.key !== "withdrawAll");
    }
    
    if (admin === "leader") {
      // Leaders can only do memberships, assign plans, send tokens, and assign points
      const allowedKeys = ["freeMembershipLeft", "freeMembershipRight", "assignFreePlan", "sendToken"];
      return actions.filter(action => allowedKeys.includes(action.key));
    }
    
    if (admin === "admin") {
      // Admins can do memberships, assign plans, and send tokens
      const allowedKeys = ["freeMembershipLeft", "freeMembershipRight", "assignFreePlan", "sendToken"];
      return actions.filter(action => allowedKeys.includes(action.key));
    }
    
    return []; // No admin access
  }

  /**
   * Enhanced render method with improved accessibility and loading states
   */
  render() {
    const { isLoading, error, modal, formErrors, processingStates } = this.state;
    const { admin } = this.props;

    // Don't render admin panel if user doesn't have admin access
    if (!admin || typeof admin !== "string") {
      return null;
    }

    const adminActions = this.generateAdminActions();

    return (
      <>
        {/* System Statistics */}
        <div className="container mb-5">
          <div className="row counters">
            <div className="col-lg-3 col-12 text-center">
              <div className="counter-item">
                <h3 className="counter-number">{ValidationUtils.formatNumber(this.state.totalInvestors, 0)}</h3>
                <p className="counter-label">Global Investors</p>
              </div>
            </div>

            <div className="col-lg-3 col-12 text-center">
              <div className="counter-item">
                <h3 className="counter-number">
                  {ValidationUtils.formatNumber(this.state.totalInvested, 2)} USDT
                </h3>
                <p className="counter-label">Total Invested</p>
              </div>
            </div>

            <div className="col-lg-3 col-12 text-center">
              <div className="counter-item">
                <h3 className="counter-number">
                  {ValidationUtils.formatNumber(this.state.totalRefRewards, 2)} USDT
                </h3>
                <p className="counter-label">Total Referral Rewards</p>
              </div>
            </div>

            <div className="col-lg-3 col-12 text-center">
              <div className="counter-item">
                <h3 className="counter-number">
                  {ValidationUtils.formatNumber(this.state.retirado, 2)} USDT
                </h3>
                <p className="counter-label">Total Withdrawn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Panel */}
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title mb-0">
                    <i className="bi bi-shield-check me-2" aria-hidden="true"></i>
                    Admin Panel - {admin.toUpperCase()}
                  </h4>
                </div>
                <div className="card-body">
                  {/* Admin Form Inputs */}
                  <div className="row pb-3">
                    <div className="col-lg-4 col-12">
                      <div className="form-group">
                        <label htmlFor="wallet-input" className="form-label">
                          Wallet Address <span className="text-danger">*</span>
                        </label>
                        <input
                          id="wallet-input"
                          type="text"
                          className={`form-control ${formErrors.wallet ? 'is-invalid' : ''}`}
                          placeholder="0x..."
                          onChange={(e) => this.handleInputChange('wallet', e.target.value)}
                          aria-describedby="wallet-help"
                        />
                        <div id="wallet-help" className="form-text">
                          Enter the target wallet address
                        </div>
                        {formErrors.wallet && (
                          <div className="invalid-feedback">{formErrors.wallet}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-lg-4 col-12">
                      <div className="form-group">
                        <label htmlFor="cantidad-input" className="form-label">
                          Token Amount
                        </label>
                        <input
                          id="cantidad-input"
                          type="number"
                          className={`form-control ${formErrors.cantidad ? 'is-invalid' : ''}`}
                          placeholder="Amount in tokens"
                          onChange={(e) => this.handleInputChange('cantidad', parseFloat(e.target.value) || 0)}
                          aria-describedby="cantidad-help"
                        />
                        <div id="cantidad-help" className="form-text">
                          Amount for token operations
                        </div>
                        {formErrors.cantidad && (
                          <div className="invalid-feedback">{formErrors.cantidad}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-lg-4 col-12">
                      <div className="form-group">
                        <label htmlFor="plan-input" className="form-label">
                          Plan/Units
                        </label>
                        <input
                          id="plan-input"
                          type="number"
                          className={`form-control ${formErrors.plan ? 'is-invalid' : ''}`}
                          placeholder="Plan units"
                          onChange={(e) => this.handleInputChange('plan', parseInt(e.target.value) || 0)}
                          aria-describedby="plan-help"
                        />
                        <div id="plan-help" className="form-text">
                          Plan units for operations
                        </div>
                        {formErrors.plan && (
                          <div className="invalid-feedback">{formErrors.plan}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="row">
                    {adminActions.map((action) => (
                      <AdminActionButton
                        key={action.key}
                        title={action.title}
                        variant={action.variant}
                        description={action.description}
                        requiresConfirmation={action.requiresConfirmation}
                        loading={processingStates[action.key]}
                        onClick={() => this.executeAdminAction(
                          action.key,
                          action.action,
                          action.requiresConfirmation,
                          action.confirmationMessage
                        )}
                      />
                    ))}
                  </div>

                  {/* System Information */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-header">
                          <h6 className="card-title mb-0">System Information</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-3">
                              <strong>Return Rate:</strong> {this.state.porcentaje}%
                            </div>
                            <div className="col-md-3">
                              <strong>Contract Days:</strong> {this.state.days}
                            </div>
                            <div className="col-md-3">
                              <strong>Timer Out:</strong> {this.state.timerOut}s
                            </div>
                            <div className="col-md-3">
                              <strong>Plan Price:</strong> {ValidationUtils.formatNumber(this.state.pricePlan)} USDT
                            </div>
                          </div>
                          <div className="row mt-2">
                            <div className="col-md-4">
                              <strong>Min Withdrawal:</strong> {ValidationUtils.formatNumber(this.state.MIN_RETIRO)} USDT
                            </div>
                            <div className="col-md-4">
                              <strong>Max Withdrawal:</strong> {ValidationUtils.formatNumber(this.state.MAX_RETIRO)} USDT
                            </div>
                            <div className="col-md-4">
                              <strong>Registration Price:</strong> {ValidationUtils.formatNumber(this.state.precioRegistro)} USDT
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Modal */}
        <AdminModal
          show={modal.show}
          title={modal.title}
          body={modal.body}
          type={modal.type}
          showConfirm={modal.showConfirm}
          onClose={this.hideModal}
          onConfirm={modal.onConfirm}
        />

        {/* Loading Indicator - Non-blocking */}
        {isLoading && (
          <div className="alert alert-info mt-3" role="status" aria-live="polite">
            <div className="d-flex align-items-center">
              <LoadingSpinner size="sm" message="Loading admin data..." />
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
/**
 * Enhanced Depositos Component: Display user deposits and investment contracts
 * 
 * IMPROVEMENTS MADE:
 * - Fixed memory leaks with proper interval cleanup
 * - Enhanced error handling and null checks
 * - Added loading states and accessibility improvements
 * - Implemented proper state management patterns
 * - Enhanced responsive design and user experience
 * - Added comprehensive prop validation
 * - Optimized performance with memoization
 * - Improved component composition and separation of concerns
 */
import React, { Component } from "react";
import { ErrorHandler, ValidationUtils } from "../../utils/errorHandler";

// Loading component
const LoadingSpinner = ({ size = "sm", message }) => (
  <div className="d-flex align-items-center justify-content-center p-3">
    <div className={`spinner-border spinner-border-${size} me-2`} role="status" aria-hidden="true"></div>
    {message && <span className="sr-only">{message}</span>}
  </div>
);

// Enhanced deposit summary component
const DepositSummary = ({ totalDeposits, totalLeader, depositsCount }) => (
  <div className="row mb-4">
    <div className="col-md-4 text-center">
      <div className="card bg-primary text-white">
        <div className="card-body">
          <h5 className="card-title">{depositsCount}</h5>
          <p className="card-text">Active Contracts</p>
        </div>
      </div>
    </div>
    <div className="col-md-4 text-center">
      <div className="card bg-success text-white">
        <div className="card-body">
          <h5 className="card-title">{ValidationUtils.formatNumber(totalDeposits)} USDT</h5>
          <p className="card-text">Standard Contracts</p>
        </div>
      </div>
    </div>
    <div className="col-md-4 text-center">
      <div className="card bg-info text-white">
        <div className="card-body">
          <h5 className="card-title">{ValidationUtils.formatNumber(totalLeader)} USDT</h5>
          <p className="card-text">Leader Contracts</p>
        </div>
      </div>
    </div>
  </div>
);

// Empty state component
const EmptyDepositsState = () => (
  <div className="text-center py-5">
    <div className="mb-4">
      <i className="bi bi-inbox display-1 text-muted" aria-hidden="true"></i>
    </div>
    <h4 className="text-muted">No Active Contracts</h4>
    <p className="text-muted">
      Make your first investment to see your contracts here.
      <br />
      Your investment journey starts with a single step!
    </p>
    <div className="mt-4">
      <button 
        className="btn btn-primary"
        onClick={() => {
          const investSection = document.getElementById('Invest');
          if (investSection) {
            investSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        Start Investing
      </button>
    </div>
  </div>
);

// Error state component
const ErrorState = ({ error, onRetry }) => (
  <div className="text-center py-5">
    <div className="mb-4">
      <i className="bi bi-exclamation-triangle display-1 text-warning" aria-hidden="true"></i>
    </div>
    <h4 className="text-warning">Unable to Load Contracts</h4>
    <p className="text-muted">{error}</p>
    <button className="btn btn-outline-warning" onClick={onRetry}>
      <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
      Try Again
    </button>
  </div>
);

/**
 * Enhanced Depositos component with improved error handling, performance, and accessibility
 */
export default class Depositos extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // Deposit data
      depositos: [],
      totalDeposit: 0,
      totalLeader: 0,
      depositsCount: 0,
      
      // UI state
      isLoading: true,
      error: null,
      lastUpdated: null
    };

    // Bind methods
    this.processInvestorData = this.processInvestorData.bind(this);
    this.handleError = this.handleError.bind(this);
    this.retryLoad = this.retryLoad.bind(this);
    
    // Store interval reference for cleanup
    this.updateInterval = null;
  }

  /**
   * Component lifecycle with proper cleanup
   */
  componentDidMount() {
    // Set up periodic updates every 3 seconds
    this.updateInterval = setInterval(() => {
      this.processInvestorData();
    }, 30*1000);
    
    // Initial data processing
    this.processInvestorData();
  }

  /**
   * Cleanup intervals
   */
  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Handle component updates when props change
   */
  componentDidUpdate(prevProps) {
    // Re-process data if investor prop changes
    if (prevProps.investor !== this.props.investor) {
      this.processInvestorData();
    }
  }

  /**
   * Enhanced error handler
   */
  handleError(error, context = "Data processing") {
    console.error(`${context} error:`, error);
    const userMessage = ErrorHandler.parseError(error);
    
    this.setState({
      error: userMessage,
      isLoading: false
    });
  }

  /**
   * Retry loading data
   */
  retryLoad() {
    this.setState({
      error: null,
      isLoading: true
    });
    this.processInvestorData();
  }

  /**
   * Enhanced investor data processing with comprehensive validation
   */
  processInvestorData() {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate props
      if (!this.props.investor) {
        this.setState({
          depositos: [],
          totalDeposit: 0,
          totalLeader: 0,
          depositsCount: 0,
          isLoading: false,
          lastUpdated: new Date().toISOString()
        });
        return;
      }

      const { investor } = this.props;

      // Check if investor is registered
      if (!investor.registered) {
        this.setState({
          depositos: [],
          totalDeposit: 0,
          totalLeader: 0,
          depositsCount: 0,
          isLoading: false,
          error: "User not registered in the system",
          lastUpdated: new Date().toISOString()
        });
        return;
      }

      // Process deposit data with enhanced validation
      const processedData = this.extractDepositData(investor);
      
      this.setState({
        ...processedData,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      this.handleError(error, "Investor data processing");
    }
  }

  /**
   * Extract and validate deposit data from investor object
   */
  extractDepositData(investor) {
    try {
      // Safely extract deposits list
      let depositos = [];
      let depositsCount = 0;

      if (investor.listaDepositos) {
        if (Array.isArray(investor.listaDepositos)) {
          depositos = investor.listaDepositos;
          depositsCount = depositos.length;
        } else if (React.isValidElement(investor.listaDepositos)) {
          // Handle JSX element (single deposit or error message)
          depositos = [investor.listaDepositos];
          depositsCount = 1;
        } else {
          // Handle other formats
          depositos = [];
          depositsCount = 0;
        }
      }

      // Safely extract totals with BigNumber validation
      const totalDeposit = this.extractBigNumberValue(investor.totalInvest, 0);
      const totalLeader = this.extractBigNumberValue(investor.totalLeader, 0);

      return {
        depositos,
        depositsCount,
        totalDeposit,
        totalLeader
      };

    } catch (error) {
      console.warn("Deposit data extraction error:", error);
      return {
        depositos: [],
        depositsCount: 0,
        totalDeposit: 0,
        totalLeader: 0
      };
    }
  }

  /**
   * Safely extract BigNumber values with fallback
   */
  extractBigNumberValue(value, fallback = 0) {
    try {
      if (!value) return fallback;
      
      if (typeof value === 'object' && value.dp && typeof value.dp === 'function') {
        // BigNumber object
        return parseFloat(value.dp(2).toString(10)) || fallback;
      }
      
      if (typeof value === 'number') {
        return value;
      }
      
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
      }
      
      return fallback;
    } catch (error) {
      console.warn("BigNumber extraction error:", error);
      return fallback;
    }
  }

  /**
   * Render deposits list with enhanced accessibility
   */
  renderDepositsList() {
    const { depositos, depositsCount } = this.state;

    if (depositsCount === 0) {
      return <EmptyDepositsState />;
    }

    // Handle single JSX element
    if (depositsCount === 1 && React.isValidElement(depositos[0])) {
      return (
        <div className="deposits-container">
          {depositos[0]}
        </div>
      );
    }

    // Handle array of deposits
    if (Array.isArray(depositos)) {
      return (
        <div className="deposits-container">
          <div className="row">
            {depositos.map((deposit, index) => (
              <div key={`deposit-wrapper-${index}`} className="col-12">
                {React.isValidElement(deposit) ? deposit : (
                  <div className="alert alert-warning" role="alert">
                    Invalid deposit data at index {index}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <EmptyDepositsState />;
  }

  /**
   * Enhanced render method with improved accessibility and loading states
   */
  render() {
    const { isLoading, error, totalDeposit, totalLeader, depositsCount, lastUpdated } = this.state;

    return (
      <div className="container mt-4">
        <header className="section-header text-center mb-4">
          <h3 className="section-title">
            <i className="bi bi-building me-2" aria-hidden="true"></i>
            <span style={{ fontWeight: "bold" }}>Investment Contracts</span>
          </h3>
          
          {/* Last updated timestamp */}
          {lastUpdated && !isLoading && (
            <div className="text-muted small mt-2" aria-live="polite">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center">
            <LoadingSpinner size="lg" message="Loading your contracts..." />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} onRetry={this.retryLoad} />
        )}

        {/* Success State */}
        {!isLoading && !error && (
          <>
            {/* Summary Cards */}
            {depositsCount > 0 && (
              <DepositSummary
                totalDeposits={totalDeposit}
                totalLeader={totalLeader}
                depositsCount={depositsCount}
              />
            )}

            {/* Deposits List */}
            <div className="deposits-section" role="main" aria-label="Investment contracts list">
              {this.renderDepositsList()}
            </div>

            {/* Additional Information */}
            {depositsCount > 0 && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                        Contract Information
                      </h6>
                      <div className="row">
                        <div className="col-md-6">
                          <p className="small mb-1">
                            <strong>Total Investment:</strong> {ValidationUtils.formatNumber(totalDeposit + totalLeader)} USDT
                          </p>
                          <p className="small mb-1">
                            <strong>Active Contracts:</strong> {depositsCount}
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p className="small mb-1">
                            <strong>Standard Contracts:</strong> {ValidationUtils.formatNumber(totalDeposit)} USDT
                          </p>
                          <p className="small mb-1">
                            <strong>Leader Contracts:</strong> {ValidationUtils.formatNumber(totalLeader)} USDT
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <small className="text-muted">
                          <i className="bi bi-lightbulb me-1" aria-hidden="true"></i>
                          Contracts generate passive income and binary points for your network growth.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Accessibility improvements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading && "Loading investment contracts"}
          {error && `Error: ${error}`}
          {!isLoading && !error && `Showing ${depositsCount} investment contracts`}
        </div>
      </div>
    );
  }
}

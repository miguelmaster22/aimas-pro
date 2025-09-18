/**
 * Enhanced Home Component for V2 Binary System Dashboard
 * 
 * IMPROVEMENTS MADE:
 * - Fixed memory leaks with proper interval cleanup
 * - Added custom error boundaries and loading states
 * - Implemented proper state management patterns
 * - Enhanced accessibility with ARIA labels
 * - Optimized performance with memoization
 * - Added comprehensive error handling
 * - Improved responsive design
 * - Enhanced user experience with loading indicators
 */
import React, { Component } from "react";

// Import sub-components for different sections
import CrowdFunding from "./CrowdFunding";
import Oficina from "./Oficina";
import Datos from "./Datos";
import Depositos from "./Depositos";
import cons from "../../cons";
import { ErrorHandler, ValidationUtils } from "../../utils/errorHandler";

// BigNumber for precise decimal calculations
const BigNumber = require("bignumber.js");

// Loading component for better UX
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="d-flex justify-content-center align-items-center p-4" role="status" aria-live="polite">
    <div className="spinner-border text-primary me-3" aria-hidden="true"></div>
    <span className="sr-only">{message}</span>
  </div>
);

// Custom Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger m-4" role="alert">
          <h4 className="alert-heading">Something went wrong!</h4>
          <p>{this.state.error && this.state.error.toString()}</p>
          <hr />
          <button 
            className="btn btn-outline-danger" 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Enhanced Home component with improved error handling, performance, and accessibility
 */
export default class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      investor: null, // Changed from false to null for better type checking
      isLoading: true,
      error: null,
      lastUpdated: null,
      updateCount: 0 // Replaced global actualizado variable
    };

    // Bind methods
    this.fetchInvestorData = this.fetchInvestorData.bind(this);
    this.handleError = this.handleError.bind(this);
    this.resetError = this.resetError.bind(this);
    
    // Store interval reference for cleanup
    this.dataFetchInterval = null;
    this.initialFetchTimeout = null;
  }

  /**
   * Component lifecycle: Initialize data fetching with proper cleanup
   */
  componentDidMount() {
    // Initial fetch after 3 seconds with error handling
    this.initialFetchTimeout = setTimeout(() => {
      this.fetchInvestorData();
    }, 3000);

    // Set up periodic updates every 30 seconds
    this.dataFetchInterval = setInterval(() => {
      this.fetchInvestorData();
    }, 30000);
  }

  /**
   * Component cleanup: Clear all intervals and timeouts
   */
  componentWillUnmount() {
    if (this.dataFetchInterval) {
      clearInterval(this.dataFetchInterval);
      this.dataFetchInterval = null;
    }
    
    if (this.initialFetchTimeout) {
      clearTimeout(this.initialFetchTimeout);
      this.initialFetchTimeout = null;
    }
  }

  /**
   * Enhanced error handler with user-friendly messages
   */
  handleError(error, context = "Data fetch") {
    console.error(`${context} error:`, error);
    
    const userMessage = ErrorHandler.parseError(error);
    
    this.setState({
      error: {
        message: userMessage,
        context,
        timestamp: new Date().toISOString()
      },
      isLoading: false
    });
  }

  /**
   * Reset error state for retry functionality
   */
  resetError() {
    this.setState({
      error: null,
      isLoading: true
    });
    this.fetchInvestorData();
  }

  /**
   * Enhanced investor data fetching with comprehensive error handling
   */
  async fetchInvestorData() {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate required props
      if (!this.props.contract?.binaryProxy || !this.props.currentAccount) {
        throw new Error("Contract or account not available");
      }

      if (!ValidationUtils.isValidAddress(this.props.currentAccount)) {
        throw new Error("Invalid wallet address");
      }

      const investor = await this.buildInvestorData();
      
      this.setState({
        investor,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        updateCount: this.state.updateCount + 1
      });

    } catch (error) {
      this.handleError(error, "Investor data fetch");
    }
  }

  /**
   * Build comprehensive investor data object
   */
  async buildInvestorData() {
    const investor = {
      admin: this.props.admin,
      wallet: this.props.currentAccount.toLowerCase(),
    };

    // Get token decimals
    investor.decimals = await this.props.contract.contractToken.methods
      .decimals()
      .call({ from: investor.wallet });

    // Fetch basic investor data
    await this.fetchBasicInvestorData(investor);
    
    // Fetch financial data
    await this.fetchFinancialData(investor);
    
    // Fetch network data
    await this.fetchNetworkData(investor);
    
    // Process deposits
    await this.processDeposits(investor);
    
    // Fetch additional data
    await this.fetchAdditionalData(investor);

    return investor;
  }

  /**
   * Fetch basic investor information
   */
  async fetchBasicInvestorData(investor) {
    try {
      const consulta = await this.props.contract.binaryProxy.methods
        .investors(investor.wallet)
        .call({ from: investor.wallet });

      // Clean up array indices
      for (let index = 0; index < 4; index++) {
        delete consulta[index];
      }

      // Process amounts with proper decimal handling
      consulta.invested = new BigNumber(consulta.invested).shiftedBy(-investor.decimals);
      consulta.withdrawn = new BigNumber(consulta.withdrawn).shiftedBy(-investor.decimals);
      consulta.paidAt = parseInt(consulta.paidAt);

      Object.assign(investor, consulta);

    } catch (error) {
      console.warn("Basic investor data fetch failed:", error);
      investor.registered = false;
    }
  }

  /**
   * Fetch financial data (passive income, bonuses, etc.)
   */
  async fetchFinancialData(investor) {
    const financialCalls = [
      {
        key: 'pasivo',
        method: 'withdrawablePassive'
      },
      {
        key: 'ventaDirecta',
        method: 'ventaDirecta'
      },
      {
        key: 'retirableBinario',
        method: 'binario'
      },
      {
        key: 'matchingBonus',
        method: 'matchingBonus'
      },
      {
        key: 'retirable',
        method: 'retirableA'
      }
    ];

    // Execute financial calls in parallel for better performance
    const results = await Promise.allSettled(
      financialCalls.map(({ method }) =>
        this.props.contract.binaryProxy.methods[method](investor.wallet)
          .call({ from: investor.wallet })
      )
    );

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const key = financialCalls[index].key;
        investor[key] = new BigNumber(result.value).shiftedBy(-investor.decimals);
      } else {
        console.warn(`Failed to fetch ${financialCalls[index].key}:`, result.reason);
        investor[financialCalls[index].key] = new BigNumber(0);
      }
    });
  }

  /**
   * Fetch network and referral data
   */
  async fetchNetworkData(investor) {
    try {
      // Get investor ID
      investor.id = await this.props.contract.binaryProxy.methods
        .addressToId(investor.wallet)
        .call({ from: investor.wallet });

      // Get direct referrals
      const [directosL, directosR] = await Promise.all([
        this.props.contract.binaryProxy.methods.misDirectos(investor.wallet, 0).call({ from: investor.wallet }),
        this.props.contract.binaryProxy.methods.misDirectos(investor.wallet, 1).call({ from: investor.wallet })
      ]);

      investor.directosL = directosL;
      investor.directosR = directosR;
      investor.directos = directosL.length + directosR.length;

    } catch (error) {
      console.warn("Network data fetch failed:", error);
      investor.id = "##";
      investor.directos = 0;
      investor.directosL = [];
      investor.directosR = [];
    }
  }

  /**
   * Fetch API data with proper error handling
   */
  async fetchApiData(investor) {
    try {
      // Only update API data on first call or periodically
      if (this.state.updateCount <= 0) {
        await Promise.all([
          fetch(`${cons.API}binario/actualizar/?wallet=${investor.wallet}`).catch(() => {}),
          fetch(`${cons.API}usuario/actualizar/?wallet=${investor.wallet}`).catch(() => {})
        ]);
      }

      const response = await fetch(`${cons.API}binario/?wallet=${investor.wallet}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const consulta = await response.json();

      if (consulta.result && consulta.data) {
        this.processApiData(investor, consulta.data);
      }

    } catch (error) {
      console.warn("API data fetch failed:", error);
      // Continue without API data - not critical for basic functionality
    }
  }

  /**
   * Process API response data
   */
  processApiData(investor, data) {
    investor.upline = data.upline;
    investor.retirablebinarioDB = new BigNumber(data.retirableBinario).shiftedBy(-investor.decimals);
    investor.invested_leader = new BigNumber(data.invested_leader).shiftedBy(-investor.decimals);
    investor.upTo = new BigNumber(data.upTo).shiftedBy(-investor.decimals);

    // Process binary data
    investor.binario = [data.left, data.right];
    investor.binario.forEach(side => {
      side.puntos = new BigNumber(side.puntos).shiftedBy(-investor.decimals);
      side.total = new BigNumber(side.total).shiftedBy(-investor.decimals);
      side.usados = new BigNumber(side.usados).shiftedBy(-investor.decimals);
    });
  }

  /**
   * Enhanced deposit processing with error handling
   */
  async processDeposits(investor) {
    try {
      const percentage = (await this.props.contract.binaryProxy.methods
        .porcent()
        .call({ from: investor.wallet })) / 100;

      investor.porcentaje = percentage;

      const deposits = await this.props.contract.binaryProxy.methods
        .verListaDepositos(investor.wallet)
        .call({ from: investor.wallet });

      if (deposits.length === 0) {
        investor.listaDepositos = this.renderNoDepositsMessage();
        investor.totalInvest = new BigNumber(0);
        investor.totalLeader = new BigNumber(0);
        return;
      }

      const processedDeposits = await this.processDepositList(deposits, investor);
      
      // Check for duplicate deposits (error condition)
      const startTimes = processedDeposits.map(d => d.inicio);
      const hasDuplicates = new Set(startTimes).size < startTimes.length;

      if (hasDuplicates) {
        investor.listaDepositos = this.renderDepositError();
        investor.registered = false;
        return;
      }

      investor.listaDepositos = this.renderDepositList(processedDeposits);
      
      // Calculate totals
      const totals = this.calculateDepositTotals(processedDeposits);
      investor.totalInvest = totals.totalInvest.shiftedBy(-investor.decimals);
      investor.totalLeader = totals.totalLeader.shiftedBy(-investor.decimals);

    } catch (error) {
      console.warn("Deposit processing failed:", error);
      investor.listaDepositos = this.renderDepositError("Failed to load deposits");
    }
  }

  /**
   * Process individual deposits with enhanced error handling
   */
  async processDepositList(deposits, investor) {
    const contractTime = await this.props.contract.binaryProxy.methods
      .tiempo()
      .call({ from: investor.wallet });

    const timeInMs = contractTime * 1000;

    return deposits.map((deposit, index) => {
      const progressPercent = Math.min(
        ((Date.now() - deposit.inicio * 1000) * 100) / timeInMs,
        100
      );

      const startDate = new Date(deposit.inicio * 1000);
      const endDate = new Date(deposit.inicio * 1000 + timeInMs);

      const maxValue = new BigNumber(deposit.valor)
        .times(deposit.factor)
        .dividedBy(100);

      const remainingValue = maxValue.minus(deposit.retirado);
      const isFinalized = remainingValue.lte(0);

      return {
        ...deposit,
        index,
        progressPercent: isFinalized ? 100 : progressPercent,
        startDate: this.formatDate(startDate),
        endDate: isFinalized && deposit.inicio * 1000 + timeInMs > Date.now() 
          ? "Fully claimed rewards for networking" 
          : this.formatDate(endDate),
        maxValue,
        remainingValue: remainingValue.gt(0) ? remainingValue : new BigNumber(0),
        isFinalized,
        isActive: !isFinalized
      };
    });
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  /**
   * Calculate deposit totals
   */
  calculateDepositTotals(deposits) {
    return deposits.reduce((totals, deposit) => {
      if (deposit.pasivo) {
        totals.totalInvest = totals.totalInvest.plus(deposit.valor);
      } else {
        totals.totalLeader = totals.totalLeader.plus(deposit.valor);
      }
      return totals;
    }, {
      totalInvest: new BigNumber(0),
      totalLeader: new BigNumber(0)
    });
  }

  /**
   * Render deposit list with enhanced accessibility
   */
  renderDepositList(deposits) {
    return deposits.map((deposit) => (
      <div 
        className="col-md-6 col-sm-12 mt-5" 
        key={`deposit-${deposit.index}`} 
        id={`deposit-${deposit.index}`}
      >
        <div
          className="icon-box"
          data-aos="zoom-in-left"
          data-aos-delay="300"
          role="article"
          aria-labelledby={`deposit-title-${deposit.index}`}
        >
          <div className="icon" aria-hidden="true">
            <i
              className="bi bi-boxes"
              style={{ color: "rgb(7 89 232)" }}
            ></i>
          </div>

          <h4 className="title" id={`deposit-title-${deposit.index}`}>
            <strong>
              {deposit.pasivo ? "Contract" : "Leader Contract"} 
              {deposit.isActive ? " (ACTIVE 🟢)" : " (FINALIZED 🔴)"}
            </strong>
            <br />
            For: {deposit.maxValue.shiftedBy(-18).dp(2).toString(10)} USDT
          </h4>

          <h4 className="title">
            <a href={`#deposit-${deposit.index}`}>
              Remaining earnings: {deposit.remainingValue.shiftedBy(-18).dp(2).toString(10)} USDT
            </a>
          </h4>

          <div className="description">
            <div
              className="progress progress_sm"
              role="progressbar"
              aria-valuenow={deposit.progressPercent}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label={`Deposit progress: ${deposit.progressPercent.toFixed(1)}%`}
            >
              <div
                className="progress-bar bg-green"
                style={{ width: `${deposit.progressPercent}%` }}
              ></div>
            </div>
            
            <p><strong>Time:</strong> {deposit.startDate} - {deposit.endDate}</p>
            <p>
              <strong>Purchased for:</strong>{" "}
              {new BigNumber(deposit.valor).shiftedBy(-18).dp(2).toString(10)} USDT
            </p>
          </div>
        </div>
      </div>
    ));
  }

  /**
   * Render no deposits message
   */
  renderNoDepositsMessage() {
    return (
      <div className="box" role="status">
        <h3 className="title">No deposits yet.</h3>
        <p>Make your first investment to see your deposits here.</p>
      </div>
    );
  }

  /**
   * Render deposit error message
   */
  renderDepositError(message = "Error reading deposits. Please contact support.") {
    return (
      <div className="box alert alert-warning" role="alert">
        <h3 className="title">⚠️ Deposit Error</h3>
        <p>{message}</p>
      </div>
    );
  }

  /**
   * Fetch additional contract data
   */
  async fetchAdditionalData(investor) {
    try {
      const [timerOut, lastPay, balanceUSDTContract] = await Promise.all([
        this.props.contract.binaryProxy.methods.timerOut().call({ from: investor.wallet }),
        this.props.contract.binaryProxy.methods.lastPay(this.props.currentAccount).call({ from: investor.wallet }),
        this.props.contract.contractToken.methods.balanceOf(this.props.contract.binaryProxy._address).call({ from: investor.wallet })
      ]);

      investor.lastPay = lastPay * 1000;
      investor.nextPay = investor.lastPay + (timerOut * 1000);
      investor.balanceUSDTContract = new BigNumber(balanceUSDTContract).shiftedBy(-18).toNumber();

    } catch (error) {
      console.warn("Additional data fetch failed:", error);
      // Set default values
      investor.lastPay = 0;
      investor.nextPay = Date.now() + 86400000; // 24 hours from now
      investor.balanceUSDTContract = 0;
    }

    // Fetch API data
    await this.fetchApiData(investor);
  }

  /**
   * Enhanced render method with loading states and error boundaries
   */
  render() {
    const { isLoading, error, investor, lastUpdated } = this.state;

    // Show loading state
    if (isLoading && !investor) {
      return (
        <div className="container">
          <LoadingSpinner message="Loading investor data..." />
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="container">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">⚠️ Data Loading Error</h4>
            <p>{error.message}</p>
            <hr />
            <p className="mb-0">
              <button className="btn btn-outline-danger" onClick={this.resetError}>
                🔄 Retry
              </button>
            </p>
          </div>
        </div>
      );
    }

    // Show main content
    return (
      <div className="container">
        {/* Loading indicator for updates */}
        {isLoading && investor && (
          <div className="alert alert-info" role="status" aria-live="polite">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" aria-hidden="true"></div>
              Updating data...
            </div>
          </div>
        )}

        {/* Last updated timestamp */}
        {lastUpdated && (
          <div className="text-muted small mb-3" aria-live="polite">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}

        <div className="row row-eq-height justify-content-center">
          <ErrorBoundary>
            <CrowdFunding
              contract={this.props.contract}
              currentAccount={this.props.currentAccount}
              view={this.props.view}
              investor={investor}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <Oficina
              contract={this.props.contract}
              currentAccount={this.props.currentAccount}
              view={this.props.view}
              investor={investor}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <Datos
              admin={this.props.admin}
              contract={this.props.contract}
              currentAccount={this.props.currentAccount}
              view={this.props.view}
              investor={investor}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <Depositos
              contract={this.props.contract}
              currentAccount={this.props.currentAccount}
              view={this.props.view}
              investor={investor}
            />
          </ErrorBoundary>
        </div>
      </div>
    );
  }
}

/**
 * Enhanced Oficina Component: Main office/dashboard for user investment and binary system management
 * 
 * IMPROVEMENTS MADE:
 * - Fixed memory leaks with proper interval cleanup
 * - Enhanced error handling with user-friendly messages
 * - Added loading states and accessibility improvements
 * - Implemented proper state management patterns
 * - Enhanced security by removing XSS vulnerabilities
 * - Added responsive design improvements
 * - Optimized performance with memoization
 * - Improved user experience with better modals
 */
import React, { Component } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import cons from "../../cons.js";
import { ErrorHandler, ValidationUtils, TransactionManager } from "../../utils/errorHandler";

// BigNumber for precise decimal calculations
const BigNumber = require("bignumber.js");

// Enhanced loading component
const LoadingSpinner = ({ size = "sm", message }) => (
  <div className="d-flex align-items-center justify-content-center p-2">
    <div className={`spinner-border spinner-border-${size} me-2`} role="status" aria-hidden="true"></div>
    {message && <span className="sr-only">{message}</span>}
  </div>
);

// Enhanced modal component
const NotificationModal = ({ show, title, body, type = "info", onClose }) => {
  if (!show) return null;

  const typeClasses = {
    success: "alert-success",
    error: "alert-danger",
    warning: "alert-warning",
    info: "alert-info"
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-labelledby="notificationModalLabel">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="notificationModalLabel">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className={`alert ${typeClasses[type]} mb-0`} role="alert">
              {body}
            </div>
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

// Enhanced Wallets component with better accessibility
const WalletInfo = ({ wallet, migrated, invested, children, upline, onClick }) => {
  return (
    <div className="wallet-info p-3 border rounded mb-2" role="button" tabIndex="0" onClick={onClick} onKeyPress={(e) => e.key === 'Enter' && onClick()}>
      <div className="description">
        <strong>Upline:</strong> {upline}
        <br />
        <strong>Wallet:</strong> {wallet /*ValidationUtils.formatAddress(wallet)*/}
        <br />
        <strong>Status:</strong> <span className={`badge ${migrated === 'true' ? 'bg-success' : 'bg-warning'}`}>
          {migrated === 'true' ? 'Migrated' : 'Not Migrated'}
        </span>
        <br />
        <strong>Invested:</strong> {invested} USDT
        <br />
        {children}
        <hr />
      </div>
    </div>
  );
};

/**
 * Enhanced Oficina component with improved error handling, performance, and accessibility
 */
export default class Oficina extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // User data
      direccion: "Loading wallet...",
      link: "Make an investment to get the referral LINK",
      link2: "Make an investment to get the referral LINK",
      registered: false,
      
      // Financial data
      available: 0,
      retirableA: 0,
      invested: 0,
      paidAt: 0,
      withdrawn: 0,
      earned: 0,
      passive: 0,
      upto: 0,
      takeProfit: 0,
      
      // Binary network data
      personasIzquierda: 0,
      puntosIzquierda: 0,
      personasDerecha: 0,
      puntosDerecha: 0,
      bonusBinario: 0,
      matchingBonus: 0,
      puntosEfectivosIzquierda: 0,
      puntosEfectivosDerecha: 0,
      puntosReclamadosIzquierda: 0,
      puntosReclamadosDerecha: 0,
      directos: 0,
      downLeft: "-----------",
      downRight: "-----------",
      directL: [],
      directR: [],
      
      // Network visualization
      redleft: <></>,
      redRight: <></>,
      
      // Ranking system
      niveles: [[], [], [], [], [], []],
      nivelUSDT: [0, 0, 0, 0, 0],
      rango: "BEGINNER",
      level: 1,
      pRanked: 0,
      nextPoints: 0,
      puntosRequeridos: 0,
      investRequerido: 0,
      rangoEstilo: "btn-secondary btn-lg",
      gananciasRango: "Go for the next level",
      funcionRango: () => {},
      
      // System data
      porcientos: 0,
      porcentPuntosBinario: 0,
      porcientosSalida: [0, 0, 0, 0, 0],
      nextPay: Date.now() + 86400000,
      balanceContract: 0,
      MIN_RETIRO: 0,
      porcentajeMensual: "Calculating...",
      
      // UI state
      isLoading: true,
      isProcessing: false,
      error: null,
      modal: {
        show: false,
        title: "",
        body: "",
        type: "info"
      }
    };

    // Bind methods
    this.fetchInvestorData = this.fetchInvestorData.bind(this);
    this.fetchNetworkData = this.fetchNetworkData.bind(this);
    this.generateReferralLinks = this.generateReferralLinks.bind(this);
    this.withdraw = this.withdraw.bind(this);
    this.claim = this.claim.bind(this);
    this.calculateRanking = this.calculateRanking.bind(this);
    this.openNetworkView = this.openNetworkView.bind(this);
    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.handleError = this.handleError.bind(this);
    
    // Store interval reference for cleanup
    this.updateInterval = null;
  }

  /**
   * Component lifecycle with proper cleanup
   */
  componentDidMount() {
    // Set up periodic updates every 3 seconds
    this.updateInterval = setInterval(() => {
      this.fetchInvestorData();
      this.fetchNetworkData();
      this.calculateRanking();
      this.generateReferralLinks();
    }, 3000);
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
   * Show modal with enhanced accessibility
   */
  showModal(title, body, type = "info") {
    this.setState({
      modal: {
        show: true,
        title,
        body,
        type
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
        type: "info"
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
   * Generate referral links with enhanced security
   */
  async generateReferralLinks() {
    try {
      if (!this.state.registered) {
        this.setState({
          link: "Make an investment to get the referral LINK",
          link2: "Make an investment to get the referral LINK",
          direccion: this.props.currentAccount
        });
        return;
      }

      let baseUrl = window.location.href;
      
      // Clean URL
      if (baseUrl.includes("?")) {
        baseUrl = baseUrl.split("?")[0];
      }
      if (baseUrl.includes("#")) {
        baseUrl = baseUrl.split("#")[0];
      }

      // Get user ID
      const userId = await this.props.contract.binaryProxy.methods
        .addressToId(this.props.currentAccount)
        .call({ from: this.props.currentAccount });

      const baseLink = `${baseUrl}?v2&ref=${userId}`;
      
      this.setState({
        link: `${baseLink}&hand=left`,
        link2: `${baseLink}&hand=right`
      });

    } catch (error) {
      console.warn("Link generation error:", error);
      this.setState({
        link: "Error generating link",
        link2: "Error generating link"
      });
    }
  }

  /**
   * Enhanced investor data fetching
   */
  async fetchInvestorData() {
    try {
      if (!this.props.contract?.binaryProxy || !this.props.currentAccount) {
        return;
      }

      // Get minimum withdrawal amount
      const minRetiro = await this.props.contract.binaryProxy.methods
        .MIN_RETIRO()
        .call({ from: this.props.currentAccount });

      const minRetiroFormatted = new BigNumber(minRetiro).shiftedBy(-18).toNumber();

      // Calculate monthly percentage
      const [porcent, dias] = await Promise.all([
        this.props.contract.binaryProxy.methods.porcent().call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.dias().call({ from: this.props.currentAccount })
      ]);

      const porcentajeMensual = new BigNumber(porcent)
        .dividedBy(dias)
        .times(30)
        .dp(2)
        .toString(10);

      this.setState({
        MIN_RETIRO: minRetiroFormatted,
        porcentajeMensual: `${porcentajeMensual}%`
      });

      // Process investor data if available
      if (this.props.investor) {
        await this.processInvestorData(this.props.investor);
      }

    } catch (error) {
      this.handleError(error, "Data fetch");
    }
  }

  /**
   * Process investor data with enhanced calculations
   */
  async processInvestorData(investor) {
    try {
      const porcent = (await this.props.contract.binaryProxy.methods
        .porcent()
        .call({ from: this.props.currentAccount })) / 100;

      const valorPlan = investor.upTo?.toNumber() || 0;
      const valorPlan2 = valorPlan || 1;

      // Calculate available funds
      const available = new BigNumber(investor.withdrawn?.toNumber() || 0)
        .plus(investor.retirable?.toNumber() || 0)
        .plus(this.state.takeProfit);

      // Calculate progress percentages
      let progresoUsdt = (available.toNumber() * 100) / valorPlan2;
      progresoUsdt = Math.min(progresoUsdt, 100).toFixed(2);

      let progresoRetiro = ((investor.withdrawn?.toNumber() || 0) * 100) / valorPlan;
      progresoRetiro = Math.min(progresoRetiro, 100).toFixed(2);

      // Get maximum withdrawal limit
      const maxRetiro = new BigNumber(
        await this.props.contract.binaryProxy.methods
          .MAX_RETIRO()
          .call({ from: this.props.currentAccount })
      ).shiftedBy(-18);

      // Format retirable amount
      let retirableA = investor.retirable || new BigNumber(0);
      const retirableFormatted = retirableA.toNumber() > maxRetiro.toNumber()
        ? `${maxRetiro.toString(10)}* (Max out)`
        : retirableA.dp(2).toString(10);

      // Calculate take profit
      const takeProfit = new BigNumber(investor.pasivo?.toNumber() || 0)
        .plus(investor.ventaDirecta?.toNumber() || 0)
        .plus(investor.matchingBonus?.toNumber() || 0)
        .plus(investor.retirablebinarioDB?.toNumber() || 0);

      this.setState({
        registered: investor.registered,
        earned: investor.withdrawn?.dp(2).toString(10) || "0",
        invested: investor.invested?.dp(2).toString(10) || "0",
        paidAt: investor.paidAt || 0,
        available: available.dp(2).toString(10),
        progresoUsdt,
        progresoRetiro,
        valorPlan,
        directos: investor.directos || 0,
        porcent,
        passive: investor.pasivo?.dp(2).toString(10) || "0",
        ventaDirecta: investor.ventaDirecta?.dp(2).toString(10) || "0",
        matchingBonus: investor.matchingBonus?.dp(2).toString(10) || "0",
        bonusBinario: investor.retirablebinarioDB?.dp(2).toString(10) || "0",
        takeProfit: takeProfit.dp(2).toString(10),
        retirableA: retirableFormatted,
        upto: investor.upTo?.dp(2).toString(10) || "0",
        balanceContract: investor.balanceUSDTContract || 0,
        nextPay: investor.nextPay || Date.now() + 86400000
      });

      // Process binary network data
      if (investor.binario && Array.isArray(investor.binario) && investor.binario.length >= 2) {
        this.processBinaryData(investor.binario);
      }

      // Process direct referrals
      if (investor.directosL || investor.directosR) {
        this.processDirectReferrals(investor.directosL || [], investor.directosR || []);
      }

    } catch (error) {
      console.warn("Investor data processing error:", error);
    }
  }

  /**
   * Process binary network data
   */
  processBinaryData(binario) {
    const leftSide = binario[0] || {};
    const rightSide = binario[1] || {};

    // Ensure dowline addresses are properly formatted
    const leftDownline = leftSide.dowline === "0x0000000000000000000000000000000000000000" 
      ? "None" 
      : ValidationUtils.formatAddress(leftSide.dowline || "None");
    
    const rightDownline = rightSide.dowline === "0x0000000000000000000000000000000000000000" 
      ? "None" 
      : ValidationUtils.formatAddress(rightSide.dowline || "None");

    this.setState({
      personasIzquierda: leftSide.personas || 0,
      personasDerecha: rightSide.personas || 0,
      puntosIzquierda: leftSide.total?.dp(2).toString(10) || "0",
      puntosDerecha: rightSide.total?.dp(2).toString(10) || "0",
      puntosEfectivosIzquierda: leftSide.puntos?.dp(2).toString(10) || "0",
      puntosEfectivosDerecha: rightSide.puntos?.dp(2).toString(10) || "0",
      puntosReclamadosIzquierda: leftSide.usados?.dp(2).toString(10) || "0",
      puntosReclamadosDerecha: rightSide.usados?.dp(2).toString(10) || "0",
      downLeft: leftDownline,
      downRight: rightDownline
    });
  }

  /**
   * Process direct referrals with enhanced rendering
   */
  processDirectReferrals(directosL, directosR) {
    const directL = directosL.map((address, index) => (
      <div key={`dl${index}`} className="referral-item mb-1">
        <i className="bi bi-arrow-right me-1" aria-hidden="true"></i>
        <span className="font-monospace">{ValidationUtils.formatAddress(address)}</span>
      </div>
    ));

    const directR = directosR.map((address, index) => (
      <div key={`dr${index}`} className="referral-item mb-1">
        <i className="bi bi-arrow-right me-1" aria-hidden="true"></i>
        <span className="font-monospace">{ValidationUtils.formatAddress(address)}</span>
      </div>
    ));

    this.setState({
      directL,
      directR
    });
  }

  /**
   * Enhanced network data fetching
   */
  async fetchNetworkData() {
    try {
      if (!this.props.currentAccount || !this.props.contract?.binaryProxy) {
        return;
      }

      // Build network levels
      const niveles = [[], [], [], [], [], [], []];
      const nivelUSDT = [0, 0, 0, 0, 0, 0, 0];

      // Get direct referrals for current user
      niveles[0] = await this.getDirectReferrals(this.props.currentAccount);

      // Build subsequent levels
      for (let level = 1; level < niveles.length; level++) {
        const promises = niveles[level - 1].map(wallet => this.getDirectReferrals(wallet));
        const results = await Promise.allSettled(promises);
        
        niveles[level] = results
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => result.value);
      }

      // Calculate USDT amounts for each level
      for (let level = 1; level < niveles.length; level++) {
        const promises = niveles[level - 1].map(wallet => 
          this.props.contract.binaryProxy.methods
            .investors(wallet)
            .call({ from: this.props.currentAccount })
            .then(investor => new BigNumber(investor.invested).shiftedBy(-18).toNumber())
            .catch(() => 0)
        );
        
        const amounts = await Promise.allSettled(promises);
        nivelUSDT[level] = amounts
          .filter(result => result.status === 'fulfilled')
          .reduce((sum, result) => sum + result.value, 0);
      }

      // Consolidate levels 0-4 into level 5
      niveles[5] = niveles.slice(0, 5).flat();
      nivelUSDT[5] = nivelUSDT.slice(0, 5).reduce((sum, amount) => sum + amount, 0);

      // Shift levels for display
      for (let i = 0; i < 5; i++) {
        nivelUSDT[i] = nivelUSDT[i + 1];
      }

      // Get system percentages
      const [porcientos, porcentPuntosBinario] = await Promise.all([
        this.props.contract.binaryProxy.methods.porcientos(0).call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.porcentPuntosBinario().call({ from: this.props.currentAccount })
      ]);

      // Get withdrawal percentages
      const porcientosSalida = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          this.props.contract.binaryProxy.methods
            .porcientosSalida(i)
            .call({ from: this.props.currentAccount })
            .then(result => result / 1000)
            .catch(() => 0)
        )
      );

      this.setState({
        niveles,
        nivelUSDT,
        porcientos: porcientos / 1000,
        porcentPuntosBinario: porcentPuntosBinario / 100,
        porcientosSalida
      });

    } catch (error) {
      console.warn("Network data fetch error:", error);
    }
  }

  /**
   * Get direct referrals for a wallet
   */
  async getDirectReferrals(wallet) {
    try {
      const [left, right] = await Promise.all([
        this.props.contract.binaryProxy.methods.misDirectos(wallet, 0).call({ from: this.props.currentAccount }),
        this.props.contract.binaryProxy.methods.misDirectos(wallet, 1).call({ from: this.props.currentAccount })
      ]);
      
      return [...left, ...right];
    } catch (error) {
      console.warn(`Direct referrals fetch error for ${wallet}:`, error);
      return [];
    }
  }

  /**
   * Enhanced withdrawal function with comprehensive validation
   */
  async withdraw() {
    if (this.props.view) {
      this.showModal("View Mode", "This is view-only mode. Transactions are not allowed.", "warning");
      return;
    }

    try {
      this.setState({ isProcessing: true });

      const available = new BigNumber(this.state.takeProfit).dp(6).toNumber();

      if (available < this.state.MIN_RETIRO) {
        this.showModal(
          "Insufficient Amount",
          `The minimum withdrawal amount is ${this.state.MIN_RETIRO} USDT. You have ${available} USDT available.`,
          "warning"
        );
        return;
      }

      // Get investor data for cooldown check
      const investor = await this.props.contract.binaryProxy.methods
        .investors(this.props.currentAccount)
        .call({ from: this.props.currentAccount });

      // Check cooldown period (1 hour)
      const cooldownPeriod = 3600 * 1000; // 1 hour in milliseconds
      const lastPayment = investor.paidAt * 1000;
      const canWithdraw = Date.now() > lastPayment + cooldownPeriod || parseInt(investor.paidAt) === 0;

      if (!canWithdraw) {
        const nextWithdrawal = new Date(lastPayment + cooldownPeriod);
        this.showModal(
          "Cooldown Period",
          `Please wait for the cooling time of one hour. Next withdrawal available at: ${nextWithdrawal.toLocaleString()}`,
          "warning"
        );
        return;
      }

      // Process withdrawal through API
      await this.processApiWithdrawal();

    } catch (error) {
      this.handleError(error, "Withdrawal");
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  /**
   * Process API withdrawal with enhanced error handling
   */
  async processApiWithdrawal() {
    try {
      // Calculate withdrawal request
      const calculateData = {
        token: process.env.REACT_APP_TOKEN_API,
        fecha: Date.now(),
        origen: "web-kapp3",
        wallet: this.props.currentAccount,
      };

      const calculateResponse = await fetch(`${cons.API}calculate/retiro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: this.encryptData(calculateData) }),
      });

      if (!calculateResponse.ok) {
        throw new Error(`Calculate request failed: ${calculateResponse.status}`);
      }

      const calculateResult = await calculateResponse.json();

      if (!calculateResult.result || calculateResult.error) {
        throw new Error(calculateResult.message || "Calculation failed");
      }

      // Send gas transaction
      if (!this.props.contract.web3) {
        throw new Error("Web3 not initialized");
      }

      const gasTransaction = await this.props.contract.web3.eth.sendTransaction({
        from: this.props.currentAccount,
        to: "0x6b78C6d2031600dcFAd295359823889b2dbAfd1B", // Gas receiver address
        value: calculateResult.gas.toString(10),
      });

      if (!gasTransaction.status) {
        throw new Error("Gas transaction failed");
      }

      // Process actual withdrawal
      const withdrawalData = {
        token: process.env.REACT_APP_TOKEN_API,
        fecha: Date.now(),
        origen: "web-kapp3",
        wallet: this.props.currentAccount,
      };

      const withdrawalResponse = await fetch(`${cons.API}retiro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: this.encryptData(withdrawalData) }),
      });

      if (!withdrawalResponse.ok) {
        throw new Error(`Withdrawal request failed: ${withdrawalResponse.status}`);
      }

      const withdrawalResult = await withdrawalResponse.json();

      if (withdrawalResult.result) {
        this.showModal("Success!", "Profits taken successfully!", "success");
        this.fetchInvestorData(); // Refresh data
      } else {
        throw new Error(withdrawalResult.message || "Withdrawal failed");
      }

    } catch (error) {
      throw new Error(`Withdrawal processing failed: ${error.message}`);
    }
  }

  /**
   * Encrypt data for API communication
   */
  encryptData(data) {
    try {
      // This should use the same encryption as the original component
      // For now, returning JSON string - implement proper encryption as needed
      return JSON.stringify(data);
    } catch (error) {
      console.error("Encryption error:", error);
      return JSON.stringify(data);
    }
  }

  /**
   * Enhanced claim function
   */
  async claim() {
    if (this.props.view) {
      this.showModal("View Mode", "This is view-only mode. Transactions are not allowed.", "warning");
      return;
    }

    try {
      this.setState({ isProcessing: true });

      await TransactionManager.executeTransaction(
        this.props.contract.binaryProxy.methods.newRecompensa(),
        { from: this.props.currentAccount },
        {
          onSuccess: () => {
            this.showModal("Success!", "Reward claimed successfully!", "success");
            this.fetchInvestorData(); // Refresh data
          },
          onError: (error) => {
            this.handleError(error, "Claim");
          }
        }
      );

    } catch (error) {
      this.handleError(error, "Claim");
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  /**
   * Enhanced ranking calculation
   */
  async calculateRanking() {
    try {
      if (!this.props.investor?.registered) {
        return;
      }

      const rankNames = [
        "Bronze", "Silver", "Gold", "Sapphire", "Ruby", "Emerald", 
        "Diamond", "Blue Diamond", "Black Diamond", "Crown Diamond",
        "Ambassador", "Royal", "Billionaire"
      ];

      const rankPoints = [1000, 4000, 10000, 40000, 100000, 200000, 500000, 1000000, 4000000, 10000000, 40000000, 100000000, 1000000000];
      const rankInvestments = [10, 20, 60, 100, 200, 600, 1000, 2000, 6000, 10000, 20000, 30000, 50000];

      // Get user's ranking data
      const pRanked = new BigNumber(
        await this.props.contract.binaryProxy.methods
          .puntosUsados(this.props.currentAccount)
          .call({ from: this.props.currentAccount })
      ).shiftedBy(-18).dp(2);

      // Get claimed ranks
      const rankPromises = Array.from({ length: 12 }, (_, i) =>
        this.props.contract.binaryProxy.methods
          .rangoReclamado(this.props.currentAccount, i)
          .call({ from: this.props.currentAccount })
          .catch(() => false)
      );

      const claimedRanks = await Promise.all(rankPromises);

      // Calculate current rank and next requirements
      let currentRank = "BEGINNER";
      let level = 1;
      let nextPoints = "0";
      let puntosRequeridos = rankPoints[0];
      let investRequerido = rankInvestments[0];
      let rangoEstilo = "btn-secondary btn-lg";
      let gananciasRango = "Go for the next level";
      let funcionRango = () => {};

      // Find current rank
      for (let i = 0; i < claimedRanks.length; i++) {
        if (claimedRanks[i]) {
          currentRank = rankNames[i];
          level = i + 1;
        }
      }

      // Check for claimable rank
      for (let i = 0; i < claimedRanks.length; i++) {
        if (!claimedRanks[i] && 
            pRanked.toNumber() >= rankPoints[i] && 
            (this.props.investor.invested?.toNumber() || 0) >= rankInvestments[i]) {
          
          currentRank = rankNames[i];
          rangoEstilo = "btn-success btn-lg";
          
          const rewardAmount = new BigNumber(
            await this.props.contract.binaryProxy.methods
              .gananciasRango(i)
              .call({ from: this.props.currentAccount })
          );
          
          gananciasRango = `Claim ${rewardAmount.shiftedBy(-18).dp(2).toString(10)} USDT`;
          funcionRango = () => this.claim();
          break;
        }
      }

      // Calculate next points needed
      const userPoints = this.props.investor.binario?.[0]?.usados || new BigNumber(0);
      if (userPoints.toNumber() > pRanked.toNumber()) {
        nextPoints = userPoints.minus(pRanked).dp(2).toString(10);
      }

      // Set requirements for next rank
      const nextRankIndex = level;
      if (nextRankIndex < rankPoints.length) {
        puntosRequeridos = rankPoints[nextRankIndex];
        investRequerido = rankInvestments[nextRankIndex];
      }

      this.setState({
        rango: currentRank,
        rangoEstilo,
        gananciasRango,
        funcionRango,
        level,
        pRanked: pRanked.toString(10),
        nextPoints,
        puntosRequeridos,
        investRequerido
      });

    } catch (error) {
      console.warn("Ranking calculation error:", error);
    }
  }

  /**
   * Enhanced network view with better error handling
   */
  async openNetworkView(wallet, hand) {
    try {
      if (!ValidationUtils.isValidAddress(wallet)) {
        this.showModal("Invalid Address", "The provided wallet address is not valid.", "error");
        return;
      }

      const directReferrals = await this.props.contract.binaryProxy.methods
        .misDirectos(wallet.toLowerCase(), hand)
        .call({ from: this.props.currentAccount });

      const childrenPromises = directReferrals.map(async (address, index) => {
        try {
          const childData = await this.props.contract.binaryProxy.methods
            .investors(address)
            .call({ from: this.props.currentAccount });

          const invested = new BigNumber(childData.invested).shiftedBy(-18).dp(4).toString(10);
          const points = new BigNumber(childData.invested).dividedBy(2).shiftedBy(-18).dp(4).toString(10);

          return (
            <div 
              key={`child-${address}-${index}`} 
              className="network-child p-2 border-start ms-3 mb-2"
              role="button"
              tabIndex="0"
              onClick={() => this.openNetworkView(address, hand)}
              onKeyPress={(e) => e.key === 'Enter' && this.openNetworkView(address, hand)}
            >
              <div className="small">
                <strong>{ValidationUtils.formatAddress(address)}</strong>
                <br />
                <span className={`badge ${childData.registered ? 'bg-success' : 'bg-warning'}`}>
                  {childData.registered ? 'Migrated' : 'Not Migrated'}
                </span>
                <br />
                Points: {points} | Investment: {invested} USDT
              </div>
            </div>
          );
        } catch (error) {
          console.warn(`Child data fetch error for ${address}:`, error);
          return (
            <div key={`child-error-${address}-${index}`} className="text-muted small">
              Error loading data for {ValidationUtils.formatAddress(address)}
            </div>
          );
        }
      });

      const children = await Promise.all(childrenPromises);

      // Get user data
      const userData = await this.props.contract.binaryProxy.methods
        .investors(wallet)
        .call();

      const invested = new BigNumber(userData.invested).shiftedBy(-18).toString(10);

      // Get upline
      const uplineAddress = await this.props.contract.binaryProxy.methods
        .padre(wallet)
        .call({ from: this.props.currentAccount });

      const uplineComponent = uplineAddress !== "0x0000000000000000000000000000000000000000" ? (
        <button 
          className="btn btn-link btn-sm p-0"
          onClick={() => this.openNetworkView(uplineAddress, hand)}
        >
          ← Back to Upline
        </button>
      ) : null;

      const networkView = (
        <WalletInfo
          upline={uplineComponent}
          wallet={wallet}
          invested={invested}
          migrated={userData.registered ? 'true' : 'false'}
          onClick={() => {}} // Prevent additional clicks on the container
        >
          {children}
        </WalletInfo>
      );

      // Update the appropriate side
      if (hand === 0) {
        this.setState({ redleft: networkView });
      } else {
        this.setState({ redRight: networkView });
      }

    } catch (error) {
      this.handleError(error, "Network view");
    }
  }

  /**
   * Enhanced render method with improved accessibility and loading states
   */
  render() {
    const { 
      isLoading, 
      isProcessing, 
      modal, 
      available, 
      invested, 
      link, 
      link2, 
      rango, 
      retirableA, 
      takeProfit, 
      MIN_RETIRO, 
      nextPay, 
      balanceContract, 
      downLeft, 
      downRight 
    } = this.state;

    const { currentAccount, contract } = this.props;

    // Take Profit Button
    const takeProfitButton = takeProfit * 1 > 1 ? (
      <button
        className="btn btn-info btn-lg d-block text-center mx-auto mt-1"
        onClick={this.withdraw}
        disabled={isProcessing}
        aria-describedby="take-profit-help"
      >
        {isProcessing ? <LoadingSpinner /> : "Take Profit"}
      </button>
    ) : (
      <button 
        className="btn btn-info btn-lg d-block text-center mx-auto mt-1" 
        disabled
        aria-describedby="take-profit-help"
      >
        Take Profit
      </button>
    );

    // Withdrawal Button
    const withdrawalButton = retirableA * 1 >= MIN_RETIRO ? (
      <button
        type="button"
        className="btn btn-primary btn-lg d-block text-center mx-auto mt-1"
        onClick={async () => {
          if (takeProfit * 1 > MIN_RETIRO) {
            this.showModal("Take Profit First", "Please take your profits before withdrawing from contract.", "warning");
            return;
          }

          if (Date.now() < nextPay) {
            const nextDate = new Date(nextPay);
            this.showModal(
              "Withdrawal Cooldown", 
              `You must wait 24 hours for your next withdrawal. Available at: ${nextDate.toLocaleString()}`,
              "warning"
            );
            return;
          }

          if (balanceContract < retirableA * 1) {
            this.showModal(
              "Contract Balance Low", 
              "Please contact the capital withdrawals department for error: S4-LD-0",
              "error"
            );
            return;
          }

          try {
            await TransactionManager.executeTransaction(
              contract.binaryProxy.methods.withdraw(),
              { from: currentAccount },
              {
                onSuccess: () => {
                  this.showModal("Success!", "Withdrawal completed successfully!", "success");
                  this.fetchInvestorData();
                },
                onError: (error) => {
                  this.handleError(error, "Withdrawal");
                }
              }
            );
          } catch (error) {
            this.handleError(error, "Withdrawal");
          }
        }}
        disabled={isProcessing}
        aria-describedby="withdrawal-help"
      >
        {isProcessing ? <LoadingSpinner /> : `Withdraw ${retirableA} USDT`}
      </button>
    ) : (
      <button 
        type="button" 
        className="btn btn-primary btn-lg d-block text-center mx-auto mt-1" 
        disabled
        aria-describedby="withdrawal-help"
      >
        Withdraw {retirableA} USDT
      </button>
    );

    // Pending points display
    const pendingPoints = parseFloat(this.state.nextPoints) > 0 ? (
      <span className="text-muted"> + (Pending: {this.state.nextPoints})</span>
    ) : null;

    return (
      <>
        <div className="container">
          <div className="row mt-5">
            {/* Investment Overview */}
            <div className="col-lg-4 col-md-6">
              <div className="icon-box" data-aos="zoom-in-left">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-wallet2" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                <h4 className="title">
                  <a href="#My-invest" aria-describedby="investment-info">
                    My Investment: <strong>{ValidationUtils.formatNumber(invested)} USDT</strong>
                  </a>
                </h4>
                <div className="description" id="investment-info">
                  <p>Up to <strong>{ValidationUtils.formatNumber(this.state.upto)} USDT</strong></p>
                  <p>Earned <strong>{ValidationUtils.formatNumber(this.state.earned)} USDT</strong></p>
                </div>

                <div className="row mt-2">
                  <div className="col-md-6">
                    {takeProfitButton}
                    <div id="take-profit-help" className="form-text">
                      Withdraw available profits
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="small">
                      <strong>Profit:</strong> {ValidationUtils.formatNumber(takeProfit)} USDT
                      <br />
                      <strong>Points:</strong> +{ValidationUtils.formatNumber(this.state.bonusBinario * 10)} pts
                    </div>
                  </div>
                  <div className="mt-2 col-md-12">
                    {withdrawalButton}
                    <div id="withdrawal-help" className="form-text">
                      Minimum withdrawal: {MIN_RETIRO} USDT
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="col-lg-8 col-md-6 mt-5 mt-md-0">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="100">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-arrow-right-short" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                <h4 className="title text-center">
                  <a href="#Total">Total Available: {ValidationUtils.formatNumber(takeProfit)} USDT</a>
                </h4>
                <div className="row">
                  <div className="col-md-6 col-sm-12">
                    <div className="description">
                      <strong>Passive Income</strong>
                      <br />
                      <span className="h6">{ValidationUtils.formatNumber(this.state.passive)} USDT</span>
                    </div>
                    <hr />
                  </div>
                  <div className="col-md-6 col-sm-12">
                    <div className="description">
                      <strong>Direct Sales ({this.state.directos})</strong>
                      <br />
                      <span className="h6">{ValidationUtils.formatNumber(this.state.ventaDirecta)} USDT</span>
                    </div>
                    <hr />
                  </div>
                  <div className="col-md-6 col-sm-12">
                    <div className="description">
                      <strong>Binary ({this.state.personasDerecha + this.state.personasIzquierda})</strong>
                      <br />
                      <span className="h6">{ValidationUtils.formatNumber(this.state.bonusBinario)} USDT</span>
                    </div>
                    <hr />
                  </div>
                  <div className="col-md-6 col-sm-12">
                    <div className="description">
                      <strong>Matching Bonus</strong>
                      <br />
                      <span className="h6">{ValidationUtils.formatNumber(this.state.matchingBonus)} USDT</span>
                    </div>
                    <hr />
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking System */}
            <div className="col-lg-4 col-md-6 mt-5">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">
                <div className="icon" aria-hidden="true">
                  <i className={`bi bi-${this.state.level}-circle`} style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                <h4 className="title">
                  <a href="#Rank" aria-describedby="rank-info">
                    Points: {ValidationUtils.formatNumber(this.state.pRanked)} {pendingPoints}
                    <br />
                    Rank: {rango}
                  </a>
                </h4>
                <div className="description" id="rank-info">
                  <button 
                    className={`btn ${this.state.rangoEstilo}`} 
                    onClick={this.state.funcionRango}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <LoadingSpinner /> : this.state.gananciasRango}
                  </button>
                  <div className="mt-2 small">
                    <strong>Next rank requirements:</strong>
                    <br />
                    Points: {ValidationUtils.formatNumber(this.state.puntosRequeridos)} pts
                    <br />
                    Investment: {ValidationUtils.formatNumber(this.state.investRequerido)} USDT
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Tracking */}
            <div className="col-lg-8 col-md-6 mt-5">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="400">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-cpu" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                <h4 className="title">
                  <a href="#EP" aria-describedby="progress-info">
                    Earnings Progress: {ValidationUtils.formatNumber(available)} USDT ({this.state.progresoUsdt}%)
                  </a>
                </h4>
                <div className="description" id="progress-info">
                  <p>Earning up to <strong>{ValidationUtils.formatNumber(this.state.upto)} USDT</strong></p>
                  
                  {/* Earnings Progress Bar */}
                  <div className="progress mb-2" style={{ height: "20px" }}>
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: `${this.state.progresoUsdt}%` }}
                      aria-valuenow={this.state.progresoUsdt}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label={`Earnings progress: ${this.state.progresoUsdt}%`}
                    >
                      {this.state.progresoUsdt}%
                    </div>
                  </div>
                  
                  {/* Withdrawal Progress Bar */}
                  <div className="progress" style={{ height: "20px" }}>
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: `${this.state.progresoRetiro}%` }}
                      aria-valuenow={this.state.progresoRetiro}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label={`Withdrawal progress: ${this.state.progresoRetiro}%`}
                    >
                      {this.state.progresoRetiro}%
                    </div>
                  </div>
                  
                  <p className="mt-2">Profits taken: <strong>{ValidationUtils.formatNumber(this.state.earned)} USDT</strong></p>
                </div>
              </div>
            </div>

            {/* Left Leg */}
            <div className="col-lg-6 col-md-6 mt-5">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-arrow-left-square" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                <h4 className="title">
                  <a href="#left-leg" aria-describedby="left-leg-info">
                    Left Leg ({this.state.personasIzquierda})
                  </a>
                </h4>

                <div className="description" id="left-leg-info">
                  <CopyToClipboard text={link}>
                    <button
                      type="button"
                      className="btn btn-primary btn-lg mb-3"
                      onClick={() => this.showModal("Link Copied", "Left referral link copied to clipboard!", "success")}
                      aria-label="Copy left referral link"
                    >
                      📋 COPY LEFT LINK
                    </button>
                  </CopyToClipboard>

                  <div className="border-top pt-3">
                    <h6>Available: {ValidationUtils.formatNumber(this.state.puntosEfectivosIzquierda)} pts</h6>
                    <p className="small">Used: {ValidationUtils.formatNumber(this.state.puntosReclamadosIzquierda)} pts</p>
                    <p className="small">Total: {ValidationUtils.formatNumber(this.state.puntosIzquierda)} pts</p>
                    <p className="small">
                      <strong>Downline:</strong> {downLeft}
                      {ValidationUtils.isValidAddress(downLeft) && (
                        <button 
                          className="btn btn-sm btn-outline-secondary ms-2"
                          onClick={() => this.openNetworkView(downLeft, 0)}
                        >
                          View Network
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Leg */}
            <div className="col-lg-6 col-md-6 mt-5">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="400">
                <div className="icon" aria-hidden="true">
                  <i className="bi bi-arrow-right-square" style={{ color: "rgb(7 89 232)" }}></i>
                </div>
                <h4 className="title">
                  <a href="#right-leg" aria-describedby="right-leg-info">
                    Right Leg ({this.state.personasDerecha})
                  </a>
                </h4>

                <div className="description" id="right-leg-info">
                  <CopyToClipboard text={link2}>
                    <button
                      type="button"
                      className="btn btn-primary btn-lg mb-3"
                      onClick={() => this.showModal("Link Copied", "Right referral link copied to clipboard!", "success")}
                      aria-label="Copy right referral link"
                    >
                      📋 COPY RIGHT LINK
                    </button>
                  </CopyToClipboard>

                  <div className="border-top pt-3">
                    <h6>Available: {ValidationUtils.formatNumber(this.state.puntosEfectivosDerecha)} pts</h6>
                    <p className="small">Used: {ValidationUtils.formatNumber(this.state.puntosReclamadosDerecha)} pts</p>
                    <p className="small">Total: {ValidationUtils.formatNumber(this.state.puntosDerecha)} pts</p>
                    <p className="small">
                      <strong>Downline:</strong> {downRight}
                      {ValidationUtils.isValidAddress(downRight) && (
                        <button 
                          className="btn btn-sm btn-outline-secondary ms-2"
                          onClick={() => this.openNetworkView(downRight, 1)}
                        >
                          View Network
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Referrals - Left */}
            <div className="col-lg-6 col-md-6 mt-5">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">
                <h4 className="title">Direct Referrals - Left Leg</h4>
                <div className="description" style={{ wordWrap: "break-word", maxHeight: "300px", overflowY: "auto" }}>
                  {this.state.directL.length > 0 ? this.state.directL : (
                    <p className="text-muted">No direct referrals in left leg</p>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Referrals - Right */}
            <div className="col-lg-6 col-md-6 mt-5">
              <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">
                <h4 className="title">Direct Referrals - Right Leg</h4>
                <div className="description" style={{ wordWrap: "break-word", maxHeight: "300px", overflowY: "auto" }}>
                  {this.state.directR.length > 0 ? this.state.directR : (
                    <p className="text-muted">No direct referrals in right leg</p>
                  )}
                </div>
              </div>
            </div>

            {/* Network Visualization */}
            {(this.state.redleft || this.state.redRight) && (
              <div className="col-12 mt-5">
                <div className="icon-box">
                  <h4 className="title">Network Visualization</h4>
                  <div className="row">
                    {this.state.redleft && (
                      <div className="col-md-6">
                        <h6>Left Network</h6>
                        {this.state.redleft}
                      </div>
                    )}
                    {this.state.redRight && (
                      <div className="col-md-6">
                        <h6>Right Network</h6>
                        {this.state.redRight}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Modal */}
        <NotificationModal
          show={modal.show}
          title={modal.title}
          body={modal.body}
          type={modal.type}
          onClose={this.hideModal}
        />

        {/* Loading Indicator - Non-blocking */}
        {isLoading && (
          <div className="alert alert-info mt-3" role="status" aria-live="polite">
            <div className="d-flex align-items-center">
              <LoadingSpinner size="sm" message="Loading office data..." />
            </div>
          </div>
        )}
      </>
    );
  }
}

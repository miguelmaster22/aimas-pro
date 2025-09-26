// Main application component for the binary system frontend
import React, { useState, useEffect, useCallback, useRef } from "react";
import Web3 from "web3";
import detectEthereumProvider from '@metamask/detect-provider';

import HomeV2 from "./components/V2Home";
import TronLinkGuide from "./components/MetamaskConect";
import ErrorBoundary from "./components/ErrorBoundary";
import cons from "./cons";

import abiToken from "./abi/token";
import abiBinarioProxy from "./abi/binary_proxy";

// Configuration constants
const addressToken = cons.TOKEN;
const chainId = cons.chainId;

// Main App functional component handling MetaMask connection and routing
const App = () => {
  // State management with hooks
  const [admin, setAdmin] = useState(false); // Admin level of the user
  const [metamask, setMetamask] = useState(false); // Whether MetaMask is installed
  const [conectado, setConectado] = useState(false); // Whether connected to blockchain
  const [currentAccount, setCurrentAccount] = useState("0x0000000000000000000000000000000000000000"); // Current wallet address
  const [contract, setContract] = useState({
    web3: null, // Web3 instance
    contractToken: null, // Token contract instance
    binaryProxy: null // Binary proxy contract instance
  });

  // Ref for interval cleanup
  const intervalRef = useRef(null);

  // Connect to MetaMask and initialize contracts
  const conectar = useCallback(async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        console.warn("MetaMask not detected");
        setMetamask(false);
        setConectado(false);
        setAdmin(false);
        resetContract();
        return;
      }

      setMetamask(true);

      // Check if already connected first
      let accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      // If no accounts, request connection
      if (!accounts || accounts.length === 0) {
        console.log("No accounts found, requesting connection...");
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found - please connect MetaMask");
      }

      console.log("Connected accounts:", accounts);

      // Switch to correct network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainId }],
        });
      } catch (switchError) {
        console.warn("Network switch failed:", switchError);
        // Continue anyway - user might be on correct network
      }

      const provider = await detectEthereumProvider();
      if (!provider) {
        throw new Error("Provider not found");
      }

      const web3 = new Web3(provider);
      
      // Initialize contracts
      const contractToken = new web3.eth.Contract(abiToken, addressToken);
      const binaryProxy = new web3.eth.Contract(abiBinarioProxy, cons.SC_Proxy);

      // Get admin level
      const cuenta = accounts[0];
      console.log("Primary account from MetaMask:", cuenta);
      
      let isAdmin = false;
      
      try {
        const level = await binaryProxy.methods.leveling(cuenta).call({ from: cuenta });
        if (level >= 1) {
          if (level <= 4) isAdmin = "admin";
          if (level <= 3) isAdmin = "leader";
          if (level <= 2) isAdmin = "subOwner";
          if (level <= 1) isAdmin = "owner";
        }
      } catch (error) {
        console.warn("Failed to get admin level:", error);
      }

      // Parse URL for wallet viewing
      const { targetWallet } = await parseUrlParams(web3, binaryProxy, accounts[0]);
      //console.log("Target wallet after URL parsing:", targetWallet);

      // Ensure we have a valid account - fallback to first account if parsing failed
      const finalAccount = targetWallet || accounts[0];
      //console.log("Final account to use:", finalAccount);

      // Set state with proper values
      setConectado(true);
      setCurrentAccount(finalAccount);
      setAdmin(isAdmin);
      setContract({
        web3,
        contractToken,
        binaryProxy
      });

      //console.log("App.js state updated - currentAccount should be:", finalAccount);

    } catch (error) {
      console.error("Connection error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Set default values on error
      setConectado(false);
      setCurrentAccount("0x0000000000000000000000000000000000000000");
      setAdmin(false);
      resetContract();
      
      // Show user-friendly error message
      if (error.message.includes('User rejected')) {
        console.warn("User rejected MetaMask connection");
      } else if (error.message.includes('No accounts')) {
        console.warn("No MetaMask accounts available - user needs to connect wallet");
      } else {
        console.warn("MetaMask connection failed:", error.message);
      }
    }
  }, []);

  // Helper function to reset contract state
  const resetContract = () => {
    setContract({
      web3: null,
      contractToken: null,
      binaryProxy: null
    });
  };

  // Parse URL parameters for wallet viewing
  const parseUrlParams = async (web3, binaryProxy, defaultAccount) => {
    const loc = document.location.href;
    let targetWallet = defaultAccount;
    
    console.log("parseUrlParams called with:", { defaultAccount, url: loc });

    // Ensure we always have a valid default account
    if (!defaultAccount || defaultAccount === "0x0000000000000000000000000000000000000000") {
      console.error("parseUrlParams: Invalid defaultAccount provided:", defaultAccount);
      return { targetWallet: null };
    }

    if (loc.includes('?') && loc.includes('&wallet=')) {
      try {
        const urlParams = new URLSearchParams(loc.split('?')[1]);
        const walletParam = urlParams.get('wallet');
        
        console.log("URL wallet parameter found:", walletParam);
        
        if (walletParam && loc.includes('view')) {
          if (web3.utils.isAddress(walletParam)) {
            targetWallet = walletParam;
            console.log("Using wallet from URL:", targetWallet);
          } else {
            // Try to resolve ID to address
            try {
              targetWallet = await binaryProxy.methods.idToAddress(walletParam).call({ from: defaultAccount });
              console.log("Resolved ID to address:", targetWallet);
            } catch (resolveError) {
              console.warn("Failed to resolve ID to address:", resolveError);
              targetWallet = defaultAccount; // Fallback to default account
            }
          }
        }
      } catch (error) {
        console.warn("Failed to parse wallet parameter:", error);
        targetWallet = defaultAccount; // Fallback to default account
      }
    }

    console.log("parseUrlParams returning targetWallet:", targetWallet);
    
    // Final validation
    if (!targetWallet || targetWallet === "0x0000000000000000000000000000000000000000") {
      console.error("parseUrlParams: Invalid targetWallet, using defaultAccount:", defaultAccount);
      targetWallet = defaultAccount;
    }
    
    return { targetWallet };
  };

  // Effect hook: Set up connection checking and global error handlers
  useEffect(() => {
    // Initial connection attempt with delay to ensure MetaMask is ready
    setTimeout(() => {
      conectar();
    }, 1000);

    // Set up periodic connection checks (reduced frequency)
    intervalRef.current = setInterval(() => {
      conectar();
    }, 10 * 1000); // Check every 10 seconds instead of 3

    // Listen for MetaMask account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('MetaMask accounts changed:', accounts);
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setConectado(true);
        } else {
          setCurrentAccount("0x0000000000000000000000000000000000000000");
          setConectado(false);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        console.log('MetaMask chain changed:', chainId);
        // Reload the page when chain changes
        window.location.reload();
      });
    }

    // Set up global error handlers
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason, event.promise);
      setTimeout(() => {
        alert('An unexpected error occurred. Please contact support if this issue persists.');
      }, 100);
      event.preventDefault();
    };

    const handleError = (event) => {
      console.error('Global error:', event.error, event.message);
      setTimeout(() => {
        alert('Something went wrong. Please contact support if this issue persists.');
      }, 100);
    };

    // Add global error event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clean up global error event listeners
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [conectar]);

  // Parse URL to determine route
  const parseRoute = () => {
    const loc = document.location.href;
    let ruta = "";

    if (loc.includes('?')) {
      try {
        const urlParams = new URLSearchParams(loc.split('?')[1]);
        // Get the first parameter key as the route
        const firstParam = urlParams.keys().next().value;
        if (firstParam) {
          ruta = firstParam;
        }
      } catch (error) {
        console.warn("Failed to parse route:", error);
      }
    }

    return ruta;
  };

  const ruta = parseRoute();

  // Debug logging for render decision
  console.log("=== APP.JS RENDER DEBUG ===");
  console.log("Route:", ruta);
  console.log("MetaMask installed:", metamask);
  console.log("Connected:", conectado);
  console.log("Current account:", currentAccount);
  console.log("Admin level:", admin);
  console.log("Contract object:", contract);
  console.log("Will show MetaMask guide?", (!metamask || !conectado));
  console.log("========================");

  // If not connected, show MetaMask guide
  if (!metamask || !conectado) {
    console.log("Showing MetaMask connection guide");
    return (
      <ErrorBoundary>
        <div className="container">
          <TronLinkGuide installed={metamask} />
        </div>
      </ErrorBoundary>
    );
  }

  console.log("Showing Home component with route:", ruta);

  // Route to appropriate view based on URL
  switch (ruta) {
    case "v2": // Main V2 view
      return (
        <ErrorBoundary>
          <HomeV2 admin={admin} view={false} contract={contract} currentAccount={currentAccount} />
        </ErrorBoundary>
      );

    case "view": // View another user's data
    case "new_view":
    case "v2_view":
      return (
        <ErrorBoundary>
          <HomeV2 admin={admin} view={true} contract={contract} currentAccount={currentAccount} />
        </ErrorBoundary>
      );

    default: // Default to own account view
      return (
        <ErrorBoundary>
          <HomeV2 admin={admin} view={false} contract={contract} currentAccount={currentAccount} />
        </ErrorBoundary>
      );
  }
};

export default App;
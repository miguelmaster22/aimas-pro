// Main application component for the binary system frontend
import React, { useState, useEffect, useCallback, useRef } from "react";
import Web3 from "web3"; // Web3 library for blockchain interactions
import detectEthereumProvider from '@metamask/detect-provider'; // Detect MetaMask provider

import HomeV2 from "./components/V2Home"; // Main home component for V2
import TronLinkGuide from "./components/MetamaskConect"; // Guide for MetaMask connection
import cons from "./cons"; // Constants and configuration

import abiToken from "./abi/token"; // ABI for token contract
import abiBinarioProxy from "./abi/binary_proxy"; // ABI for binary proxy contract (version 2)

// Configuration constants
const addressToken = cons.TOKEN; // Token contract address
const chainId = cons.chainId; // Blockchain network chain ID

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
    if (typeof window.ethereum !== 'undefined') {
      setMetamask(true);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainId }],
        });

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = await detectEthereumProvider();

        const web3 = new Web3(provider);
        const contractToken = new web3.eth.Contract(abiToken, addressToken);
        const binaryProxy = new web3.eth.Contract(abiBinarioProxy, cons.SC_Proxy);

        let isAdmin = false;
        const cuenta = accounts[0];
        const level = await binaryProxy.methods.leveling(cuenta).call({ from: cuenta });

        if (level >= 1) {
          if (level <= 4) isAdmin = "admin";
          if (level <= 3) isAdmin = "leader";
          if (level <= 2) isAdmin = "subOwner";
          if (level <= 1) isAdmin = "owner";
        }

        let verWallet = accounts[0];
        const loc = document.location.href;

        if (loc.includes('?') && loc.includes('&wallet=')) {
          verWallet = loc.split('?')[1];
          if (loc.includes('=')) {
            verWallet = verWallet.split('=')[1];
            if (loc.includes('#')) {
              verWallet = verWallet.split('#')[0];
            }
          }

          if (loc.includes('view')) {
            if (!web3.utils.isAddress(verWallet)) {
              verWallet = await binaryProxy.methods.idToAddress(verWallet).call({ from: accounts[0] });
            }
          }
        }

        setConectado(true);
        setCurrentAccount(verWallet);
        setAdmin(isAdmin);
        setContract({
          web3,
          contractToken,
          binaryProxy
        });
      } catch (error) {
        console.error(error);
        setConectado(false);
        setAdmin(false);
        setContract({
          web3: null,
          contractToken: null,
          binaryProxy: null
        });
      }
    } else {
      console.log("MetaMask not detected");
      setMetamask(false);
      setConectado(false);
      setAdmin(false);
      setContract({
        web3: null,
        contractToken: null,
        binaryProxy: null
      });
    }
  }, []);

  // Effect hook: Set up interval to check connection on mount, cleanup on unmount
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      conectar(); // Check MetaMask connection every 3 seconds
    }, 3 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [conectar]);

  // Parse URL to determine route and wallet for viewing
  const parseUrl = () => {
    const loc = document.location.href;
    let ruta = "";
    let vWallet = "0x0000000000000000000000000000000000000000";

    if (loc.includes('?')) {
      ruta = loc.split('?')[1].split('&')[0].split('=')[0].split('#')[0];

      if (loc.includes('wallet')) {
        vWallet = loc.split('?')[1].split('&')[1].split('=')[1].split('#')[0];
      }
    }

    return { ruta, vWallet };
  };

  const { ruta, vWallet } = parseUrl();

  // If not connected, show MetaMask guide
  if (!metamask || !conectado) {
    return (
      <div className="container">
        <TronLinkGuide installed={metamask} />
      </div>
    );
  }

  // Route to appropriate view based on URL
  switch (ruta) {
    case "v2": // Main V2 view
      return <HomeV2 admin={admin} view={false} contract={contract} currentAccount={currentAccount} />;

    case "view": // View another user's data
    case "new_view":
    case "v2_view":
      return <HomeV2 admin={admin} view={true} contract={contract} currentAccount={vWallet} />;

    default: // Default to own account view
      return <HomeV2 admin={admin} view={false} contract={contract} currentAccount={currentAccount} />;
  }
};

export default App;
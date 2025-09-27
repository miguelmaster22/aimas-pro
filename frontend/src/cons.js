// Configuration constants for the application
const env = process.env; // Environment variable
let proxy = ""; // Proxy URL (empty for direct connection)
let API = env.REACT_APP_URL_API; // API endpoint from environment


if( env.REACT_APP_ENV !== 'production' ){
  API = env.REACT_APP_URL_API_TEST || "http://localhost:8000/api/v1/"; // Local API endpoint for development
}


const WS = "0x0000000000000000000000000000000000000000"; // Default wallet for orphans

let SC_Proxy = "0xDF06438ab07c807fe3c1fBF1437DEf79BA8c1232"//"0x86bce12014a6c721156C536Be22DA7F30b6F33C1"; // Proxy contract V2 address

let TOKEN = "0x55d398326f99059fF775485246999027B3197955"; // Token contract address
let chainId = "0x38"; // BNB mainnet chain ID

const testnet = false; // Enable testnet configuration

// Switch to testnet if enabled
if (testnet) {
  proxy = ""; // No proxy for testnet
  API = process.env.REACT_APP_URL_API_2; // Testnet API endpoint
  SC_Proxy = "0x0000000000000000000000000000000000000000"; // Testnet proxy contract address
  TOKEN = "0xd5881b890b443be0c609BDFAdE3D8cE886cF9BAc"; // Testnet token
  chainId = "0x61"; // BNB testnet chain ID
}

// Export configuration object
const config = { proxy, API, WS, SC_Proxy, TOKEN, chainId };
export default config;

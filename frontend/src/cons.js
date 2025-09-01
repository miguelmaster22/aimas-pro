var proxy = "";
var API = process.env.REACT_APP_URL_API;

const WS = "0x0000000000000000000000000000000000000000"; //0x0000000000000000000000000000000000000000 recibe los huerfanos por defecto

var SC = "0x0000000000000000000000000000000000000000"; // Contrato V1

var SC_Proxy = "0x86bce12014a6c721156C536Be22DA7F30b6F33C1"; // contrato proxy nuevo v2

var TOKEN = "0x55d398326f99059fF775485246999027B3197955";
var chainId = "0x38"; // bnb mainnet

const testnet = false; // habilitar red de pruebas

if (testnet) {
  proxy = "";
  API = process.env.REACT_APP_URL_API_2;
  SC = "0xAb304aEbD091c3479C05029AB44f31C32D5dE4bd"; //Nuevo V2

  TOKEN = "0xd5881b890b443be0c609BDFAdE3D8cE886cF9BAc";
  chainId = "0x61"; // bnb testnet
}

export default { proxy, API, WS, SC, SC_Proxy, TOKEN, chainId };

/**
 * API Server for AIMAS PRO Binary System
 * Handles blockchain interactions, user data management, and binary network calculations
 */

// Core dependencies
const express = require("express"); // Web framework
const cors = require("cors"); // Cross-origin resource sharing
const { Web3 } = require("web3"); // Web3 library for blockchain
const Cryptr = require("cryptr"); // Encryption utility
const bodyParser = require("body-parser"); // Request body parsing
const BigNumber = require("bignumber.js"); // Precise decimal calculations
const mongoose = require('mongoose'); // MongoDB ODM
const cron = require('node-cron'); // Scheduled tasks
require("dotenv").config(); // Environment variables

// Utility function for delays
function delay(s) { return new Promise(res => setTimeout(res, s * 1000)); }

// Database and configuration constants
const uriMongoDB = process.env.NODE_ENV === 'production' ? process.env.APP_URIMONGODB: process.env.APP_URIMONGODB_TEST ; // MongoDB connection string
const WalletVacia = "0x0000000000000000000000000000000000000000"; // Empty wallet address
const factorBlock = 1.5; // Gas price multiplier for transactions
const factorFail = 30; // Gas price for failed transactions
const factorPuntos = 100; // Points factor for investments

// Global data structures for binary network
let allbinario = []; // All binary users
let binarioindexado = []; // Indexed binary users

let appReady = false; // Application readiness flag

// Scheduled task: Update binary network every hour
cron.schedule('0 0 */1 * * *', async () => {
  console.log('running a task every Hour scan Binary');

  appReady = false; // Mark app as not ready during update

  await consultarBinario(); // Fetch current binary data
  await escalarRedV2(["0x04302e4e19552635eadd013efe54e10f30ba1bf2"]); // Scale network
  await consultarBinario(); // Refresh data

  console.log('end task every Hour ');

}, null, true, 'America/Bogota');


// Mongoose schema for binary system user data
const Schema = mongoose.Schema;

const Binario = new Schema({
  _id: String, // Unique identifier
  wallet: String, // User's wallet address
  registered: Boolean, // Registration status
  invested: String, // Total invested amount
  invested_leader: String, // Leader investment amount
  upTo: String, // Maximum earnings potential
  lastUpdate: Number, // Last update timestamp
  reclamados: String, // Total claimed points
  referer: String, // Referrer wallet
  up: String, // Upline wallet
  left: String, // Left downline wallet
  lReclamados: String, // Left claimed points
  lExtra: String, // Left extra points
  lPersonas: String, // Left downline count
  lPuntos: String, // Left total points
  right: String, // Right downline wallet
  rReclamados: String, // Right claimed points
  rExtra: String, // Right extra points
  rPersonas: String, // Right downline count
  rPuntos: String, // Right total points
  idBlock: Number, // Block ID
  idBlock_old: Number, // Old block ID
  puntosActivos: String, // Active points
  hand: Number, // Hand position (0=left, 1=right)
  retirableA: Number // Withdrawable amount
});

const binario = mongoose.model('binari_system', Binario, 'binari_system'); // Binary system model

// Function to wait for app readiness
async function evalAplicacion() {
  while (!appReady) {
    await delay(3); // Wait 3 seconds
    console.log("app no lista"); // App not ready
  }
  return appReady;
}

// Express app setup
const app = express();
//app.use(cors()) // CORS disabled, using custom headers
app.use(async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT"); // Allowed methods
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); // Allowed headers
  next();
});

app.use(bodyParser.json()); // Parse JSON bodies

const port = process.env.PORT || "8000"; // Server port

// Contract configuration
const abiContrato = require("./binaryV2.js"); // ABI for V2 binary contract
const addressContrato = "0x86bce12014a6c721156C536Be22DA7F30b6F33C1"; // Proxy contract address
const WALLET_API = "0x6b78C6d2031600dcFAd295359823889b2dbAfd1B"; // API wallet address

// Blockchain network configuration
const RED = process.env.APP_RED || "https://bsc-dataseed.binance.org/"; // Primary RPC endpoint
let redes = ["https://bsc-dataseed1.binance.org/", "https://bsc-dataseed2.binance.org/", "https://bsc-dataseed3.binance.org/", "https://bsc-dataseed4.binance.org/"]; // Backup RPC endpoints

let account_1_priv = "0x" + process.env.REACT_APP_PRIVATE_KY || null; // Private key for transactions

const KEY = process.env.REACT_APP_ENCR_STO || "AAAAAAAAAAAAAAAA";
const cryptr = new Cryptr(KEY);
const TOKEN = process.env.REACT_APP_API_KEY || "1234567890";

const RUTA = "/api/v1/";

let web3 = new Web3(RED); // demas funciones
let web3_1 = new Web3(redes[0]); // contrato nuevo
let web3_2 = new Web3(redes[1]); // contrato viejo
let web3_3 = new Web3(redes[2]);

//console.log(web3.eth.accounts.create())

if (account_1_priv === null) {
  console.log("no hay llave privada")
  let newAccount = web3.eth.accounts.create();
  console.log("nueva cuenta: ", newAccount.address)
  console.log("nueva llave: ", newAccount.privateKey)
  account_1_priv = newAccount.privateKey; //
}

// Add private key to Web3 wallets for transaction signing
web3.eth.accounts.wallet.add(account_1_priv);
web3_1.eth.accounts.wallet.add(account_1_priv);
web3_2.eth.accounts.wallet.add(account_1_priv);
web3_3.eth.accounts.wallet.add(account_1_priv);

let nonces = 0; // Transaction nonce counter
let gasPrice = "1000000000"; // Default gas price (1 gwei)

// Initialize contract instance
let contrato = new web3_1.eth.Contract(abiContrato, addressContrato, { // New proxy contract
  from: WALLET_API, // Default sender address
  //gasPrice: '3000000000' // Default gas price (optional)
});

// Get current gas price from network
web3_3.eth
  .getGasPrice()
  .then((g) => {
    gasPrice = g; // Update gas price
  })
  .catch((e) => {
    console.log(e); // Log errors
  });

nonce(0); // Initialize nonce

web3_3.eth.getBalance(WALLET_API).then(async (r) => {
  r = new BigNumber(r).shiftedBy(-18)
  console.log("balance: " + r.toString(10) + " BNB")

  if (r.toNumber() > 0.3) {
    let evio = r.minus(0.2)
    /*
        let rawTransaction = {
          "from": WALLET_API,
          "nonce": await nonce(0),
          "gasPrice": web3.utils.toHex(gasPrice * 1e9),
          "gasLimit": web3.utils.toHex(gasLimit),
          "to": toAddress,
          "value": amountToSend
        }
    */
    console.log("Enviar a Binance: " + evio.toString(10) + " BNB")

  }

})

async function nonce() {
  let activo = await web3_3.eth.getTransactionCount(WALLET_API, "pending"); // Get pending nonce from network

  gasPrice = new BigNumber(await web3_3.eth.getGasPrice()); // Update current gas price

  console.log("gas: " + gasPrice.toString(10) + " factor: " + factorBlock);

  if (activo > nonces) {
    nonces = activo; // Sync with network nonce
  } else {
    nonces++; // Increment local nonce
  }

  return nonces;
}


// Encrypt string for secure API communication
function encryptString(s) {
  if (typeof s === "string") {
    return cryptr.encrypt(s);
  } else {
    return {};
  }
}

// Decrypt string for secure API communication
function decryptString(s) {
  if (typeof s === "string") {
    return cryptr.decrypt(s);
  } else {
    return {};
  }
}

iniciarAplicacion(); // Start application initialization

async function iniciarAplicacion() {
  if (!appReady) {
    await mongoose.connect(uriMongoDB)
      .then(async () => {
        console.log("MongoDB Connected"); // Connection successful
        console.log(">---- App Ready! -------<"); // App initialization complete
      });
  }
  return appReady;
}

// Basic routes
app.get("/", (req, res) => {
  res.send("API AIMAS PRO"); // Root endpoint
});

app.get('/health', (req, res) => {
  res.send("ok"); // Health check endpoint
});

app.get(RUTA, (req, res) => {
  res.send({ online: true }); // API status endpoint
});


async function hacerTakeProfit(wallet) {

  wallet = wallet.toLowerCase()

  let result = {
    result: false,
  };

  let retBinario = new BigNumber(0);
  let user = null
  let newUser = {}

  try {
    user = await binario.findOne({ wallet }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  let puntosL = new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0)
  let puntosR = new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0)

  //puntos que ha ganado hasta el momento
  let puntosReclamados = puntosL.toNumber() <= puntosR.toNumber() ? puntosL : puntosR

  //sobre estos puntos calcula lo que puede retirar en USDT
  let retBin = retirableBinario(puntosL.toString(10), puntosR.toString(10))

  let puntosUsados = new BigNumber(0)

  if (new BigNumber(retBin).toNumber() <= 0) {
    retBin = 0
  } else {
    newUser.lReclamados = new BigNumber(user.lReclamados).plus(puntosReclamados).toString(10)
    newUser.rReclamados = new BigNumber(user.rReclamados).plus(puntosReclamados).toString(10)


    puntosUsados = new BigNumber(newUser.lReclamados)

  }

  retBinario = retBin

  let pRango = new BigNumber(0)

  let rangoArray = []

  for (let index = 0; index < 12; index++) {
    rangoArray[index] = await contrato.methods
      .rangoReclamado(wallet, 0)
      .call()
      .then((r) => {
        //console.log(index, r);
        return r;
      })
      .catch((e) => {
        console.log(e.toString());
        return false;
      });

  }

  let truerango = true;

  if (truerango) {
    pRango = puntosUsados
  }

  let gas = await contrato.methods
    .corteBinarioDo(wallet, retBinario, pRango.toString(10), 0)
    .estimateGas({ from: WALLET_API }); // gas: 1000000});

  await contrato.methods
    .corteBinarioDo(wallet, retBinario, pRango.toString(10), 0)
    .send({ gasPrice: gasPrice.toString(10), gas: gas })
    .then(async (r) => {
      await binario.updateOne({ wallet }, newUser)
      console.log("Corte Binario: " + wallet)

      result.hash = r.transactionHash;
      result.result = true;
      result.error = false;
      console.log("Registro Retiro " + wallet);
    })
    .catch(async (e) => {
      let error = e.toString()
      if (error.indexOf("Transaction Hash: ") >= 0) {
        await binario.updateOne({ wallet: wallet }, newUser)
        console.log("Corte Binario (2): " + wallet)

        result.hash = "operation processing is in progress please be patient";
        result.result = true;
        result.error = false;
        console.log("Registro Retiro " + wallet);

      } else {
        console.error(e);
        console.log("RR Fallo " + wallet);
        result.result = false;
        result.error = true;
        result.message = e.toString();

      }

    });


  consultarUsuario(wallet, true)

  return result;
}

app.post(RUTA + "retiro", async (req, res) => {
  let result = {
    result: false,
  };

  if (typeof req.body.data === "string") {
    var data = JSON.parse(decryptString(req.body.data));

    if (
      data.token == TOKEN &&
      data.fecha + 5 * 60 * 1000 >= Date.now() &&
      data.origen === "web-kapp3"
    ) {
      result = await hacerTakeProfit(data.wallet)
    }
  }

  res.send(result);
});

async function estimateRetiro(wallet) {
  wallet = wallet.toLowerCase();

  let result = {
    result: false,
  };

  var retBinario = new BigNumber(0);

  let user = await consultarUsuario(wallet, true)

  let puntosL = new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0)
  let puntosR = new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0)

  let reclamados = puntosL <= puntosR ? puntosL : puntosR

  let retBin = retirableBinario(puntosL, puntosR) <= 0 ? 0 : retirableBinario(puntosL, puntosR)

  retBinario = new BigNumber(retBin)

  await contrato.methods.corteBinarioDo(wallet, retBinario.toString(10), reclamados.plus(user.lReclamados).toString(10), "0").estimateGas({ from: WALLET_API })
    .then((r) => {
      result.result = true;
      result.gas = new BigNumber(r).times(gasPrice).times(factorBlock);
      result.error = false;
      console.log(
        "calculo Retiro: " + wallet + " - " + retBinario.toString(10) + " | " + new BigNumber(r).toString(10)
      );
    })
    .catch((e) => {
      result.result = true;
      result.gas = new BigNumber(21000).times(gasPrice).times(factorFail);
      result.error = true;
      result.message = e.toString();
      console.log(result.message);
    });

  return result;

}

app.post(RUTA + "calculate/retiro", async (req, res) => {
  let result = {
    result: false,
    error: true,
    message: "do nothing"
  };

  if (typeof req.body.data === "string") {
    var data = JSON.parse(decryptString(req.body.data));


    if (data.token == TOKEN) {
      result = await estimateRetiro(data.wallet);
    }
  }

  res.send(result);
});


app.get(RUTA + "binario/todo", async (req, res) => {
  let result = {
    result: true,
    data: allbinario
  };

  res.send(result);
});

function retirableBinario(puntosA, puntosB) {

  puntosA = new BigNumber(puntosA).toNumber()
  puntosB = new BigNumber(puntosB).toNumber()

  let amount = puntosA <= puntosB ? puntosA : puntosB;

  return new BigNumber(amount).times(10).dividedBy(100).dp(0).toString(10)

}

async function binariV2(wallet) {
  wallet = (wallet).toLocaleLowerCase()

  let newUser = {}

  let userTemp = await binario.findOne({ wallet: wallet })

  let puntosIz = new BigNumber(0)
  let puntosDe = new BigNumber(0)

  let personasIz = new BigNumber(0)
  let personasDe = new BigNumber(0)

  /// recordar restar puntos Extra de cada lado

  if (userTemp !== null) {
    if (userTemp.left !== undefined) {
      if (userTemp.left !== WalletVacia) {

        await consultarUsuario(userTemp.left, false, true)

        let uleft = await binario.findOne({ wallet: userTemp.left })

        if (uleft !== null) {
          if (uleft.lPuntos !== undefined && uleft.rPuntos !== undefined) {
            // divide la cantidad de puntos a la mitad || verificar
            puntosIz = puntosIz.plus(uleft.invested).times(factorPuntos).dividedBy(100)
            puntosIz = puntosIz.plus(uleft.lPuntos).plus(uleft.rPuntos)

            if (puntosIz.toNumber() > new BigNumber(userTemp.lPuntos).toNumber()) {
              newUser.lPuntos = puntosIz.toString(10)
            }

            personasIz = personasIz.plus(1).plus(uleft.lPersonas).plus(uleft.rPersonas)

            if (personasIz.toNumber() > new BigNumber(userTemp.lPersonas).toNumber()) {
              newUser.lPersonas = personasIz.toString(10)
            }

          }
        }

      } else {
        newUser.lPuntos = "0"
        newUser.lPersonas = "0"
      }
    } else {
      newUser.lPuntos = "0"
      newUser.lPersonas = "0"
    }

    if (userTemp.right !== undefined) {
      if (userTemp.right !== WalletVacia) {

        await consultarUsuario(userTemp.right, false, true)

        let uright = await binario.findOne({ wallet: userTemp.right })

        if (uright !== null) {
          if (uright.lPuntos !== undefined && uright.rPuntos !== undefined) {
            // divide la cantidad de puntos a la mitad || verificar
            puntosDe = puntosDe.plus(uright.invested).times(factorPuntos).dividedBy(100);
            puntosDe = puntosDe.plus(uright.lPuntos).plus(uright.rPuntos);

            if (puntosDe.toNumber() > new BigNumber(userTemp.rPuntos).toNumber()) {
              newUser.rPuntos = puntosDe.toString(10)
            }

            personasDe = personasDe.plus(1).plus(uright.lPersonas).plus(uright.rPersonas)

            if (personasDe.toNumber() > new BigNumber(userTemp.rPersonas).toNumber()) {
              newUser.rPersonas = personasDe.toString(10)
            }

          }
        }

      } else {
        newUser.rPuntos = "0"
        newUser.rPersonas = "0"
      }
    } else {
      newUser.rPuntos = "0"
      newUser.rPersonas = "0"
    }


  } else {
    consultarUsuario(wallet, true, true, true);

  }

  await binario.updateOne({ wallet: wallet }, newUser)


  //puntos activos

  if (userTemp !== null && userTemp.left !== undefined && userTemp.right !== undefined) {

    newUser = {}

    userTemp = await binario.findOne({ wallet: wallet })

    let pL = new BigNumber(userTemp.lPuntos).plus(userTemp.lExtra).minus(userTemp.lReclamados)
    let pR = new BigNumber(userTemp.rPuntos).plus(userTemp.rExtra).minus(userTemp.rReclamados)

    if (pL.toNumber() < pR.toNumber()) {
      newUser.puntosActivos = pL.toString(10)

    } else {
      newUser.puntosActivos = pR.toString(10)
    }

    //console.log(newUser)

    await binario.updateOne({ wallet: wallet }, newUser)
  }

  return true

}

app.get(RUTA + "usuario/actualizar", async (req, res) => {

  let result = {
    result: false
  };

  //console.log(req.query)

  if (req.query.wallet) {

    let wallet = (req.query.wallet).toString().toLocaleLowerCase()

    consultarUsuario(wallet, true, true)

    result.result = true


  } else {

    result = {
      result: false,
      error: true,
      msg: "not valid wallet parameter"
    };
  }


  res.send(result);
});

app.get(RUTA + "binario/actualizar", async (req, res) => {

  let result = {
    result: false
  };

  if (req.query.wallet) {

    let wallet = (req.query.wallet).toString().toLocaleLowerCase()

    await binariV2(wallet)

    result.result = true

  } else {

    result = {
      result: false,
      error: true,
      msg: "not valid wallet parameter"
    };
  }


  res.send(result);
});

async function lecturaBinari(wallet) {

  await consultarUsuario(wallet, true)
  let user = await binario.findOne({ wallet: wallet }, { _id: false })

  let consulta = {
    result: false,
  }

  if (user != null) {

    let puntosL = new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0).toString(10)
    let puntosR = new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0).toString(10)


    let retBin = retirableBinario(puntosL, puntosR)
    if (new BigNumber(retBin) < 0) {
      retBin = "0"
    }


    consulta = {
      result: true,
      data: {
        retirableBinario: retBin,
        upline: user.up,
        invested: user.invested,
        invested_leader: user.invested_leader,
        upTo: user.upTo,
        left: {
          dowline: user.left,
          puntos: new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0).toString(10),
          usados: user.lReclamados,
          total: new BigNumber(user.lPuntos).plus(user.lExtra).dp(0).toString(10),
          personas: parseInt(user.lPersonas)
        },
        right: {
          dowline: user.right,
          puntos: new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0).toString(10),
          usados: user.lReclamados,
          total: new BigNumber(user.rPuntos).plus(user.rExtra).dp(0).toString(10),
          personas: parseInt(user.rPersonas)
        }
      }
    }


  }

  //console.log(consulta)
  return consulta;

}

app.get(RUTA + "binario", async (req, res) => {

  let result = {
    result: false
  };


  if (req.query.wallet) {

    let wallet = (req.query.wallet).toString().toLocaleLowerCase()

    result = await lecturaBinari(wallet)


  } else {

    result = {
      result: false,
      error: true,
      msg: "not valid wallet parameter"
    };
  }


  res.send(result);
});

async function consultarBinario() {
  let red = []

  try {

    red = await binario.find({}, { _id: false })

    if (red.length > 0) {

      console.log("Inicia reduce")
      let inicio = Date.now()
      appReady = false
      binarioindexado = [];
      binarioindexado = red.reduce((acc, el, index) => {
        acc[el.wallet] = el;
        if (index == red.length - 1) {
          appReady = true
          console.log("Termino reduce: " + ((Date.now() - inicio) / 1000) + " seg")
          console.log("statusApp->" + appReady)

        }

        return acc
      }, red[0])


    }


  } catch (error) {
    console.log(error.toString())
  }
  //console.log(red)

  return appReady

}

app.post(RUTA + "puntos/add", async (req, res) => {

  let result = {
    result: false,
  };

  if (typeof req.body.data === "string") {
    var data = JSON.parse(decryptString(req.body.data));

    if (data.token == TOKEN && data.puntos) {

      let user = await binario.findOne({ wallet: (data.wallet).toLocaleLowerCase() }, { _id: false })

      let newUser = {}

      if (data.hand === 0) {
        newUser = {
          lExtra: new BigNumber(user.lExtra).plus(data.puntos).toString(10)
        }

      } else {
        newUser = {
          rExtra: new BigNumber(user.rExtra).plus(data.puntos).toString(10)
        }
      }

      await binario.updateOne({ wallet: (data.wallet).toLocaleLowerCase() }, newUser)
      console.log("puntos asignados: " + (data.wallet).toLocaleLowerCase() + " hand: " + data.hand + " -> " + data.puntos)

      await consultarUsuario((data.wallet).toLocaleLowerCase(), true, true, true)

      result.result = true
    }
  }

  res.send(result);
})

async function escalarRedV2() {

  let lista2 = await binario.find({}, { wallet: true, idBlock: true }).sort({ idBlock: -1 })

  console.log("---- V2 Start Loop / escalar red LISTA ----")

  for (let index = 0; index < lista2.length; index++) {
    //console.log(index, lista2[index].wallet, lista2[index].idBlock)
    await delay(0.4);
    await conectarUpline(lista2[index].wallet)
    await binariV2(lista2[index].wallet)

  }

  console.log("----v2 END Loop / escalar red ----")

}

async function conectarUpline(from) {
  from = from.toLowerCase()

  let newUser = {}

  let userRef = null
  let userTemp = null;

  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  if (userTemp === null) return false;

  //cambiar esto por metodo de consulta a base de datos mitigar error api binance por muchas consultas
  let consulta = await contrato.methods.upline(from).call()
    .catch((e) => {
      console.log("Error consulta binance " + e.toString())
      return false
    })

  if (consulta === false) return false;

  let hand = parseInt(consulta._lado);
  let referer = (consulta._referer).toLowerCase();

  try {
    userRef = await binario.findOne({ wallet: referer }, { _id: false })
  } catch (error) {
    console.log(error.toString())
  }

  let result = false

  if (userRef !== null) {
    if (referer !== WalletVacia) {
      newUser.referer = referer

      if (userTemp.up === userTemp.wallet) {
        newUser.up = WalletVacia
      }

      if (userTemp.referer !== WalletVacia && userTemp.up === WalletVacia) {

        //console.log("user: " + from + " up: " + userTemp.up + " hand: " + hand + " padre: " + padre)
        //if (userTemp.up === WalletVacia ) {}

        //console.log("<<<<< upline no coneted: " + from + ">>>>>")
        if (parseInt(hand) === 0) {
          let ubication = null
          try {
            ubication = await binario.find({ left: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          if (ubication.length >= 1) {

            if (ubication.length === 1) {

              if (userTemp.up !== ubication[0].wallet) {
                console.log("Ubicado izquierda largo1 " + from + " up: " + ubication[0].wallet)
                await binario.updateOne({ wallet: from }, { up: ubication[0].wallet })
              }


            } else {

              console.log("eliminando izquierda  " + ubication.length + " " + from)

              // debe de encontrarse el correcto y eliminar el registro de los demas
              //console.log(ubication)
              let menor = ubication[0].idBlock;
              let ganador = 0;
              for (let index = 0; index < ubication.length; index++) {
                if (ubication[index].idBlock !== 0) {

                  if (ubication[index].idBlock < menor) {
                    menor = ubication[index].idBlock;
                    ganador = index;
                  }
                }
              }

              await binario.updateOne({ wallet: from }, { up: ubication[ganador].wallet })

              for (let index = 0; index < ubication.length; index++) {
                if (index !== ganador) {
                  await binario.updateOne({ wallet: ubication[ganador].wallet }, { left: WalletVacia, lPuntos: "0" })

                }

              }

            }

          } else {
            // debe ubicarlo en alguna parte del binario
            console.log(">Ubicando izquierda " + from + " ref: " + referer)
            let accion = 0
            let lista = []

            let buscando = referer;// wallet del uperline

            while (accion === 0) {
              try {
                userRef = await binario.findOne({ wallet: buscando }, { _id: false })
              } catch (error) {
                console.log(error.toString())
              }

              if (userRef === null) {
                consultarUsuario(userRef.wallet)
                accion = 4
                break;
              }

              if (userRef.left === from) {
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 1
                break;
              }


              if (userRef.left === WalletVacia && userRef.wallet !== from) {

                await binario.updateOne({ wallet: userRef.wallet }, { left: from })
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 2
                break;

              }

              if (lista.indexOf(userRef.wallet) === -1) {
                lista.push(userRef.wallet)
              } else {

                await binario.updateOne({ wallet: userRef.wallet }, { left: WalletVacia, lPuntos: "0" })

                accion = 5
                break;

              }

              buscando = userRef.left


            }

            console.log(">Termina ubicación izquierda accion:" + accion + " " + from + " ^ " + buscando)

          }

          let adverso = null
          try {
            adverso = await binario.find({ right: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          for (let index = 0; index < adverso.length; index++) {
            await binario.updateOne({ wallet: adverso[index].wallet }, { right: WalletVacia, rPuntos: "0" })
          }

        }

        if (parseInt(hand) === 1) {
          let ubication = null
          try {
            ubication = await binario.find({ right: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          if (ubication.length >= 1) {

            if (ubication.length === 1) {
              if (userTemp.up !== ubication[0].wallet) {
                console.log("Ubicado derecha largo1 " + from + " ref: " + referer)
                await binario.updateOne({ wallet: from }, { up: ubication[0].wallet })
              }
            } else {

              console.log("eliminando derecha  " + ubication.length + " " + from)

              let menor = ubication[0].idBlock;
              let ganador = 0;
              for (let index = 0; index < ubication.length; index++) {
                if (ubication[index].idBlock !== 0) {
                  if (ubication[index].idBlock < menor) {
                    menor = ubication[index].idBlock;
                    ganador = index;
                  }
                }

              }

              await binario.updateOne({ wallet: from }, { up: ubication[ganador].wallet })

              for (let index = 0; index < ubication.length; index++) {
                if (index !== ganador) {
                  await binario.updateOne({ wallet: ubication[ganador].wallet }, { right: WalletVacia, rPuntos: "0" })

                }

              }

            }

          } else {
            // debe ubicarlo en alguna parte del binario
            console.log(">Ubicando derecha " + from)
            let accion = 0
            let lista = []
            let buscando = referer;// wallet del uperline

            while (accion === 0) {
              try {
                userRef = await binario.findOne({ wallet: buscando }, { _id: false })
              } catch (error) {
                console.log(error.toString())
              }

              if (userRef === null) {
                consultarUsuario(buscando)
                accion = 4
                break;
              }

              if (userRef.right === from) {
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 1
                break;
              }


              if (userRef.right === WalletVacia && userRef.wallet !== from) {

                await binario.updateOne({ wallet: userRef.wallet }, { right: from })
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 2
                break;

              }

              if (lista.indexOf(buscando) === -1) {
                lista.push(buscando)
              } else {

                await binario.updateOne({ wallet: buscando }, { right: WalletVacia, rPuntos: "0" })

                accion = 5
                break;

              }

              buscando = userRef.right


            }

            console.log(">Termina ubicación derecha accion:" + accion + " " + from + " ^ " + buscando)

          }

          let adverso = null
          try {
            adverso = await binario.find({ left: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          for (let index = 0; index < adverso.length; index++) {
            await binario.updateOne({ wallet: adverso[index].wallet }, { left: WalletVacia, lPuntos: "0" })
          }

        }
      }



    } else {
      console.log("wallet: " + from + " sin referer valido: " + referer)
    }

    await binario.updateOne({ wallet: from }, newUser);
    await consultarUsuario(from, true);

  } else {
    //console.log(from + " no existe, Upline: " + upline._referer+" wallet vacia no registrado")
    if (referer !== WalletVacia) {
      consultarUsuario(referer, true, true);
    }

    result = true
  }

  userTemp = await binario.findOne({ wallet: from }, { _id: false })


  if (from !== WalletVacia && !userTemp.registered && userTemp.lReclamados === "0" && userTemp.rReclamados === "0") {
    //await binario.deleteOne({ wallet: from })
    console.log("se deberia borrar: from:  " + from)

  }

  return result;
}

async function crearUsuario(from) {
  from = from.toLowerCase()

  let userTemp = null;
  let result = false

  let investor = { registered: false }
  let investorNew = { registered: false }

  let newUser = {}

  let invertidoReal = new BigNumber(0)

  try {
    investorNew = await contrato.methods.investors(from).call()

  } catch (error) { }

  if (investor.registered) {
    invertidoReal = new BigNumber(investor.invested)
  }


  let invertido = new BigNumber(0)
  let leader = new BigNumber(0)
  let upTo = new BigNumber(0)

  if (investorNew.registered) {

    let depositos = await contrato.methods.verListaDepositos(from).call();

    for (let index = 0; index < depositos.length; index++) {
      let dep = new BigNumber(depositos[index].valor)

      if (depositos[index].pasivo) {
        invertido = invertido.plus(dep)
      } else {
        leader = leader.plus(dep)
      }

      let temp = dep.times(depositos[index].factor).dividedBy(100)

      upTo = upTo.plus(temp)

    }

    if (leader.toNumber(0) > 0) {
      if (invertido.toNumber() > invertidoReal.toNumber()) {
        invertidoReal = invertido;
      }
    } else {
      invertidoReal = investorNew.invested
    }



  }
  newUser.invested_leader = leader.toString(10)

  newUser.invested = invertidoReal.toString(10)


  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }


  if (userTemp === null) {

    newUser = {
      wallet: from,
      registered: false,
      invested: newUser.invested,
      invested_leader: newUser.invested_leader,
      upTo: upTo.toString(10),
      referer: WalletVacia,
      up: WalletVacia,
      left: WalletVacia,
      lReclamados: "0",
      lExtra: "0",
      right: WalletVacia,
      rReclamados: "0",
      rExtra: "0",
      lPuntos: "0",
      rPuntos: "0",
      lPersonas: "0",
      rPersonas: "0",
      idBlock: 0,
      idBlock_old: 0,
      puntosActivos: "0"

    }

    if (investorNew.registered) {
      newUser.registered = true

      newUser.idBlock = parseInt(await contrato.methods.addressToId(from).call())

      let consulta = await contrato.methods.upline(from).call();
      newUser.referer = (consulta._referer).toLowerCase();
    }

    if (investor.registered) {

      //newUser.left = (investor.hands.lReferer).toLowerCase()
      //newUser.right = (investor.hands.rReferer).toLowerCase()

      newUser.lReclamados = new BigNumber(investor.hands.lReclamados).toString(10)
      newUser.lExtra = new BigNumber(investor.hands.lExtra).toString(10)

      newUser.rReclamados = new BigNumber(investor.hands.rReclamados).toString(10)
      newUser.rExtra = new BigNumber(investor.hands.rExtra).toString(10)

    }

    newUser._id = from

    let saveuser = new binario(newUser)

    try {
      userTemp = await binario.findOne({ wallet: from }, { _id: false })

    } catch (error) {
      console.log(error.toString())
    }
    if (userTemp === null) {
      await saveuser.save().then(() => {
        console.log("User Created: " + newUser.wallet);

      }).catch((e) => {
        console.log(e.toString())
      })
    }

    result = newUser
  } else {

    await binario.updateOne({ wallet: from }, newUser)

    try {
      userTemp = await binario.findOne({ wallet: from }, { _id: false })

    } catch (error) {
      console.log(error.toString())
    }

    result = userTemp

  }

  return result;

}

async function consultarUsuario(from, agregateBinario, updateInfoBlockchain, conectarUp) {
  from = from.toLowerCase()

  if (from === "0x0000000000000000000000000000000000000000") return {};

  let userTemp = null;

  if (updateInfoBlockchain) {
    await actualizarUsuario(from, {}, false) /// deshabilitar recuecuperacion reclamado del v1
  }

  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  if (userTemp === null) {
    userTemp = await crearUsuario(from)
  }

  if (agregateBinario) {
    binarioindexado[from] = userTemp
    //console.log("Actualizado localmente: " + from)

  }

  if (conectarUp) {
    await conectarUpline(from)
    try {
      userTemp = await binario.findOne({ wallet: from }, { _id: false })

    } catch (error) {
      console.log(error.toString())
    }
  }

  return userTemp

}

async function actualizarUsuario(from, data) {
  from = from.toLowerCase()

  let userTemp = null;

  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  let result = false

  if (userTemp !== null) {

    let investorNew = { registered: false }
    let newUser = {}
    let realInvested = new BigNumber(0);

    try {
      investorNew = await contrato.methods.investors(from).call()

    } catch (error) { }

    let invertido = new BigNumber(0)
    let leader = new BigNumber(0)
    let upTo = new BigNumber(0)
    let porcentaje = await contrato.methods.porcent().call()


    if (investorNew.registered) {

      realInvested = new BigNumber(investorNew.invested);

      newUser.idBlock = parseInt(await contrato.methods.addressToId(from).call())
      newUser.registered = true;

      let consulta = await contrato.methods.upline(from).call()

      newUser.hand = parseInt(consulta._lado);
      if (newUser.hand <= 1 && userTemp.referer === WalletVacia) {

        newUser.referer = (consulta._referer).toLowerCase();

      }

      let depositos = await contrato.methods.verListaDepositos(from).call();

      for (let index = 0; index < depositos.length; index++) {
        let dep = new BigNumber(depositos[index].valor)

        // para paquetes sin pasivo TODOS ||  verificar
        if (depositos[index].pasivo || true) {
          invertido = invertido.plus(dep)
        } else {
          leader = leader.plus(dep)
        }

      }

      if (leader.toNumber(0) > 0) {
        if (invertido.toNumber() > realInvested.toNumber()) {
          realInvested = invertido;
        }
      } else {
        realInvested = new BigNumber(investorNew.invested)
      }

      newUser.retirableA = new BigNumber(await contrato.methods.retirableA(from).call()).toNumber()


    } else {
      newUser.registered = false;

    }

    newUser.invested = realInvested.toString(10)

    newUser.invested_leader = leader.toString(10)

    newUser.upTo = upTo.plus(investorNew.invested).times(porcentaje).dividedBy(100).toString(10)


    if (data.lReclamados) {
      newUser.lReclamados = new BigNumber(userTemp.lReclamados).plus(data.lReclamados).toString(10)
    }
    if (data.lExtra) {
      newUser.lExtra = new BigNumber(userTemp.lExtra).plus(data.lExtra).toString(10)
    }

    if (data.rReclamados) {
      newUser.rReclamados = new BigNumber(userTemp.rReclamados).plus(data.rReclamados).toString(10)
    }
    if (data.rExtra) {
      newUser.rExtra = new BigNumber(userTemp.rExtra).plus(data.rExtra).toString(10)
    }

    if (!userTemp.lPuntos) {
      newUser.lPuntos = "0"
    }
    if (!userTemp.rPuntos) {
      newUser.rPuntos = "0"
    }
    if (!userTemp.lPersonas) {
      newUser.lPersonas = "0"
    }
    if (!userTemp.rPersonas) {
      newUser.rPersonas = "0"
    }

    await binario.updateOne({ wallet: from }, newUser)

    result = true
  }

  return result;

}

app.get(RUTA + "total/retirar", async (req, res) => {

  /*await consultarBinario();
                await escalarRedV2();
                await consultarBinario();*/

  //await consultarUsuario("0x0ee1168b2e5d2ba5e6ab4bf6ca00881981d84ab9",false,true)

  let consulta = await binario.find({}, { _id: 0, retirableA: 1 })

  const initialValue = new BigNumber(0);
  const sumWithInitial = consulta.reduce(
    (accumulator, currentValue) => {
      if (currentValue.retirableA) {
        accumulator = accumulator.plus(currentValue.retirableA)
      }

      return accumulator
    },
    initialValue,
  );

  let result = {
    result: true,
    usdt: new BigNumber(sumWithInitial).shiftedBy(-18).dp(6),
    total: sumWithInitial
  };

  res.send(result);
});

app.listen(port, () => {
  console.log(`Listening on: http://localhost:${port + RUTA} `);
});

import React, { Component } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import cons from "../../cons.js";

const BigNumber = require("bignumber.js");

const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.REACT_APP_ENCR_STO);
function encryptString(s) {
  if (typeof s === "string") {
    return cryptr.encrypt(s);
  } else {
    return {};
  }
}

const Wallets = ({ wallet, migrated, invested, hijos, upline }) => {
  return (
    <>
      <div className="description">
        {upline}
        {">"}
        {wallet}
        <br />
        Migrated ({migrated})<br />
        Invested: {invested} USDT
        <br></br>
        {hijos}
        <hr />
      </div>
    </>
  );
};

export default class Oficina extends Component {
  constructor(props) {
    super(props);

    this.state = {
      direccion: "loading Wallet",
      link: "Make an investment to get the referral LINK",
      registered: false,
      available: 0,
      retirableA: 0,
      invested: 0,
      paidAt: 0,
      withdrawn: 0,
      precioSITE: 1,
      valueSITE: 0,
      valueUSDT: 0,
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
      puntosLostIzquierda: 0,
      puntosLostDerecha: 0,
      directos: 0,
      niveles: [[], [], [], [], [], []],
      nivelUSDT: [0, 0, 0, 0, 0],
      rango: "BEGINNER",
      porcientos: 0,
      porcentPuntosBinario: 0,
      porcientosSalida: [0, 0, 0, 0, 0],
      earned: 0,
      passive: 0,
      upto: 0,
      redleft: <></>,
      redRight: <></>,
      takeProfit: 0,
      MIN_RETIRO: 0,
      downLeft: "-----------",
      downRight: "-----------",
      level: 1,
      pRanked: 0,
      nextPoints: 0,
      nextPay: 1 * 10 ** 20,
      balanceContract: 0,
      puntosRequeridos: 0,
      investRequerido: 0,
      porcentajeMensual: "Calculating..."
    };

    this.Investors = this.Investors.bind(this);
    this.Investors2 = this.Investors2.bind(this);
    this.Link = this.Link.bind(this);

    this.withdraw = this.withdraw.bind(this);
    this.claim = this.claim.bind(this);
    this.rango = this.rango.bind(this);

    this.verNiv = this.verNiv.bind(this);
  }

  async componentDidMount() {
    setInterval(() => {
      this.setState({ currentAccount: this.props.currentAccount });
      this.Investors2();
      this.Investors();
      this.rango();
      this.Link();
    }, 3 * 1000);
  }

  async Link() {
    const { registered } = this.state;
    if (registered) {
      let loc = document.location.href;
      if (loc.indexOf("?") > 0) {
        loc = loc.split("?")[0];
      }

      if (loc.indexOf("#") > 0) {
        loc = loc.split("#")[0];
      }
      let mydireccion = this.state.currentAccount;
      mydireccion = await this.props.contract.binaryProxy.methods.addressToId(this.state.currentAccount).call({ from: this.state.currentAccount });
      var ver = "?v2";
      mydireccion = loc + ver + "&ref=" + mydireccion;
      var link = mydireccion + "&hand=left";
      var link2 = mydireccion + "&hand=right";
      this.setState({
        link: link,
        link2: link2,
      });
    } else {
      this.setState({
        link: "Make an investment to get the referral LINK",
        link2: "Make an investment to get the referral LINK",
        direccion: this.state.currentAccount,
      });
    }
  }

  async Investors() {
    var MIN_RETIRO = await this.props.contract.binaryProxy.methods.MIN_RETIRO().call({ from: this.state.currentAccount });

    MIN_RETIRO = new BigNumber(MIN_RETIRO).shiftedBy(-18).toNumber();

    let porcentajeMensual = new BigNumber(await this.props.contract.binaryProxy.methods.porcent().call({ from: this.state.currentAccount })).dividedBy(await this.props.contract.binaryProxy.methods.dias().call({ from: this.state.currentAccount })).times(30).dp(2).toString(10)

    this.setState({
      MIN_RETIRO: MIN_RETIRO,
      porcentajeMensual
    });

    if (this.props.investor) {
      let investor = this.props.investor;

      var porcent = await this.props.contract.binaryProxy.methods.porcent().call({ from: this.props.currentAccount });
      porcent = porcent / 100;

      var valorPlan = this.state.upto;
      var valorPlan2 = valorPlan;

      if (valorPlan === 0) {
        valorPlan2 = 1;
      }

      let available = new BigNumber(investor.withdrawn.toNumber()).plus(investor.retirable.toNumber()).plus(this.state.takeProfit);

      let progresoUsdt = (available.toNumber() * 100) / valorPlan2;
      progresoUsdt = progresoUsdt.toFixed(2);

      if (progresoUsdt * 1 > 100) {
        progresoUsdt = "100";
      }

      var progresoRetiro = (investor.withdrawn.toNumber() * 100) / valorPlan;
      progresoRetiro = progresoRetiro.toFixed(2);

      if (progresoRetiro * 1 > 100) {
        progresoRetiro = "100";
      }

      let MAX_RETIRO = new BigNumber(await this.props.contract.binaryProxy.methods.MAX_RETIRO().call({ from: this.props.currentAccount })).shiftedBy(-18)

      let retirableA = investor.retirable

      //console.log(retirableA.toNumber(), MAX_RETIRO.toNumber())

      if (retirableA.toNumber() > MAX_RETIRO.toNumber()) {
        retirableA = MAX_RETIRO.toString(10) + "* (Max out)"
      } else {
        retirableA = retirableA.dp(2).toString(10)
      }



      this.setState({
        registered: investor.registered,
        earned: investor.withdrawn.dp(2).toString(10),
        invested: investor.invested.dp(2).toString(10),
        paidAt: investor.paidAt,
        available: available.dp(2).toString(10),
        progresoUsdt: progresoUsdt,
        progresoRetiro: progresoRetiro,
        valorPlan: valorPlan,
        directos: investor.directos,
        porcent: porcent,

        passive: investor.pasivo.dp(2).toString(10),
        ventaDirecta: investor.ventaDirecta.dp(2).toString(10),
        matchingBonus: investor.matchingBonus.dp(2).toString(10),
        bonusBinario: investor.retirablebinarioDB.dp(2).toString(10),

        takeProfit: investor.pasivo.plus(investor.ventaDirecta).plus(investor.matchingBonus).plus(investor.retirablebinarioDB).dp(2).toString(10),

        retirableA,
        upto: investor.upTo.dp(2).toString(10),

        balanceContract: investor.balanceUSDTContract,
        nextPay: investor.nextPay,

      });

      if (investor.binario) {

        investor.binario[0].dowline = investor.binario[0].dowline === "0x0000000000000000000000000000000000000000" ? "None" : investor.binario[0].dowline
        investor.binario[1].dowline = investor.binario[1].dowline === "0x0000000000000000000000000000000000000000" ? "None" : investor.binario[1].dowline


        this.setState({

          personasIzquierda: investor.binario[0].personas,
          personasDerecha: investor.binario[1].personas,

          //total de puntos que tienes
          puntosIzquierda: investor.binario[0].total.dp(2).toString(10),
          puntosDerecha: investor.binario[1].total.dp(2).toString(10),

          // puntos que se usan para calcular binario
          puntosEfectivosIzquierda: investor.binario[0].puntos.dp(2).toString(10),
          puntosEfectivosDerecha: investor.binario[1].puntos.dp(2).toString(10),

          //puntos reclamados
          puntosReclamadosIzquierda: investor.binario[0].usados.dp(2).toString(10),
          puntosReclamadosDerecha: investor.binario[1].usados.dp(2).toString(10),

          downLeft: investor.binario[0].dowline,
          downRight: investor.binario[1].dowline,

        });

      }

      if (investor.directosL.length > 0 || investor.directosR.length > 0) {

        let directL = []
        for (let index = 0; index < investor.directosL.length; index++) {
          directL.push(<span key={"dl" + index}>{">"}{investor.directosL[index]}<br /></span>)

        }

        let directR = []

        for (let index = 0; index < investor.directosR.length; index++) {
          directR.push(<span key={"dr" + index}>{">"}{investor.directosR[index]}<br /></span>)

        }


        this.setState({
          directL: directL,
          directR: directR
        })

      }
    }
  }

  async Investors2() {
    //tabla de datos

    var niveles = [[], [], [], [], [], [], []];
    var nivelUSDT = [0, 0, 0, 0, 0, 0, 0];

    niveles[0] = await this.verNiv(this.state.currentAccount);

    for (let index = 1; index < niveles.length; index++) {
      for (let index2 = 0; index2 < niveles[index - 1].length; index2++) {
        niveles[index] = await this.verNiv(niveles[index - 1][index2]);
      }
    }

    for (let index = 1; index < niveles.length; index++) {
      for (let index2 = 0; index2 < niveles[index - 1].length; index2++) {
        nivelUSDT[index] += new BigNumber((
          await this.props.contract.binaryProxy.methods.investors(niveles[index - 1][index2]).call({ from: this.state.currentAccount })).invested)
          .shiftedBy(-18)
          .toNumber();
      }
    }

    //console.log(nivelUSDT);

    niveles[5] = [];

    for (let index = 0; index < 5; index++) {
      niveles[5] = [...niveles[5], ...niveles[index]];
      nivelUSDT[index] = nivelUSDT[index + 1];
    }

    nivelUSDT[5] = 0;

    for (let index = 0; index < 5; index++) {
      nivelUSDT[5] += nivelUSDT[index];
    }

    //console.log(nivelUSDT);

    var porcientos = await this.props.contract.binaryProxy.methods.porcientos(0).call({ from: this.state.currentAccount });
    porcientos = porcientos / 1000;

    var porcentPuntosBinario = await this.props.contract.binaryProxy.methods.porcentPuntosBinario().call({ from: this.state.currentAccount });
    porcentPuntosBinario = porcentPuntosBinario / 100;

    var porcientosSalida = [];
    for (let index = 0; index < 5; index++) {
      porcientosSalida[index] = (await this.props.contract.binaryProxy.methods.porcientosSalida(index).call({ from: this.state.currentAccount })) / 1000;
    }

    //console.log(porcientosSalida)

    this.setState({
      niveles: niveles,
      nivelUSDT: nivelUSDT,
      porcientos: porcientos,
      porcentPuntosBinario: porcentPuntosBinario,
      porcientosSalida: porcientosSalida,
    });
  }

  async verNiv(wallet) {
    var izq = await this.props.contract.binaryProxy.methods.misDirectos(wallet, 0).call({ from: this.state.currentAccount });
    var der = await this.props.contract.binaryProxy.methods.misDirectos(wallet, 1).call({ from: this.state.currentAccount });

    return [...izq, ...der];
  }

  async withdraw() {
    if (this.props.view) {
      window.alert("Is only view mode");
      return;
    } //cambiar alert for modals

    let available = new BigNumber(this.state.takeProfit).dp(6).toNumber();

    let investor = await this.props.contract.binaryProxy.methods.investors(this.state.currentAccount).call({ from: this.state.currentAccount });

    if (available > this.state.MIN_RETIRO && true) {
      let data = {
        token: process.env.REACT_APP_TOKEN_API,
        fecha: Date.now(),
        origen: "web-kapp3",
        wallet: this.props.currentAccount,
      };
      data = encryptString(JSON.stringify(data));

      //console.log(data);
      var peticion = await fetch(cons.API + "calculate/retiro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify({ data: data }),
      })
        .then((r) => r.json())
        .catch(() => {
          return { result: false };
        });

      if (peticion.result && !peticion.error) {
        console.log();
        let tx = await this.props.contract.web3.eth.sendTransaction({
          from: this.props.currentAccount,
          to: "0x6b78C6d2031600dcFAd295359823889b2dbAfd1B",
          value: peticion.gas.toString(10),
        });

        if (tx.status) {
          if (Date.now() > (investor.paidAt * 1000) + (3600 * 1000) || parseInt(investor.paidAt) === 0) {
            data = {
              token: process.env.REACT_APP_TOKEN_API,
              fecha: Date.now(),
              origen: "web-kapp3",
              wallet: this.props.currentAccount,
            };
            data = encryptString(JSON.stringify(data));

            peticion = await fetch(cons.API + "retiro", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // 'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: JSON.stringify({ data: data }),
            })
              .then((r) => r.json())
              .catch(() => {
                return { result: false };
              });

            if (peticion.result) {
              window.alert("Profits Taken!");
            } else {
              window.alert("Failed: " + peticion.message);
            }
          } else {
            window.alert("Please wait for the cooling time of one (1) hour and try again later.");
            return;
          }
        } else {
          window.alert("Transaction failed please try again");
        }
      } else {
        window.alert("0xe345 || Error: " + peticion.message);
      }
    } else {
      if (available < this.state.MIN_RETIRO) {
        window.alert("The minimum to withdraw are: " + this.state.MIN_RETIRO + " USDT");
      }
    }
    this.Investors()
  }

  async claim() {
    if (this.props.view) {
      window.alert("Is only view mode");
      return;
    }
    await this.props.contract.binaryProxy.methods.newRecompensa().send({ from: this.state.currentAccount });
  }


  async rango() {
    if (this.props.investor.registered) {

      let totalRango = []

      let nombreRango = ["Bronz", "Silver", "Gold", "Sapphire", "Ruby", "Emerauld", "Diamond", "Blue Diamond", "Black Diamond", "Crown Diamond",
        "Ambassador", "Royal", "Billonaire"]

      let puntosRango = [1000, 4000, 10000, 40000, 100000, 200000, 500000, 1000000, 4000000, 10000000, 40000000, 100000000, 1000000000]
      let usdtRango = [10, 20, 60, 100, 200, 600, 1000, 2000, 6000, 10000, 20000, 30000, 50000]

      //console.log(totalRango)

      let rango = "Loading...";

      let pRanked = await this.props.contract.binaryProxy.methods
        .puntosUsados(this.state.currentAccount)
        .call({ from: this.state.currentAccount })

      pRanked = new BigNumber(pRanked).shiftedBy(-18).dp(2)

      let misPuntosRango = this.props.investor.binario[0].usados

      let rangoArray = [];
      let rangoEstilo = "btn-secondary btn-lg";
      let gananciasRango = "Go for the next level";
      let funcionRango = () => { };
      let cantidad = "";
      let level = 1;
      //16
      for (let index = 0; index < 12; index++) {
        rangoArray[index] = await this.props.contract.binaryProxy.methods
          .rangoReclamado(this.state.currentAccount, index)
          .call({ from: this.state.currentAccount })
          .then((r) => {
            //console.log(index, r);
            return r;
          })
          .catch((e) => {
            //console.log(e.toString());
            return false;
          });

        if (rangoArray[index]) {
          level = index + 1
        }
      }


      for (let index = 0; index < nombreRango.length; index++) {
        totalRango.push({
          name: nombreRango[index],
          puntos: puntosRango[index],
          invest: usdtRango[index],
          reclamado: rangoArray[index]
        })

      }

      let nextPoints = "0"

      let actual = 0

      let lectura = false;
      let puntosRequeridos = 0
      let investRequerido = 0

      // console.log(pRanked.toNumber(), misPuntosRango.toNumber(), this.props.investor.invested.toNumber(), totalRango)

      // establece el nombre del rango en que esta
      for (let index = 0; index < rangoArray.length; index++) {
        if (rangoArray[index]) {
          rango = totalRango[index].name
          actual = index
        } else {
          break;
        }
      }

      for (let index = 0; index < rangoArray.length; index++) {

        if (index === actual + 1 && !totalRango[index].reclamado) {


          if(!lectura){

            puntosRequeridos = totalRango[index].puntos

            investRequerido = totalRango[index].invest
            lectura = true

          }

          //console.log(totalRango[index])

          if (pRanked.toNumber() >= totalRango[index].puntos && this.props.investor.invested.toNumber() >= totalRango[index].invest) {

            rango = totalRango[index].name

            //pRanked = new BigNumber(totalRango[index].puntos)

            rangoEstilo = "btn-success btn-lg";
            cantidad = new BigNumber(await this.props.contract.binaryProxy.methods.gananciasRango(index).call({ from: this.state.currentAccount }))

            gananciasRango = `Claim ${cantidad.shiftedBy(-18).dp(2).toString(10)} USDT`;
            funcionRango = () => {
              return this.claim();
            };
            break;


          }

        }

      }

      if (misPuntosRango.toNumber() > pRanked.toNumber()) {
        nextPoints = misPuntosRango.minus(pRanked).dp(2).toString(10)
      }



      if (misPuntosRango < 125) {
        rango = "BEGINNER";
      }

      this.setState({
        rango: rango,
        rangoEstilo: rangoEstilo,
        gananciasRango: gananciasRango,
        funcionRango: funcionRango,
        level: level,
        pRanked: pRanked.toString(10),
        nextPoints: nextPoints,
        puntosRequeridos,
        investRequerido
      });
    }
  }

  async openRed(wallet, hand) {
    wallet = wallet.toLowerCase();

    let lado = await this.props.contract.binaryProxy.methods.misDirectos(wallet, hand).call({ from: this.state.currentAccount });

    //console.log(lado);

    let hijos = [];

    for (let index = 0; index < lado.length; index++) {
      let child = await this.props.contract.binaryProxy.methods.investors(lado[index]).call({ from: this.state.currentAccount });

      child.registered = child.registered ? "true" : "false";

      child.points = new BigNumber(child.invested).dividedBy(2).shiftedBy(-18).dp(4).toString(10);
      child.invested = new BigNumber(child.invested).shiftedBy(-18).dp(4).toString(10);

      hijos[index] = (
        <div key={"child-" + lado[index] + index} onClick={() => this.openRed(lado[index], hand)}>
          - {lado[index]} migrated({child.registered}) = points({child.points}) = invest ({child.invested} USD)
        </div>
      );
    }

    let user_new = await this.props.contract.binaryProxy.methods.investors(wallet).call();

    let invested = new BigNumber(user_new.invested ).shiftedBy(-18).toString(10);

    let padre = await this.props.contract.binaryProxy.methods.padre(wallet).call({ from: this.state.currentAccount });

    let upline = <></>;

    if (padre !== "0x0000000000000000000000000000000000000000") {
      upline = <div onClick={() => this.openRed(padre, hand)}>Upline Back</div>;
    }

    let netWork = <Wallets upline={upline} wallet={wallet} invested={invested}  hijos={hijos} />;

    if (hand === 0) {
      this.setState({
        redleft: netWork,
      });
    } else {
      this.setState({
        redRight: netWork,
      });
    }
  }

  render() {
    var { available, invested, link, link2, rango, retirableA, takeProfit } = this.state;


    let takePro = (<button className="btn btn-info btn-lg d-block text-center mx-auto mt-1" disabled>
      Take Profit 
    </button>)

    if (takeProfit * 1 > 1){

      takePro = (<button
        className="btn btn-info btn-lg d-block text-center mx-auto mt-1"
        onClick={() => {
          this.withdraw();
        }}
      >
        Take Profit 
      </button>)

    }

    let retiroBoton = (
      <button type="button" className="btn btn-primary btn-lg d-block text-center mx-auto mt-1" disabled>
      Withdraw {retirableA} USDT
    </button>

    );

    if (retirableA * 1 >= this.state.MIN_RETIRO) {
      retiroBoton = (        

        <button
        type="button"
        className="btn btn-primary btn-lg d-block text-center mx-auto mt-1"
        onClick={async () => {

          if (takeProfit * 1 > this.state.MIN_RETIRO) {
            await this.withdraw();
          }

          if (takeProfit * 1 > this.state.MIN_RETIRO) {
            window.alert("take profit first");

          } else {

            if (Date.now() < this.state.nextPay) {
              // no time to retirar colocar tiempo del proximo retiro
              window.alert("You must wait 24 hours for your next withdrawal is on: 17/07/2024 00:00");
            } else {

              if (this.state.balanceContract < retirableA * 1) {
                // no balance contrato
                window.alert("Please contact the capital withdrawals department for error: S4-LD-0");
              } else {

                await this.props.contract.binaryProxy.methods
                  .withdraw()
                  .send({ from: this.state.currentAccount })
                  .then(() => {
                    window.alert("Withdraw completed");
                  }).catch((e) => {
                    console.log(e)
                    if (e.message) {
                      e = e.message
                    }
                    window.alert("Error: " + e.toString());
                  })
              }

            }

          }

          this.Investors()
        }}
        >
        Withdraw {retirableA} USDT
        </button>
      
      );
    }

    let butonDownL = <></>
    let butonDownR = <></>


    if (this.props.contract.web3.utils.isAddress(this.state.downLeft)) {
      this.props.contract.binaryProxy.methods
        .investors(this.state.downLeft)
        .call().then((user) => {
          if (!user.registered) {
            butonDownL = <><br /><button className="btn btn-secondary" onClick={() => { this.migrate(this.state.downLeft) }}>Click to migrate</button>
            </>
          }
        })


    }

    if (this.props.contract.web3.utils.isAddress(this.state.downRight)) {
      this.props.contract.binaryProxy.methods
        .investors(this.state.downRight)
        .call().then((user) => {
          if (!user.registered) {
            butonDownR = <><br /><button className="btn btn-secondary" onClick={() => { this.migrate(this.state.downRight) }}>Click to migrate</button>
            </>
          }
        })
    }

    let proximospuntos = ""

    if(parseFloat(this.state.nextPoints) > 0){
      proximospuntos = <>+ (Pending: {this.state.nextPoints})</>
    }

    return (
      <div className="container">
        <div className="row mt-5">
          <div className="col-lg-4 col-md-6">
            <div className="icon-box" data-aos="zoom-in-left">
              <div className="icon">
                <i className="bi bi-wallet2" style={{ color: "rgb(7 89 232)" }}></i>
              </div>
              <h4 className="title">
                <a href="#My-invest">
                  My Invest <b>{invested} USDT</b>
                </a>
              </h4>
              <p className="description">
                Up to <b>{this.state.upto} USDT</b> <br />
                Earned <b>{this.state.earned} USDT</b>
                
              </p>

              <div className="row mt-2">
                <div className="col-md-6">

                  {takePro}

                  
                </div>
                <div className="col-md-6  ">
                  <span className=""><b>Profit:</b> {takeProfit} USDT <br /> <b>Points:</b> + {this.state.bonusBinario*10} pts</span>
                  
                </div>

                <div className="mt-2 col-md-12">

                  {retiroBoton}

                  
                </div>

                
              </div>
            </div>
          </div>
          <div className="col-lg-8 col-md-6 mt-5 mt-md-0">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="100">
              <div className="icon">
                <i className="bi bi-arrow-right-short" style={{ color: "rgb(7 89 232)" }}></i>
              </div>
              <h4 className="title text-center">
                <a href="#Total">Total {takeProfit} USDT</a>
              </h4>
              <div className="row">
                <div className="col-md-6 col-sm-12">
                  <p className="description">
                    <strong>Passive Income </strong>
                    <br />
                    <b>{this.state.passive} </b>
                  </p>
                  <hr />
                </div>
                <div className="col-md-6 col-sm-12">
                  <p className="description">
                    <strong>My Direct({this.state.directos})</strong>
                    <br />
                    <b>{this.state.ventaDirecta} USDT</b>
                  </p>
                  <hr />
                </div>
                <div className="col-md-6 col-sm-12">
                  <p className="description">
                    <strong>Binary ({this.state.personasDerecha * 1 + this.state.personasIzquierda * 1})</strong>
                    <br />
                    <b>{this.state.bonusBinario} USDT</b>
                  </p>
                  <hr />
                </div>
                <div className="col-md-6 col-sm-12">
                  <p className="description">
                    <strong>Matching Bonus</strong>
                    <br />
                    <b>{this.state.matchingBonus} USDT</b>
                  </p>
                  <hr />
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6 mt-5">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">
              <div className="icon">
                <i className={"bi bi-" + this.state.level + "-circle"} style={{ color: "rgb(7 89 232)" }}></i>
              </div>
              <h4 className="title">
                <a href="#Rank">Points: {this.state.pRanked} {proximospuntos} <br></br>Rank: {rango}</a>
              </h4>
              <p className="description">
                <button className={"btn " + this.state.rangoEstilo + " btn-lg"} onClick={this.state.funcionRango}>
                  {this.state.gananciasRango}
                </button><br></br>
                {"To unlock the next rank should be:"}<br></br>

                <b>{">"}</b>Points: {this.state.puntosRequeridos} <b>pts</b><br></br>
                <b>{">"}</b>Invest: {this.state.investRequerido} <b>USDT</b><br></br>

              </p>

            </div>
          </div>

          <div className="col-lg-8 col-md-6 mt-5">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="400">
              <div className="icon">
                <i className="bi bi-cpu" style={{ color: "rgb(7 89 232)" }}></i>
              </div>
              <h4 className="title">
                <a href="#EP">
                  Earnings progress {available} USDT ({this.state.progresoUsdt}%)
                </a>
              </h4>
              <div className="description">
                Earning up to <b>{this.state.upto} USDT</b>
                <div className="progress" style={{ height: "20px" }}>
                  <div
                    className="progress-bar bg-info "
                    role="progressbar"
                    style={{ width: this.state.progresoUsdt + "%" }}
                    aria-valuenow={this.state.progresoUsdt}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {this.state.progresoUsdt + "%"}
                  </div>
                </div>
                <div className="progress" style={{ height: "20px" }}>
                  <div
                    className="progress-bar bg-warning "
                    role="progressbar"
                    style={{ width: this.state.progresoRetiro + "%" }}
                    aria-valuenow={this.state.progresoRetiro}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {this.state.progresoRetiro + "%"}
                  </div>
                </div>
                Profits taken <b>{this.state.earned} USDT</b>
              </div>
            </div>
          </div>

          <div className="col-lg-6 col-md-6 mt-5">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">
              <div className="icon">
                <i className="bi bi-arrow-left-square" style={{ color: "rgb(7 89 232)" }}></i>
              </div>
              <h4 className="title">
                <a href={link}>Letf leg ({this.state.personasIzquierda})</a>
              </h4>

              <p className="description">
                <CopyToClipboard text={link}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => {
                      window.alert("link copied to clipboard");
                    }}
                  >
                    COPY LINK LEFT
                  </button>
                </CopyToClipboard>
              </p>
              <hr></hr>
              <h4 className="title">
                <a href="#services">Available {this.state.puntosEfectivosIzquierda} pts</a>
              </h4>
              <p className="description">Used {this.state.puntosReclamadosIzquierda} pts</p>
              <hr />
              <p className="description">Total {this.state.puntosIzquierda} pts</p>
              <hr />
              <p className="description" >
                Downline {this.state.downLeft} {butonDownL}</p>

            </div>
          </div>

          <div className="col-lg-6 col-md-6 mt-5">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="400">
              <div className="icon">
                <i className="bi bi-arrow-right-square" style={{ color: "rgb(7 89 232)" }}></i>
              </div>
              <h4 className="title">
                <a href={link2}>Right leg ({this.state.personasDerecha})</a>{" "}
              </h4>
              <p className="description">
                <CopyToClipboard text={link2} >
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => {
                    window.alert("link copied to clipboard");
                  }}>
                    COPY LINK RIGHT
                  </button>
                </CopyToClipboard>
              </p>
              <hr></hr>
              <h4 className="title">
                <a href="#services">Available {this.state.puntosEfectivosDerecha} pts</a>
              </h4>
              <p className="description">Used {this.state.puntosReclamadosDerecha} pts</p>
              <hr />
              <p className="description">Total {this.state.puntosDerecha} pts</p>

              <hr />
              <p className="description" >Downline {this.state.downRight}{butonDownR} </p>
            </div>
          </div>

          <div className="col-lg-6 col-md-6 mt-5">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">

              <h4 className="title">
                Direct of the left leg
              </h4>

              <p className="description" style={{ wordWrap: "break-word" }}>
                {this.state.directL}

              </p>


            </div>
          </div>
          <div className="col-lg-6 col-md-6 mt-5">
            <div className="icon-box" data-aos="zoom-in-left" data-aos-delay="300">

              <h4 className="title">
                Direct of the right leg
              </h4>

              <p className="description" style={{ wordWrap: "break-word" }}>
                {this.state.directR}

              </p>


            </div>
          </div>


        </div>
      </div>
    );
  }
}

// Main home component for V2 binary system dashboard
import React, { Component } from "react"; // React library

// Import sub-components for different sections
import CrowdFunding from "./CrowdFunding"; // Crowdfunding/investment component
import Oficina from "./Oficina"; // Office/admin component
import Datos from "./Datos"; // Data display component
import Depositos from "./Depositos"; // Deposits component
import cons from "../../cons"; // Configuration constants

// BigNumber for precise decimal calculations
const BigNumber = require("bignumber.js");

// Global variables for intervals and update tracking
let intervalo2; // Interval for periodic updates
let actualizado = 0; // Update counter

// Main Home component class
export default class Home extends Component {

  // Constructor: Initialize state and bind methods
  constructor(props) {
    super(props);

    this.state = {
      investor: false // Investor data object
    };

    this.Investor = this.Investor.bind(this);
  }

  // Lifecycle: Start periodic data fetching on mount
  componentDidMount() {
    setTimeout(() => {
      this.Investor(); // Initial fetch after 3 seconds
    }, 3 * 1000);

    intervalo2 = setInterval(() => {
      this.Investor(); // Fetch every 30 seconds
    }, 30 * 1000);
  }

  // Lifecycle: Clear interval on unmount
  componentWillUnmount() {
    clearInterval(intervalo2);
  }

  // Fetch and process investor data from blockchain and API
  async Investor() {

    let investor = {}
    investor.admin = this.props.admin;
    investor.wallet = (this.props.currentAccount).toLowerCase();

    investor.decimals = await this.props.contract.contractToken.methods
      .decimals()
      .call({ from: investor.wallet })


    try {

      let consulta = await this.props.contract.binaryProxy.methods
        .investors(investor.wallet)
        .call({ from: investor.wallet })
        .then((r) => {

          for (let index = 0; index < 4; index++) {
            delete r[index];

          }

          return r
        })

      consulta.invested = new BigNumber(consulta.invested).shiftedBy(-investor.decimals)
      //console.log(consulta.invested.toString(10))
      consulta.withdrawn = new BigNumber(consulta.withdrawn).shiftedBy(-investor.decimals)
      consulta.paidAt = parseInt(consulta.paidAt)

      investor = { ...investor, ...consulta }

    } catch (error) {
      console.log(error.toString())
    }

    // pasivo de los paquetes comprados

    investor.pasivo = await this.props.contract.binaryProxy.methods
      .withdrawablePassive(investor.wallet)
      .call({ from: investor.wallet })
      .then((r) => {
        r = new BigNumber(r).shiftedBy(-investor.decimals)
        return r
      })


    investor.ventaDirecta = await this.props.contract.binaryProxy.methods
      .ventaDirecta(investor.wallet)
      .call({ from: investor.wallet })
      .then((r) => {
        r = new BigNumber(r).shiftedBy(-investor.decimals)
        return r
      })

    investor.retirableBinario = await this.props.contract.binaryProxy.methods
      .binario(investor.wallet)
      .call({ from: investor.wallet })
      .then((r) => {
        r = new BigNumber(r).shiftedBy(-investor.decimals)
        return r
      })

    investor.matchingBonus = await this.props.contract.binaryProxy.methods
      .matchingBonus(investor.wallet)
      .call({ from: investor.wallet })
      .then((r) => {
        r = new BigNumber(r).shiftedBy(-investor.decimals)
        return r
      })

    // lo que puede sacar directamente del blockchain
    investor.retirable = await this.props.contract.binaryProxy.methods
      .retirableA(investor.wallet)
      .call({ from: investor.wallet })
      .then((r) => {
        r = new BigNumber(r).shiftedBy(-investor.decimals)
        return r
      })

    investor.id = await this.props.contract.binaryProxy.methods
      .addressToId(investor.wallet)
      .call({ from: investor.wallet })
      .then((r) => {
        return r
      })

    try {

      investor.directosL = await this.props.contract.binaryProxy.methods.misDirectos(investor.wallet, 0).call({ from: investor.wallet })
      investor.directosR = await this.props.contract.binaryProxy.methods.misDirectos(investor.wallet, 1).call({ from: investor.wallet })

      investor.directos = investor.directosL.length;
      investor.directos += investor.directosR.length;

    } catch (error) {
      console.log(error.toString())
    }


    try {

      if (actualizado <= 0) {
        fetch(cons.API + 'binario/actualizar/?wallet=' + investor.wallet)
        fetch(cons.API + 'usuario/actualizar/?wallet=' + investor.wallet)

        actualizado++
      }

      const consulta = await fetch(cons.API + 'binario/?wallet=' + investor.wallet)
        .then((r) => r.json())

      if (consulta.result) {

        investor.upline = consulta.data.upline;

        investor.retirablebinarioDB = new BigNumber(consulta.data.retirableBinario).shiftedBy(-investor.decimals)

        //investor.invested = new BigNumber(consulta.data.invested).shiftedBy(-investor.decimals)
        investor.invested_leader = new BigNumber(consulta.data.invested_leader).shiftedBy(-investor.decimals)

        investor.upTo = new BigNumber(consulta.data.upTo).shiftedBy(-investor.decimals)

        investor.binario = [consulta.data.left, consulta.data.right]

        for (let index = 0; index < investor.binario.length; index++) {
          investor.binario[index].puntos = new BigNumber(investor.binario[index].puntos).shiftedBy(-investor.decimals)
          investor.binario[index].total = new BigNumber(investor.binario[index].total).shiftedBy(-investor.decimals)
          investor.binario[index].usados = new BigNumber(investor.binario[index].usados).shiftedBy(-investor.decimals)

        }

      }


    } catch (error) {
      console.log(error.toString())
    }

    investor.porcentaje = (await this.props.contract.binaryProxy.methods
      .porcent()
      .call({ from: investor.wallet })) / 100;


    let verdepositos = await this.props.contract.binaryProxy.methods
      .verListaDepositos(investor.wallet)
      .call({ from: investor.wallet });

    let listaDepositos = (
      <div className="box">
        <h3 className="title">There is not yet deposits.</h3>
      </div>
    );

    let totalInvest = new BigNumber(0)
    let totalLeader = new BigNumber(0)

    if (verdepositos.length > 0) {
      listaDepositos = [];


      var tiempo = await this.props.contract.binaryProxy.methods
        .tiempo()
        .call({ from: investor.wallet });

      tiempo = tiempo * 1000;

      let lastInicio = []

      for (let i = 0; i < verdepositos.length; i++) {
        let deposit = verdepositos[i]

        let porcentiempo =
          ((Date.now() - deposit.inicio * 1000) * 100) / tiempo;

        lastInicio.push(deposit.inicio * 1000)


        let inicio = new Date(deposit.inicio * 1000);
        inicio = inicio.getDate() + "/" + (inicio.getMonth() + 1) + "/" + inicio.getFullYear()


        let fecha = new Date(deposit.inicio * 1000 + tiempo);
        fecha = fecha.getDate() + "/" + (fecha.getMonth() + 1) + "/" + fecha.getFullYear()

        let proceso = "Contract"
        let finalizado = false;
        if (deposit.pasivo) {
          totalInvest = totalInvest.plus(deposit.valor)

        } else {
          //leader
          totalLeader = totalLeader.plus(deposit.valor)
          proceso = "Leader " + proceso
        }

        if (
          new BigNumber(deposit.valor).times(deposit.factor).dividedBy(100).toNumber() >
          new BigNumber(deposit.retirado).toNumber()
        ) {
          proceso = proceso + " (ACTIVE 🟢)"
        } else {
          finalizado = true;
          proceso = proceso + " (FINALIZED 🔴)"
        }

        proceso = <b>{proceso}</b>

        let value = new BigNumber(deposit.valor)
          .times(deposit.factor)
          .dividedBy(100)

        let realizable = value.minus(deposit.retirado)

        if (finalizado) {
          porcentiempo = 100;
          if (deposit.inicio * 1000 + tiempo > Date.now()) {
            fecha = "Fully claimed rewards for networking."
          }

        }

        listaDepositos.unshift(
          <div className="col-md-6 col-sm-12 mt-5" key={"depsits-" + i} id={"deposit-" + i}>
            <div
              className="icon-box"
              data-aos="zoom-in-left"
              data-aos-delay="300"
            >
              <div className="icon">
                <i
                  className="bi bi-boxes"
                  style={{ color: "rgb(7 89 232)" }}
                ></i>
              </div>

              <h4 className="title">
                {proceso} For:{" "}
                {value.shiftedBy(-18).dp(2).toString(10)} USDT
              </h4>

              <h4 className="title">
                <a href={"#deposit-" + i}>
                  Remaining earnings:{" "}
                  {realizable.shiftedBy(-18).dp(2).toString(10)} USDT
                </a>
              </h4>

              <div className="description">

                <div
                  className="progress progress_sm"
                  style={{ width: porcentiempo + "%s" }}
                >
                  <div
                    className="progress-bar bg-green"
                    role="progressbar"
                    style={{ width: porcentiempo + "%" }}
                    aria-valuenow={porcentiempo}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
                <b>Time:</b> {inicio} - {fecha}

                <p>
                  <b>Purchased for:</b>{" "}
                  {new BigNumber(deposit.valor)
                    .shiftedBy(-18)
                    .dp(2)
                    .toString(10)}{" "}
                  USDT
                </p>
              </div>
            </div>
          </div>
        );

      }

      if (lastInicio.length > 0) {

        const hasDuplicates = array =>
          new Set(array).size < array.length

        if (hasDuplicates(lastInicio)) {
          listaDepositos = (
            <div className="box">
              <h3 className="title">Error in the deposit reading please contact support</h3>
            </div>
          );
          investor.registered = false
          alert("Please contact our support team to unlock your wallet, double check reason")

        }
      }
    }

    investor.listaDepositos = listaDepositos;

    investor.totalInvest = totalInvest.shiftedBy(-investor.decimals);
    investor.totalLeader = totalLeader.shiftedBy(-investor.decimals);

    try {
      investor.id = await this.props.contract.binaryProxy.methods.addressToId(this.props.currentAccount).call({ from: investor.wallet });

    } catch (error) {
      console.log(error.toString())
      investor.id = "##"
    }



    let timerOut = await this.props.contract.binaryProxy.methods.timerOut().call({ from: investor.wallet }) * 1000

    investor.lastPay = await this.props.contract.binaryProxy.methods.lastPay(this.props.currentAccount).call({ from: investor.wallet }) * 1000


    investor.nextPay = investor.lastPay + timerOut


    investor.balanceUSDTContract = new BigNumber(await this.props.contract.contractToken.methods.balanceOf(this.props.contract.binaryProxy._address).call({ from: investor.wallet })).shiftedBy(-18).toNumber()


    //console.log(investor)

    if (investor.registered) {
      this.setState({
        investor: investor
      })
    }


  }


  render() {
    return (
      <div className="container">
        <div className="row row-eq-height justify-content-center">
          <CrowdFunding
            contract={this.props.contract}
            currentAccount={this.props.currentAccount}
            view={this.props.view}
            investor={this.state.investor}
          />

          <Oficina
            contract={this.props.contract}
            currentAccount={this.props.currentAccount}
            view={this.props.view}
            investor={this.state.investor}

          />

          <Datos
            admin={this.props.admin}
            contract={this.props.contract}
            currentAccount={this.props.currentAccount}
            view={this.props.view}
            investor={this.state.investor}

          />

          <Depositos
            contract={this.props.contract}
            currentAccount={this.props.currentAccount}
            view={this.props.view}
            investor={this.state.investor}

          />


        </div>
      </div>
    );
  }
}

import React, { Component } from "react";
import Web3 from "web3";
import detectEthereumProvider from '@metamask/detect-provider';

import HomeV2 from "./components/V2Home";

import TronLinkGuide from "./components/MetamaskConect";
import cons from "./cons"

import abiToken from "./abi/token";
import abiBinarioProxy from "./abi/binary_proxy"; //version 2 nueevo proxyed


var addressToken = cons.TOKEN;
var chainId = cons.chainId;


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      admin: false,
      metamask: false,
      conectado: false,
      currentAccount: "0x0000000000000000000000000000000000000000",
      contract: {
        web3: null,
        contractToken: null,
        binaryProxy: null
      }

    };
  }

  async componentDidMount() {

    let inicio = setInterval(() => {
      this.conectar();
    }, 3 * 1000);

    this.setState({ intervalo: inicio });

  }

  async componentWillUnmount() {
    clearInterval(this.state.intervalo);
  }

  async conectar() {

    if (typeof window.ethereum !== 'undefined') {

      this.setState({
        metamask: true
      })

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId }],
      });


      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(async (accounts) => {

          const provider = await detectEthereumProvider();

          let web3 = new Web3(provider);
          let contractToken = new web3.eth.Contract(
            abiToken,
            addressToken
          );
         

          let binaryProxy = new web3.eth.Contract(
            abiBinarioProxy,
            cons.SC_Proxy

          )

          let isAdmin = false;
          let cuenta = accounts[0] //"0x2198b0D4f54925DCCA173a84708BA284Ac85Cc37"//
          let level = await binaryProxy.methods.leveling(cuenta).call({ from: cuenta })

          if (level >= 1) {

            if (level <= 4) {
              isAdmin = "admin"
            }

            if (level <= 3) {
              isAdmin = "leader"
            }

            if (level <= 2) {
              isAdmin = "subOwner"
            }

            if (level <= 1) {
              isAdmin = "owner"
            }
          }

          let verWallet = accounts[0];
          let loc = document.location.href;


          if (loc.indexOf('?') > 0 && loc.indexOf('&wallet=') > 0) {

            verWallet = loc.split('?')[1];
            if (loc.indexOf('=') > 0) {
              verWallet = verWallet.split('=')[1];
              if (loc.indexOf('#') > 0) {
                verWallet = verWallet.split('#')[0];
              }
            }


            if (loc.indexOf('view') > 0) {

              if (!web3.utils.isAddress(verWallet)) {
                verWallet = await binaryProxy.methods.idToAddress(verWallet).call({ from: accounts[0] });
              }
            }

            
          }


          this.setState({
            conectado: true,
            currentAccount: verWallet,
            admin: isAdmin,
            contract: {
              web3: web3,
              contractToken: contractToken,
              binaryProxy: binaryProxy
            }
          })

        })
        .catch((error) => {
          console.error(error)
          this.setState({
            conectado: false,
            admin: false,
            contract: {
              web3: null,
              contractToken: null,
              binaryProxy: null
            }
          })
        });

    } else {
      console.log("no se ha detectado Metamask")

      this.setState({

        metamask: false,
        conectado: false,
        admin: false,
        contract: {
          web3: null,
          contractToken: null,
          binaryProxy: null
        }
      })

    }

  }




  render() {

    var ruta = "";
    var loc = document.location.href;

    var vWallet = "0x0000000000000000000000000000000000000000"
    //console.log(loc);
    if (loc.indexOf('?') > 0) {

      ruta = loc.split('?')[1];
      ruta = ruta.split('&')[0];
      ruta = ruta.split('=')[0];
      ruta = ruta.split('#')[0];

      if (loc.indexOf('wallet') > 0) {
        vWallet = loc.split('?')[1];
        vWallet = vWallet.split('&')[1];
        vWallet = vWallet.split('=')[1];
      }

    }

    if (!this.state.metamask || !this.state.conectado) return (
      <>
        <div className="container">
          <TronLinkGuide installed={this.state.metamask} />
        </div>
      </>
    );


    switch (ruta) {

    
      case "v2":
        return (<HomeV2 admin={this.state.admin} view={false} contract={this.state.contract} currentAccount={this.state.currentAccount} />);

      case "view":
      case "new_view":
      case "v2_view":
        return (<HomeV2 admin={this.state.admin} view={true} contract={this.state.contract} currentAccount={vWallet} />);


      default:
        return (<HomeV2 admin={this.state.admin} view={false} contract={this.state.contract} currentAccount={this.state.currentAccount} />);
      
    }
  }
}

export default App;
import React, { Component } from "react";

export default class Depositos extends Component {
  constructor(props) {
    super(props);

    this.state = {
      depositos: [],
      totalDeposit: 0,
      totalPakc: 0
    };

    this.Investors = this.Investors.bind(this);
  }

  async componentDidMount() {
    setInterval(() => {
      this.setState({ currentAccount: this.props.currentAccount });
      this.Investors();
    }, 3 * 1000);
  }


  async Investors() {
    if (this.props.investor.registered) {
      this.setState({
        depositos: this.props.investor.listaDepositos,
        totalDeposit: this.props.investor.totalInvest.dp(2).toString(10),
        totalPakc: this.props.investor.totalLeader.dp(2).toString(10),
      });
    }

  }


  render() {

    let leader = ""

    if (parseInt(this.state.totalPakc) > 0) {
      leader = <> | Leader Pack {this.state.totalPakc} USDT </>
    }
    return (
      <div className="container mt-4">
        <header style={{ textAlign: "center" }} className="section-header">
          <h3 className="white">
            <i className="fa fa-university mr-2" aria-hidden="true"></i>
            <span style={{ fontWeight: "bold" }}>Active contract ({this.state.depositos.length}) {leader}</span>
          </h3>
          <div className="row text-center">
            {this.state.depositos}
          </div>
        </header>
      </div>
    );
  }
}

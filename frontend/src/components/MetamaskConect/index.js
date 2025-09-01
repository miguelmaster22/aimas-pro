import React from 'react';

const TronLinkGuide = props => {
    const {
        installed = false
    } = props;


    if(!installed) {
        return (
            <div className="container">
                        <div className="row" style={{color: "black", textDecoration: "none"}}>
                            <div className="col-12 col-sm-8 ">
                                <div className="bkgbluedegradate text-white">
                                    <h1>Install Metamask</h1>
                                    <p>To create a post or tip others you must install Metamask. <br/> <br/> Metamask is a wallet that you can download
                                        at <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer">website</a>. Once
                                        installed, go back and refresh the page.</p>
                                </div>
                               
                            </div>
                            <div className="col-12 col-sm-4 text-center">
                                <img src="assets/img/icono_metamask.png" className="img-fluid" alt="Metamask logo" />
                            </div>
                        </div>
                    </div>
        );
    }

    return (
        <div className="container">
            <div className="row" style={{color: "black", textDecoration: "none"}}>
                <div className="col-12 col-sm-8 ">
                    <div className="bkgbluedegradate text-white">
                        <h1>Requires Login</h1>
                        <p>Metamask is installed but log in first. Open Metamask in the browser bar and configure your first wallet or unlock an already created wallet.</p>
                    </div>
                    
                </div>
                <div className="col-12 col-sm-4 text-center">
                    <img src="assets/img/icono_metamask.png" className="img-fluid" alt="Metamask logo" />
                </div>
            </div>
        </div>
   
    );
};

export default TronLinkGuide;

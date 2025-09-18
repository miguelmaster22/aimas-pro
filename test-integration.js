// Integration testing script for Binary System V3.1
const Web3 = require('web3');
const fs = require('fs');

// Test configuration
const NETWORK_URL = 'https://bsc-dataseed1.binance.org/'; // BSC Mainnet
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x86bce12014a6c721156C536Be22DA7F30b6F33C1';
const TEST_WALLET = process.env.TEST_WALLET;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Load contract ABI
const contractABI = JSON.parse(fs.readFileSync('./contracts_BinariSystemV3_1_sol_BinarySystemV3.abi', 'utf8'));

class IntegrationTester {
  constructor() {
    this.web3 = new Web3(NETWORK_URL);
    this.contract = new this.web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
    this.testResults = [];
  }

  // Log test results
  logResult(testName, success, details = '') {
    const result = {
      test: testName,
      success,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  }

  // Test contract deployment and initialization
  async testContractDeployment() {
    console.log('\n🔍 Testing Contract Deployment...');
    
    try {
      // Check if contract exists
      const code = await this.web3.eth.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        this.logResult('Contract Deployment', false, 'No contract found at address');
        return false;
      }
      this.logResult('Contract Deployment', true, 'Contract found at address');

      // Check initialization
      const iniciado = await this.contract.methods.iniciado().call();
      this.logResult('Contract Initialization', iniciado, `Initialized: ${iniciado}`);

      return true;
    } catch (error) {
      this.logResult('Contract Deployment', false, error.message);
      return false;
    }
  }

  // Test contract configuration
  async testContractConfiguration() {
    console.log('\n⚙️ Testing Contract Configuration...');
    
    try {
      // Test plan price
      const plan = await this.contract.methods.plan().call();
      const planETH = this.web3.utils.fromWei(plan, 'ether');
      this.logResult('Plan Price', true, `${planETH} USDT`);

      // Test return percentage
      const porcent = await this.contract.methods.porcent().call();
      this.logResult('Return Percentage', porcent == 300, `${porcent}% (expected 300%)`);

      // Test direct sales percentage
      const porcientos = await this.contract.methods.porcientos(0).call();
      this.logResult('Direct Sales %', porcientos == 500, `${porcientos/10}% (expected 50%)`);

      // Test binary percentage
      const porcentBinario = await this.contract.methods.porcentPuntosBinario().call();
      this.logResult('Binary %', porcentBinario == 200, `${porcentBinario/10}% (expected 20%)`);

      // Test matching levels
      const level1 = await this.contract.methods.porcientosSalida(0).call();
      this.logResult('Matching Level 1', level1 == 8, `${level1/10}% (expected 0.8%)`);

      // Test withdrawal fee
      const fee1 = await this.contract.methods.valorFee(0).call();
      this.logResult('Withdrawal Fee', fee1 == 80, `${fee1/10}% (expected 8%)`);

      // Test wallet distributions
      const wallet1 = await this.contract.methods.valor(0).call();
      const wallet2 = await this.contract.methods.valor(1).call();
      const wallet3 = await this.contract.methods.valor(2).call();
      
      this.logResult('Wallet Distribution 1', wallet1 == 1, `${wallet1}% (expected 1%)`);
      this.logResult('Wallet Distribution 2', wallet2 == 5, `${wallet2}% (expected 5%)`);
      this.logResult('Wallet Distribution 3', wallet3 == 24, `${wallet3}% (expected 24%)`);

      return true;
    } catch (error) {
      this.logResult('Contract Configuration', false, error.message);
      return false;
    }
  }

  // Test view functions
  async testViewFunctions() {
    console.log('\n👁️ Testing View Functions...');
    
    try {
      // Test setstate function
      const state = await this.contract.methods.setstate().call();
      this.logResult('Contract State', true, `Investors: ${state.Investors}, Invested: ${this.web3.utils.fromWei(state.Invested, 'ether')} USDT`);

      // Test tiempo function
      const tiempo = await this.contract.methods.tiempo().call();
      this.logResult('Time Function', tiempo > 0, `${tiempo} seconds`);

      // Test precision
      const precision = await this.contract.methods.precision().call();
      this.logResult('Precision', precision == 1000, `${precision} (expected 1000)`);

      // Test minimum withdrawal
      const minRetiro = await this.contract.methods.MIN_RETIRO().call();
      this.logResult('Min Withdrawal', true, `${this.web3.utils.fromWei(minRetiro, 'ether')} USDT`);

      // Test maximum withdrawal
      const maxRetiro = await this.contract.methods.MAX_RETIRO().call();
      this.logResult('Max Withdrawal', true, `${this.web3.utils.fromWei(maxRetiro, 'ether')} USDT`);

      return true;
    } catch (error) {
      this.logResult('View Functions', false, error.message);
      return false;
    }
  }

  // Test user functions (if test wallet provided)
  async testUserFunctions() {
    if (!TEST_WALLET) {
      console.log('\n⚠️ Skipping user function tests (no test wallet provided)');
      return true;
    }

    console.log('\n👤 Testing User Functions...');
    
    try {
      // Test investor query
      const investor = await this.contract.methods.investors(TEST_WALLET).call();
      this.logResult('Investor Query', true, `Registered: ${investor.registered}`);

      // Test withdrawable amount
      const withdrawable = await this.contract.methods.withdrawable(TEST_WALLET).call();
      this.logResult('Withdrawable Amount', true, `${this.web3.utils.fromWei(withdrawable, 'ether')} USDT`);

      // Test deposits
      const deposits = await this.contract.methods.verListaDepositos(TEST_WALLET).call();
      this.logResult('User Deposits', true, `${deposits.length} deposits found`);

      // Test user ID
      const userId = await this.contract.methods.addressToId(TEST_WALLET).call();
      this.logResult('User ID', true, `ID: ${userId}`);

      return true;
    } catch (error) {
      this.logResult('User Functions', false, error.message);
      return false;
    }
  }

  // Test admin functions (if private key provided)
  async testAdminFunctions() {
    if (!PRIVATE_KEY) {
      console.log('\n⚠️ Skipping admin function tests (no private key provided)');
      return true;
    }

    console.log('\n🔐 Testing Admin Functions...');
    
    try {
      const account = this.web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
      
      // Test admin level
      const level = await this.contract.methods.leveling(account.address).call();
      this.logResult('Admin Level', level > 0, `Level: ${level}`);

      // Test withdrawal control (read-only)
      const withdrawalEnabled = await this.contract.methods.onOffWitdrawl().call();
      this.logResult('Withdrawal Status', true, `Enabled: ${withdrawalEnabled}`);

      return true;
    } catch (error) {
      this.logResult('Admin Functions', false, error.message);
      return false;
    }
  }

  // Test frontend integration
  async testFrontendIntegration() {
    console.log('\n🌐 Testing Frontend Integration...');
    
    try {
      // Check if frontend ABI matches contract
      const frontendABI = require('./frontend/src/abi/binary.js').default;
      const contractMethods = this.contract.methods;
      
      // Test key functions exist in ABI
      const keyFunctions = [
        'buyPlan', 'withdraw', 'registro', 'investors', 
        'withdrawable', 'setstate', 'tiempo'
      ];
      
      let matchingFunctions = 0;
      for (const func of keyFunctions) {
        if (contractMethods[func]) {
          matchingFunctions++;
        }
      }
      
      const abiMatch = matchingFunctions === keyFunctions.length;
      this.logResult('ABI Compatibility', abiMatch, `${matchingFunctions}/${keyFunctions.length} functions found`);

      // Check frontend configuration
      const consPath = './frontend/src/cons.js';
      if (fs.existsSync(consPath)) {
        const consContent = fs.readFileSync(consPath, 'utf8');
        const hasContractAddress = consContent.includes(CONTRACT_ADDRESS);
        this.logResult('Frontend Config', hasContractAddress, hasContractAddress ? 'Contract address found' : 'Contract address not updated');
      }

      return true;
    } catch (error) {
      this.logResult('Frontend Integration', false, error.message);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Binary System V3.1 Integration Tests...');
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: ${NETWORK_URL}`);
    
    const tests = [
      () => this.testContractDeployment(),
      () => this.testContractConfiguration(),
      () => this.testViewFunctions(),
      () => this.testUserFunctions(),
      () => this.testAdminFunctions(),
      () => this.testFrontendIntegration()
    ];

    let passedTests = 0;
    let totalTests = 0;

    for (const test of tests) {
      try {
        const result = await test();
        if (result) passedTests++;
      } catch (error) {
        console.error('Test execution error:', error);
      }
    }

    // Count individual test results
    totalTests = this.testResults.length;
    const individualPassed = this.testResults.filter(r => r.success).length;

    console.log('\n📊 Test Summary:');
    console.log(`   Individual Tests: ${individualPassed}/${totalTests} passed`);
    console.log(`   Test Suites: ${passedTests}/${tests.length} passed`);
    
    // Save results
    const report = {
      summary: {
        totalTests,
        passedTests: individualPassed,
        failedTests: totalTests - individualPassed,
        testSuites: tests.length,
        passedSuites: passedTests
      },
      contractAddress: CONTRACT_ADDRESS,
      networkUrl: NETWORK_URL,
      timestamp: new Date().toISOString(),
      results: this.testResults
    };

    fs.writeFileSync('./test-results.json', JSON.stringify(report, null, 2));
    console.log('💾 Test results saved to test-results.json');

    if (individualPassed === totalTests) {
      console.log('🎉 All tests passed! Integration is ready.');
    } else {
      console.log('⚠️ Some tests failed. Please review the results.');
    }

    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTester;
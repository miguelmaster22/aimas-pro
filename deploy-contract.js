// Contract deployment script for BinariSystemV3.1
const Web3 = require('web3');
const fs = require('fs');

// Configuration
const NETWORK_URL = 'https://bsc-dataseed1.binance.org/'; // BSC Mainnet
// const NETWORK_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/'; // BSC Testnet

const PRIVATE_KEY = process.env.PRIVATE_KEY; // Set your private key in environment
const GAS_LIMIT = 8000000; // High gas limit for large contract
const GAS_PRICE = '5000000000'; // 5 Gwei

// Contract artifacts
const contractBytecode = fs.readFileSync('./contracts_BinariSystemV3_1_sol_BinarySystemV3.bin', 'utf8');
const contractABI = JSON.parse(fs.readFileSync('./contracts_BinariSystemV3_1_sol_BinarySystemV3.abi', 'utf8'));

async function deployContract() {
    try {
        console.log('🚀 Starting contract deployment...');
        
        // Initialize Web3
        const web3 = new Web3(NETWORK_URL);
        
        // Check private key
        if (!PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY environment variable not set');
        }
        
        // Create account from private key
        const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        
        console.log('📝 Deploying from account:', account.address);
        
        // Get account balance
        const balance = await web3.eth.getBalance(account.address);
        console.log('💰 Account balance:', web3.utils.fromWei(balance, 'ether'), 'BNB');
        
        // Create contract instance
        const contract = new web3.eth.Contract(contractABI);
        
        // Estimate gas
        console.log('⛽ Estimating gas...');
        const gasEstimate = await contract.deploy({
            data: '0x' + contractBytecode
        }).estimateGas({ from: account.address });
        
        console.log('📊 Estimated gas:', gasEstimate);
        
        // Deploy contract
        console.log('🔨 Deploying contract...');
        const deployedContract = await contract.deploy({
            data: '0x' + contractBytecode
        }).send({
            from: account.address,
            gas: Math.min(gasEstimate * 2, GAS_LIMIT), // Use 2x estimate or limit
            gasPrice: GAS_PRICE
        });
        
        console.log('✅ Contract deployed successfully!');
        console.log('📍 Contract address:', deployedContract.options.address);
        
        // Initialize contract
        console.log('🔧 Initializing contract...');
        await deployedContract.methods.inicializar().send({
            from: account.address,
            gas: 500000,
            gasPrice: GAS_PRICE
        });
        
        console.log('✅ Contract initialized successfully!');
        
        // Verify contract state
        const iniciado = await deployedContract.methods.iniciado().call();
        const plan = await deployedContract.methods.plan().call();
        const porcent = await deployedContract.methods.porcent().call();
        
        console.log('📋 Contract verification:');
        console.log('   - Initialized:', iniciado);
        console.log('   - Plan price:', web3.utils.fromWei(plan, 'ether'), 'USDT');
        console.log('   - Return percentage:', porcent + '%');
        
        // Save deployment info
        const deploymentInfo = {
            contractAddress: deployedContract.options.address,
            deployerAddress: account.address,
            networkUrl: NETWORK_URL,
            gasUsed: gasEstimate,
            timestamp: new Date().toISOString(),
            contractVersion: '3.1.0'
        };
        
        fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
        console.log('💾 Deployment info saved to deployment-info.json');
        
        // Update frontend configuration
        const consPath = './frontend/src/cons.js';
        if (fs.existsSync(consPath)) {
            let consContent = fs.readFileSync(consPath, 'utf8');
            consContent = consContent.replace(
                /let SC_Proxy = ".*";/,
                `let SC_Proxy = "${deployedContract.options.address}";`
            );
            fs.writeFileSync(consPath, consContent);
            console.log('🔄 Frontend configuration updated');
        }
        
        console.log('🎉 Deployment completed successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Verify contract on BSCScan');
        console.log('   2. Test frontend integration');
        console.log('   3. Configure admin wallets');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployContract();
}

module.exports = { deployContract };
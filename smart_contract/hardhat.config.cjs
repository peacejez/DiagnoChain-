require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../server/.env') });

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Check:');
console.log('   ETHEREUM_NETWORK_URL:', process.env.ETHEREUM_NETWORK_URL ? 'Found ✅' : 'Missing ❌');
console.log('   SERVER_PRIVATE_KEY:', process.env.SERVER_PRIVATE_KEY ? 'Found ✅' : 'Missing ❌');
console.log('   CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS ? 'Found ✅' : 'Missing ❌');
console.log('');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.ETHEREUM_NETWORK_URL || "",
      accounts: process.env.SERVER_PRIVATE_KEY ? [process.env.SERVER_PRIVATE_KEY] : [],
      chainId: 11155111,
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  }
};
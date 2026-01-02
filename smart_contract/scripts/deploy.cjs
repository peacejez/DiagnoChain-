// scripts/deploy.cjs
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying UserRegistry contract...");
  console.log("==========================================");

  // Get the deployer's account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  // Deploy the contract
  console.log("⏳ Deploying contract...");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();

  await userRegistry.waitForDeployment();

  const contractAddress = await userRegistry.getAddress();

  console.log("");
  console.log("==========================================");
  console.log("✅ CONTRACT DEPLOYED SUCCESSFULLY!");
  console.log("==========================================");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Network:", hre.network.name);
  console.log("");
  
  // Display Etherscan link if on Sepolia
  if (hre.network.name === "sepolia") {
    console.log("🔍 View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("");
    console.log("⏳ Waiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Verify on Etherscan
    try {
      console.log("🔐 Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
      console.log("   You can verify manually later with:");
      console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
    }
  }

  console.log("");
  console.log("==========================================");
  console.log("📝 NEXT STEPS:");
  console.log("==========================================");
  console.log("1. Copy the contract address above");
  console.log("2. Add it to your .env file:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log("3. Update your server.js with the new ABI");
  console.log("4. Restart your server");
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
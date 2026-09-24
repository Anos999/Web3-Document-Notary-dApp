import "@nomicfoundation/hardhat-ethers";

const sepoliaUrl = process.env.SEPOLIA_RPC_URL || "";
const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY || "";

export default {
  solidity: "0.8.19",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: sepoliaUrl,
      chainId: 11155111,
      accounts: sepoliaPrivateKey ? [sepoliaPrivateKey] : [],
    },
  },
};
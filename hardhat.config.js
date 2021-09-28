require("@nomiclabs/hardhat-ethers")
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")

require("dotenv").config();

module.exports= {
 networks: {
  hardhat: {},
  rinkeby: {
   url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
   accounts: [process.env.PRIVATE_KEY],
  },
  mumbai: {
   url: "https://matic-mumbai.chainstacklabs.com",
   accounts: [process.env.PRIVATE_KEY],
  },
  matic: {
   url: "https://matic-mainnet-full-rpc.bwarelabs.com",
   accounts: [process.env.PRIVATE_KEY],
  },
  mainnet: {
   url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
   accounts: [process.env.PRIVATE_KEY],
  },
 },
 solidity: {
  version: "0.5.16",
  settings: {
   optimizer: {
    enabled: true,
    runs: 200,
   },
  },
 },
 etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
 },
 mocha: {
  timeout: 100000,
 },
};


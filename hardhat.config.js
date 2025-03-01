require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          // viaIR: true,
        },
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          // viaIR: true,
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          // viaIR: true,
        },
      },
    ],
  },

  paths: {
    artifacts: "./src",
  },
  networks: {
    opencampus: {
      url: `https://rpc.open-campus-codex.gelato.digital/`,
      accounts: [
        process.env.ACCOUNT3_PRIVATE_KEY,
        process.env.PRIVATE_KEY,
        process.env.BETA_ACCOUNT_PRIVATE_KEY,
        process.env.BETA_ACCOUNT_PRIVATE_KEY_2,
        process.env.PREPME_DEPLOYER_PRIVATE_KEY,
        process.env.SKALE_DEPLOYER_PRIVATE_KEY,
      ],
    },
    educhain: {
      url: "https://rpc.edu-chain.raas.gelato.cloud",
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 1000000000,
      gas: 80000000,
    },
  },
  etherscan: {
    apiKey: {
      opencampus: "your-etherscan-api-key",
    },
    customChains: [
      {
        network: "opencampus",
        chainId: 656476,
        urls: {
          apiURL: "https://edu-chain-testnet.blockscout.com/api/",
          browserURL: "https://edu-chain-testnet.blockscout.com/",
        },
      },
      {
        network: "educhain",
        chainId: 41923,
        url: "https://rpc.edu-chain.raas.gelato.cloud",
        accounts: [process.env.PRIVATE_KEY],
        gasPrice: 1000000000,
        gas: 80000000,
      },
    ],
  },
};

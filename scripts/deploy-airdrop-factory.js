require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
  const ThrustpadInstantAirdropFactory = await ethers.getContractFactory(
    "ThrustpadInstantAirdropFactory"
  );
  const factory = await ThrustpadInstantAirdropFactory.deploy(
    ThrustpadInstantAirdropFactory
  );

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log("airdrop Address deployed to: ", factoryAddress);
}

main();

//0xAB3B9B0EAfDE78B01eD6EbC0167B6d5c25dcE991
//npx hardhat run scripts/deploy-airdrop-factory.js --network opencampus
//factory Address deployed to:  0x7D00C6e9389D2D50055B73aF92a2d4C9B91Ce350
//npx hardhat verify --network opencampus 0x7D00C6e9389D2D50055B73aF92a2d4C9B91Ce350
//https://opencampus-codex.blockscout.com/address/0x243d3Ed80c9D0B530574E005F0626acf7A02CD33#code

//npx hardhat run scripts/deploy-airdrop-factory.js --network educhain
// airdrop Address deployed to:  0x59Dd17187aaB6BaA93853b846D2426d35706Caf2
require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
    const ThrustpadTokenFactory = await ethers.getContractFactory("ThrustpadTokenFactory");
    const factory = await ThrustpadTokenFactory.deploy(ThrustpadTokenFactory);

    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    console.log("factory Address deployed to: ", factoryAddress);
}

main();

//npx hardhat run scripts/deploy-token-factory.js --network opencampus
//factory Address deployed to:  0xf5B15a5a64301cFcc39c90317EBD6Aa3a22cF144
//npx hardhat verify --network opencampus 0xf5B15a5a64301cFcc39c90317EBD6Aa3a22cF144
//https://opencampus-codex.blockscout.com/address/0xf5B15a5a64301cFcc39c90317EBD6Aa3a22cF144#code

require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
    const ThrustpadStakerFactory = await ethers.getContractFactory("ThrustpadStakerFactory");
    const factory = await ThrustpadStakerFactory.deploy(ThrustpadStakerFactory);

    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    console.log("factory Address deployed to: ", factoryAddress);
}

main();

//npx hardhat run scripts/deploy-staker-factory.js --network opencampus
//factory Address deployed to:  0x4829aAfc2BEC24153A07bF3003f9a120F03E67fe
//npx hardhat verify --network opencampus 0x4829aAfc2BEC24153A07bF3003f9a120F03E67fe
//https://opencampus-codex.blockscout.com/address/0x4829aAfc2BEC24153A07bF3003f9a120F03E67fe#code

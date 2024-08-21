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

//npx hardhat run scripts/deploy-token-factory.js --network opencampus
//factory Address deployed to:  0xbd12Ffb8c5e6676A7cA18DA7B36a912c85Ce8B17
//npx hardhat verify --network opencampus 0xbd12Ffb8c5e6676A7cA18DA7B36a912c85Ce8B17
//https://opencampus-codex.blockscout.com/address/0xbd12Ffb8c5e6676A7cA18DA7B36a912c85Ce8B17#code

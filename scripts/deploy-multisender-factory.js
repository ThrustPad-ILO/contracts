require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
    const ThrustpadMultiSenderFactory = await ethers.getContractFactory(
        "ThrustpadMultiSenderFactory"
    );
    const factory = await ThrustpadMultiSenderFactory.deploy(ThrustpadMultiSenderFactory);

    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    console.log("factory Address deployed to: ", factoryAddress);
}

main();

//npx hardhat run scripts/deploy-multisender-factory.js --network opencampus

//npx hardhat verify --network opencampus 0x5634cD439745e89ab4FEdA3F27091aD99591074d
//https://opencampus-codex.blockscout.com/address/0x5634cD439745e89ab4FEdA3F27091aD99591074d#code

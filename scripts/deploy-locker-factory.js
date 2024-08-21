require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
    const ThrustpadLockerFactory = await ethers.getContractFactory("ThrustpadLockerFactory");
    const factory = await ThrustpadLockerFactory.deploy(ThrustpadLockerFactory);

    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    console.log("factory Address deployed to: ", factoryAddress);
}

main();

//npx hardhat run scripts/deploy-locker-factory.js --network opencampus
//factory Address deployed to:  0xe1B2a006271D9cBDF2561091FafF7E23281Eefe7
//npx hardhat verify --network opencampus 0xe1B2a006271D9cBDF2561091FafF7E23281Eefe7
//https://opencampus-codex.blockscout.com/address/0xe1B2a006271D9cBDF2561091FafF7E23281Eefe7#code

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
//factory Address deployed to:  0xF884678BFd53C80a21331F58B853a63Bfd7EfFf6
//npx hardhat verify --network opencampus 0xF884678BFd53C80a21331F58B853a63Bfd7EfFf6
//https://opencampus-codex.blockscout.com/address/0xF884678BFd53C80a21331F58B853a63Bfd7EfFf6#code

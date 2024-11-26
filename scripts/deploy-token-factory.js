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
//factory Address deployed to:  0x8c09Fc4a8210EA063d028578EFD453e2239044Ae
//npx hardhat verify --network opencampus 0x8c09Fc4a8210EA063d028578EFD453e2239044Ae
//https://opencampus-codex.blockscout.com/address/0x8c09Fc4a8210EA063d028578EFD453e2239044Ae#code
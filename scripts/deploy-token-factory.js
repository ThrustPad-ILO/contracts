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
//factory Address deployed to:  0xf6ece2d79947f1e2f13617f8ed4041468c3acbcc
//npx hardhat verify --network opencampus 0xf6ece2d79947f1e2f13617f8ed4041468c3acbcc
//https://opencampus-codex.blockscout.com/address/0xf6ece2d79947f1e2f13617f8ed4041468c3acbcc#code
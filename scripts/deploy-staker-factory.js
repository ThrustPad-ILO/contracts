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
//factory Address deployed to:  0x9221E4Cb61908c31e825C0E0B02342f54183F0aa
//npx hardhat verify --network opencampus 0x9221E4Cb61908c31e825C0E0B02342f54183F0aa
//https://opencampus-codex.blockscout.com/address/0x9221E4Cb61908c31e825C0E0B02342f54183F0aa#code

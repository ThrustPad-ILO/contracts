require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
    const ThrustpadFairLaunchFactory = await ethers.getContractFactory(
        "ThrustpadFairLaunchFactory"
    );
    const factory = await ThrustpadFairLaunchFactory.deploy(ThrustpadFairLaunchFactory);

    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    console.log("factory Address deployed to: ", factoryAddress);
}

main();

//0xaA16Aed74f6BF5AA54Afff63789C6de09f605A16

//npx hardhat run scripts/deploy-fair-launch-factory.js --network opencampus
//factory Address deployed to:  0xFD8EC925eb144Af4E2Df1a546Eaf027a2565C40a
//npx hardhat verify --network opencampus 0xFD8EC925eb144Af4E2Df1a546Eaf027a2565C40a
//https://opencampus-codex.blockscout.com/address/0xFD8EC925eb144Af4E2Df1a546Eaf027a2565C40a#code

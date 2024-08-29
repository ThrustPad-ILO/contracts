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

//npx hardhat run scripts/deploy-fair-launch-factory.js --network opencampus
//factory Address deployed to:  0xAB1Eee87C843D38ab7CC4a26383000b291998130
//npx hardhat verify --network opencampus 0xAB1Eee87C843D38ab7CC4a26383000b291998130
//https://opencampus-codex.blockscout.com/address/0xAB1Eee87C843D38ab7CC4a26383000b291998130#code

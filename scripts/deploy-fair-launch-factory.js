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
//factory Address deployed to:  0x715054335FfF3254223B4d4897420276E183b8e0
//npx hardhat verify --network opencampus 0x715054335FfF3254223B4d4897420276E183b8e0
//https://opencampus-codex.blockscout.com/address/0x715054335FfF3254223B4d4897420276E183b8e0#code

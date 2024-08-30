require("dotenv").config();

const { ethers } = require("hardhat");

async function main() {
    const ThrustpadInstantAirdropFactory = await ethers.getContractFactory(
        "ThrustpadInstantAirdropFactory"
    );
    const factory = await ThrustpadInstantAirdropFactory.deploy(ThrustpadInstantAirdropFactory);

    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    console.log("airdrop Address deployed to: ", factoryAddress);
}

main();

//npx hardhat run scripts/deploy-airdrop-factory.js --network opencampus
//factory Address deployed to:  0x243d3Ed80c9D0B530574E005F0626acf7A02CD33
//npx hardhat verify --network opencampus 0x243d3Ed80c9D0B530574E005F0626acf7A02CD33
//https://opencampus-codex.blockscout.com/address/0x243d3Ed80c9D0B530574E005F0626acf7A02CD33#code

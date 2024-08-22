const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");

const name = "Fairy Plum";
const symbol = "FPLUM";
const decimals = 18;
const tokenSupply = 1000000000;
const launchType = {
    mintable: false,
    pausable: false,
    burnable: false,
};

describe("Token Factory", function () {
    before(async function () {
        const [deployer] = await ethers.getSigners();
        const ThrustpadTokenFactory = await ethers.getContractFactory("ThrustpadTokenFactory");
        const factory = await ThrustpadTokenFactory.deploy();

        await factory.waitForDeployment();

        this.factory = factory;
        this.factoryAddress = await factory.getAddress();
        this.deployer = deployer;
        this.deployerAddress = await deployer.getAddress();

        const byteCode = await this.factory.getBytecode(
            name,
            symbol,
            decimals,
            tokenSupply,
            launchType
        );

        this.byteCode = byteCode;
    });

    describe("Token", function () {
        it("Should deploy token with known address", async function () {
            const salt = await this.factory.getdeployedTokensLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(this.byteCode, salt);

            await this.factory.newToken(name, symbol, decimals, tokenSupply, launchType);

            const deployedPumpTokens = await this.factory.getdeployedTokens(this.deployerAddress);

            assert.equal(address, deployedPumpTokens[0]);
            assert.equal(deployedPumpTokens.length, 1);

            const token = await ethers.getContractAt("ThrustpadToken", address);

            assert.equal(await token.totalSupply(), ethers.parseEther(tokenSupply.toString()));

            await expect(
                token.connect(this.deployer).mint(this.deployerAddress, ethers.parseEther("100000"))
            ).to.be.revertedWith("minting is disabled");
            await expect(token.connect(this.deployer).pause()).to.be.revertedWith(
                "pausing is disabled"
            );
            expect(await token.connect(this.deployer).renounceOwnership()).not.to.be.reverted;
        });

        it("Should deploy token with launch type mintable, renounced, pausable and burnable", async function () {
            const launchType = {
                mintable: true,
                pausable: true,
                burnable: true,
            };

            const byteCode = await this.factory.getBytecode(
                name,
                symbol,
                decimals,
                tokenSupply,
                launchType
            );

            const salt = await this.factory.getdeployedTokensLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            await this.factory.newToken(name, symbol, decimals, tokenSupply, launchType);

            const token = await ethers.getContractAt("ThrustpadToken", address);

            //If renounce ownership is checked, call thsi immediately after token deployment
            await token.connect(this.deployer).renounceOwnership();

            const deployedTokens = await this.factory.getdeployedTokens(this.deployerAddress);

            assert.equal(address, deployedTokens[1]);
            assert.equal(deployedTokens.length, 2);

            await expect(
                token.connect(this.deployer).mint(this.deployerAddress, ethers.parseEther("100000"))
            ).to.be.reverted;
            await expect(token.connect(this.deployer).pause()).to.be.reverted;
            await expect(token.connect(this.deployer).renounceOwnership()).to.be.reverted;
        });
    });
});

//For testing: npx hardhat test test/token_factory.test.js --network hardhat

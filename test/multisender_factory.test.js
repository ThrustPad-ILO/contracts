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

describe("Token Multisender", function () {
    before(async function () {
        const [deployer] = await ethers.getSigners();
        const ThrustpadTokenFactory = await ethers.getContractFactory("ThrustpadTokenFactory");
        const tokenFactory = await ThrustpadTokenFactory.deploy();

        await tokenFactory.waitForDeployment();

        this.tokenFactory = tokenFactory;
        this.tokenFactoryfactoryAddress = await tokenFactory.getAddress();
        this.deployer = deployer;
        this.deployerAddress = await deployer.getAddress();

        const ThrustpadMultiSenderFactory = await ethers.getContractFactory(
            "ThrustpadMultiSenderFactory"
        );
        const multisenderFactory = await ThrustpadMultiSenderFactory.deploy();
        this.multisenderFactory = multisenderFactory;
    });

    describe("Multisender ↗️↗️↗️", function () {
        it("Should deploy multisender and distribute 1 token each to 100 wallets", async function () {
            const tbyteCode = await this.tokenFactory.getBytecode(
                name,
                symbol,
                decimals,
                tokenSupply,
                launchType
            );

            const tsalt = await this.tokenFactory.getdeployedTokensLen(this.deployerAddress);
            const tokenAddress = await this.tokenFactory.getAddressCreate2(tbyteCode, tsalt);

            await this.tokenFactory.newToken(name, symbol, decimals, tokenSupply, launchType, {
                value: ethers.parseEther("1"), //Add creation fee
            });

            const mbyteCode = await this.multisenderFactory.getBytecode(
                tokenAddress,
                new Array(100).fill("0x6836578dae5d158466813b59598ea1fffff80b1a"),
                new Array(100).fill(ethers.parseEther("1"))
            );
            const msalt = await this.multisenderFactory.getdeployedMultisendersLen(
                this.deployerAddress
            );
            const multisenderAddress = await this.multisenderFactory.getAddressCreate2(
                mbyteCode,
                msalt
            );

            const token = await ethers.getContractAt("ThrustpadToken", tokenAddress);

            await token.approve(this.multisenderFactory, ethers.parseEther("100"));

            await this.multisenderFactory.newMultisender(
                tokenAddress,
                new Array(100).fill("0x6836578dae5d158466813b59598ea1fffff80b1a"),
                new Array(100).fill(ethers.parseEther("1")),
                {
                    value: ethers.parseEther("1"), //Add creation fee
                }
            );

            const deployedMultisenders = await this.multisenderFactory.getdeployedMultisenders(
                this.deployerAddress
            );

            assert.equal(multisenderAddress, deployedMultisenders[0]);
            assert.equal(deployedMultisenders.length, 1);

            assert.equal(
                await token.balanceOf("0x6836578dae5d158466813b59598ea1fffff80b1a"),
                ethers.parseEther("100")
            );
        });

        it("Should deploy multisender and distribute 0.01 ETH each to 100 wallets", async function () {
            const mbyteCode = await this.multisenderFactory.getBytecode(
                ethers.ZeroAddress,
                new Array(100).fill("0x6836578dae5d158466813b59598ea1fffff80b1a"),
                new Array(100).fill(ethers.parseEther("0.01"))
            );
            const msalt = await this.multisenderFactory.getdeployedMultisendersLen(
                this.deployerAddress
            );
            const multisenderAddress = await this.multisenderFactory.getAddressCreate2(
                mbyteCode,
                msalt
            );

            await this.multisenderFactory.newMultisender(
                ethers.ZeroAddress,
                new Array(100).fill("0x6836578dae5d158466813b59598ea1fffff80b1a"),
                new Array(100).fill(ethers.parseEther("0.01")),
                {
                    value: ethers.parseEther("2"), //Add creation fee
                }
            );

            const deployedMultisenders = await this.multisenderFactory.getdeployedMultisenders(
                this.deployerAddress
            );

            assert.equal(multisenderAddress, deployedMultisenders[1]);
            assert.equal(deployedMultisenders.length, 2);

            assert.equal(
                await ethers.provider.getBalance("0x6836578dae5d158466813b59598ea1fffff80b1a"),
                ethers.parseEther("1")
            );
        });
    });
});

//For testing: npx hardhat test test/multisender_factory.test.js --network hardhat

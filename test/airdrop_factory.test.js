const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Airdrop Factory", function () {
    before(async function () {
        const [deployer, user1, user2] = await ethers.getSigners();
        const ThrustpadInstantAirdropFactory = await ethers.getContractFactory(
            "ThrustpadInstantAirdropFactory"
        );
        const factory = await ThrustpadInstantAirdropFactory.deploy();

        await factory.waitForDeployment();

        this.factory = factory;
        this.factoryAddress = await factory.getAddress();
        this.deployer = deployer;
        this.deployerAddress = await deployer.getAddress();

        this.user1 = user1;
        this.user2 = user2;
        this.user1Address = await user1.getAddress();
        this.user2Address = await user2.getAddress();
    });

    describe("Airdrop Claim", function () {
        it("Should deploy launch and user can buy and claim successfully", async function () {
            const MockToken = await ethers.getContractFactory("MockToken");
            const token = await MockToken.deploy();
            const tokenAddress = await token.getAddress();
            const totalAmountTokens = 5500 + 4500 + 3500;
            const root = "0xe59de657a3a0180809970c56efa81b86ab6a5dde06c75cdf738bb8eeb8023873";

            const byteCode = await this.factory.getBytecode(
                tokenAddress,
                root,
                this.deployerAddress
            );
            const salt = await this.factory.getdeployedAirdropsLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            await token.approve(
                this.factoryAddress,
                ethers.parseEther(totalAmountTokens.toString())
            );
            await this.factory.newInstantAirdrop(
                tokenAddress,
                root,
                ethers.parseEther(totalAmountTokens.toString()),
                {
                    value: ethers.parseEther("1"),
                }
            );

            const deployedLaunches = await this.factory.getdeployedAirdrops(this.deployerAddress);

            assert.equal(address, deployedLaunches[0]);
            assert.equal(deployedLaunches.length, 1);

            const drop = await ethers.getContractAt("ThrustpadInstantAirdrop", address);

            assert.equal(
                await token.balanceOf(address),
                ethers.parseEther(totalAmountTokens.toString())
            );

            await expect(
                drop
                    .connect(this.user1)
                    .claim(ethers.parseEther("4500"), [
                        "0x14f4a23a717a9fe97ab6b6f1968fea1f2b59115a0611ac21791909340071e815",
                        "0x784c24ff6ef2d6d31ea1635506abea178113a9029b82bf5d6627e487533a7d6b",
                        "0xa4a011ec7be96c523965e6adc19c4bfc1023186ee523ae87343d289c5ed715e9",
                    ])
            ).to.be.revertedWith("ThrustpadInstantAirdrop: Invalid proof");

            await expect(
                drop
                    .connect(this.user1)
                    .claim(ethers.parseEther("4500"), [
                        "0x14f4a23a717a9fe97ab6b6f1968fea1f2b59115a0611ac21791909340071e815",
                        "0x784c24ff6ef2d6d31ea1635506abea178113a9029b82bf5d6627e487533a7d6b",
                        "0xa4a011ec7be96c523965e6adc19c4bfc1023186ee523ae87343d289c5ed715e9",
                        "0x755391267a26d931f6b09d2897e5913fe027cdf11bf210d3c4c9fc12fee5fb23",
                    ])
            )
                .to.emit(drop, "Claimed")
                .withArgs(this.user1Address, ethers.parseEther("4500"));

            await expect(
                drop
                    .connect(this.user1)
                    .claim(ethers.parseEther("4500"), [
                        "0x14f4a23a717a9fe97ab6b6f1968fea1f2b59115a0611ac21791909340071e815",
                        "0x784c24ff6ef2d6d31ea1635506abea178113a9029b82bf5d6627e487533a7d6b",
                        "0xa4a011ec7be96c523965e6adc19c4bfc1023186ee523ae87343d289c5ed715e9",
                        "0x755391267a26d931f6b09d2897e5913fe027cdf11bf210d3c4c9fc12fee5fb23",
                    ])
            ).to.be.revertedWith("ThrustpadInstantAirdrop: Account already claimed");

            assert.equal(await drop.claimed(this.user1Address), true);

            await expect(
                drop
                    .connect(this.user2)
                    .claim(ethers.parseEther("3500"), [
                        "0x123182ec5e118808e16bfea3f2feea714ab1be2ab0c73e8c2db1b6c469726764",
                        "0x784c24ff6ef2d6d31ea1635506abea178113a9029b82bf5d6627e487533a7d6b",
                        "0xa4a011ec7be96c523965e6adc19c4bfc1023186ee523ae87343d289c5ed715e9",
                    ])
            ).to.be.revertedWith("ThrustpadInstantAirdrop: Invalid proof");

            await expect(
                drop
                    .connect(this.user2)
                    .claim(ethers.parseEther("3500"), [
                        "0x123182ec5e118808e16bfea3f2feea714ab1be2ab0c73e8c2db1b6c469726764",
                        "0x784c24ff6ef2d6d31ea1635506abea178113a9029b82bf5d6627e487533a7d6b",
                        "0xa4a011ec7be96c523965e6adc19c4bfc1023186ee523ae87343d289c5ed715e9",
                        "0x755391267a26d931f6b09d2897e5913fe027cdf11bf210d3c4c9fc12fee5fb23",
                    ])
            )
                .to.emit(drop, "Claimed")
                .withArgs(this.user2Address, ethers.parseEther("3500"));

            await expect(
                drop
                    .connect(this.user2)
                    .claim(ethers.parseEther("4500"), [
                        "0x123182ec5e118808e16bfea3f2feea714ab1be2ab0c73e8c2db1b6c469726764",
                        "0x784c24ff6ef2d6d31ea1635506abea178113a9029b82bf5d6627e487533a7d6b",
                        "0xa4a011ec7be96c523965e6adc19c4bfc1023186ee523ae87343d289c5ed715e9",
                        "0x755391267a26d931f6b09d2897e5913fe027cdf11bf210d3c4c9fc12fee5fb23",
                    ])
            ).to.be.revertedWith("ThrustpadInstantAirdrop: Account already claimed");

            assert.equal(await drop.claimed(this.user2Address), true);

            assert.equal(await drop.totalClaimed(), ethers.parseEther("8000"));
        });
    });
});

//For testing: npx hardhat test test/airdrop_factory.test.js --network hardhat

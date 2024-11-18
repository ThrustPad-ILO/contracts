const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const twenty4Hours = 86400; //24 hours in seconds

describe("Locker Factory", function () {
    before(async function () {
        const [deployer] = await ethers.getSigners();
        const ThrustpadLockerFactory = await ethers.getContractFactory("ThrustpadLockerFactory");
        const factory = await ThrustpadLockerFactory.deploy();

        await factory.waitForDeployment();

        this.factory = factory;
        this.factoryAddress = await factory.getAddress();
        this.deployer = deployer;
        this.deployerAddress = await deployer.getAddress();
    });

    describe("Locker", function () {
        it("Should deploy token with known address", async function () {
            const amount = ethers.parseEther("1000000000");
            const MockToken = await ethers.getContractFactory("MockToken");
            const token = await MockToken.deploy();
            const tokenAddress = await token.getAddress();
            const byteCode = await this.factory.getBytecode(
                tokenAddress,
                twenty4Hours,
                amount,
                this.deployerAddress
            );

            const salt = await this.factory.getdeployedLocksLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            //Allow factory  to spend tokens
            await token.approve(this.factoryAddress, amount);
            await this.factory.newLock(tokenAddress, twenty4Hours, amount, {
                value: ethers.parseEther("1"), //Add creation
            });

            const deployedLocks = await this.factory.getdeployedLocks(this.deployerAddress);
            const lock = await ethers.getContractAt("ThrustpadLocker", address);

            assert.equal(address, deployedLocks[0]);
            assert.equal(deployedLocks.length, 1);

            await expect(lock.release()).to.be.revertedWith("TokenLock: lock time not expired");

            assert.equal(await lock.token(), tokenAddress);
            assert.equal(await lock.lockTime(), twenty4Hours);
            assert.equal(await token.balanceOf(address), amount);
        });

        it("Should withdraw tokens after lock time", async function () {
            const amount = ethers.parseEther("1000000000");
            const MockToken = await ethers.getContractFactory("MockToken");
            const token = await MockToken.deploy();
            const tokenAddress = await token.getAddress();
            const byteCode = await this.factory.getBytecode(
                tokenAddress,
                twenty4Hours,
                amount,
                this.deployerAddress
            );

            const salt = await this.factory.getdeployedLocksLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            //Allow factory  to spend tokens
            await token.approve(this.factoryAddress, amount);
            await this.factory.newLock(tokenAddress, twenty4Hours, amount, {
                value: ethers.parseEther("1"), //Add creation
            });

            const deployedLocks = await this.factory.getdeployedLocks(this.deployerAddress);

            const lock = await ethers.getContractAt("ThrustpadLocker", address);

            assert.equal(address, deployedLocks[1]);
            assert.equal(deployedLocks.length, 2);

            await time.increase(twenty4Hours);

            assert.equal(await token.balanceOf(this.deployerAddress), 0);
            assert.equal(await token.balanceOf(address), amount);
            assert.equal(await lock.lockAmount(), amount);

            await expect(lock.release()).to.not.be.reverted;

            assert.equal(await token.balanceOf(this.deployerAddress), amount);
            assert.equal(await token.balanceOf(address), 0);
            assert.equal(await lock.released(), true);

            await expect(lock.release()).to.be.revertedWith("TokenLock: no tokens to release");
        });
    });
});

//For testing: npx hardhat test test/lock_factory.test.js --network hardhat

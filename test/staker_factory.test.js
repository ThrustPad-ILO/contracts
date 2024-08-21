const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const twenty4Hours = 86400;

describe("Locker Factory", function () {
    before(async function () {
        const [deployer, staker1, staker2] = await ethers.getSigners();
        const ThrustpadStakerFactory = await ethers.getContractFactory("ThrustpadStakerFactory");
        const factory = await ThrustpadStakerFactory.deploy();

        await factory.waitForDeployment();

        this.factory = factory;
        this.factoryAddress = await factory.getAddress();
        this.deployer = deployer;
        this.deployerAddress = await deployer.getAddress();
        this.staker1 = staker1;
        this.staker2 = staker2;
    });

    describe("Locker", function () {
        it("Should deploy token with known address", async function () {
            const amount = ethers.parseEther("1000000000");
            const MockToken = await ethers.getContractFactory("MockToken");
            const token = await MockToken.deploy();
            const tokenAddress = await token.getAddress();

            const currBlockTime = await time.latest();
            const rate = 1000;
            const hardcap = 1000000;
            const apyEdu = 7;
            const apyToken = 8;
            const rewardDepositToken = hardcap * (apyToken / 100); //8% tokenAPY
            const rewardDepositEdu = (hardcap * (apyEdu / 100)) / rate; //2% eduAPY

            const options = {
                token: tokenAddress, //token
                startDate: currBlockTime, //start time
                endDate: currBlockTime + twenty4Hours, //end time
                hardCap: ethers.parseEther(hardcap.toString()), //hardcap
                minTokenStake: ethers.parseEther("1000"), //minimum stake
                apyEdu, //eduAPY   cannot be less than 2%
                apyToken, //tokenAPY cannot be less than 8%
                rewardPoolToken: ethers.parseEther(rewardDepositToken.toString()), //total reward pool token,
                rewardPoolEDU: ethers.parseEther(rewardDepositEdu.toString()), //total reward pool edu,
                tokenToEDURate: rate, //rate meaning 1 edu = 10,000 token : help to calculate reward since no price oracle to get live price
            };
            const byteCode = await this.factory.getBytecode(options);
            const salt = await this.factory.getdeployedStakersLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            //Allow factory  to spend tokens
            await token.approve(this.factoryAddress, amount);
            await this.factory.newStaker(options, {
                value: options.rewardPoolEDU,
            });

            const deployedStakers = await this.factory.getdeployedStakers(this.deployerAddress);
            const staker = await ethers.getContractAt("ThrustpadStaker", address);

            this.staker = staker;
            this.token = token;
            this.stakerAddress = address;

            assert.equal(address, deployedStakers[0]);
            assert.equal(deployedStakers.length, 1);

            const opt = await staker.option();

            assert.equal(opt[0], tokenAddress);
            assert.equal(await ethers.provider.getBalance(address), opt.rewardPoolEDU);
        });

        it("Should test staking", async function () {
            const estimateReward = await this.staker.calculateRewards(
                ethers.parseEther("1000"),
                60 * 600 * 24 * 30
            );

            await this.token.approve(this.stakerAddress, ethers.parseEther("1000"));
            await this.staker.directStake(ethers.parseEther("1000"), 0); //0 = 30 days, 1 = 45 days, 2 = 60 days, 3 = 90 days

            //get stakes
            console.log(await this.staker.getStakes(this.deployerAddress));

            const ONE_DAY_IN_SECS = 60 * 60 * 24;

            await time.increaseTo((await time.latest()) + ONE_DAY_IN_SECS);

            //check rewards
            console.log(await this.staker.getClaimableRewards(this.deployerAddress));

            console.log(await this.staker.claimAvailableRewards(0));

            //reward should be claimed
            console.log(await this.staker.getClaimableRewards(this.deployerAddress));
        });
    });
});

//For testing: npx hardhat test test/staker_factory.test.js --network hardhat

const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const twenty4Hours = 86400; //24 hours in seconds

describe("Locker Factory", function () {
    before(async function () {
        const [deployer, buyer1, buyer2, buyer3] = await ethers.getSigners();
        const ThrustpadFairLaunchFactory = await ethers.getContractFactory(
            "ThrustpadFairLaunchFactory"
        );
        const factory = await ThrustpadFairLaunchFactory.deploy();

        await factory.waitForDeployment();

        this.factory = factory;
        this.factoryAddress = await factory.getAddress();
        this.deployer = deployer;
        this.deployerAddress = await deployer.getAddress();

        this.buyer1 = buyer1;
        this.buyer2 = buyer2;
        this.buyer3 = buyer3;
    });

    describe("Fair Launch Raise Success", function () {
        it("Should deploy token with known address", async function () {
            const MockToken = await ethers.getContractFactory("MockToken");
            const token = await MockToken.deploy();

            const tokenAddress = await token.getAddress();
            const _amountForSale = 10000;
            const _hardCap = 100;
            const _softCap = 30; // softCap must be greater than or equal to 25% of hardCa
            const _percentageForLiquidity = 60;
            const _percentageForTeam = 40;
            const _listingRate = 90;
            const option = {
                token: tokenAddress,
                softCap: ethers.parseEther(_softCap.toString()), //30 EDU Softcap cannot be less than 30% of hardcap
                hardCap: ethers.parseEther(_hardCap.toString()), //100 EDU
                amountForSale: ethers.parseEther(_amountForSale.toString()), //10000 tokens, making rate 1 EDU = 100 tokens
                listingRate: ethers.parseEther(_listingRate.toString()), //1 EDU = 90 tokens
                minimumBuy: ethers.parseEther("0.1"), //0.1 EDU, Max unique 1000 wallets can buy
                maximumBuy: ethers.parseEther("10"), //10 EDU
                percentageForLiquidity: _percentageForLiquidity, //60% of amount raised, Cannot be less than 60%
                percentageForTeam: _percentageForTeam, //40% of amount raised, Cannot be more than 40%. Both percentage must be equal 100
                startDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 1, //Starts in 1 hour
                endDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 24 * 2, //Ends in 2 days
            };
            const totalAmountTokensUserNeedForLaunch =
                _amountForSale + (_percentageForLiquidity * _hardCap * _listingRate) / 100;
            const byteCode = await this.factory.getBytecode(option);

            const salt = await this.factory.getdeployedLaunchesLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            //Allow factory  to spend total tokens needed for launch
            await token.approve(
                this.factoryAddress,
                ethers.parseEther(totalAmountTokensUserNeedForLaunch.toString())
            );
            await this.factory.newFairLaunch(option);

            const launch = await ethers.getContractAt("ThrustpadFairLaunch", address);
            const deployedLaunches = await this.factory.getdeployedLaunches(this.deployerAddress);

            await expect(launch.buyToken()).to.be.revertedWith(
                "ThrustpadFairLaunch: sale has not started yet"
            );

            assert.equal(address, deployedLaunches[0]);
            assert.equal(deployedLaunches.length, 1);

            //Lets test purchase flow user 3 other different accounts
            //Case: 1
            //Soft cap is filled and sale ended and user claim tokens they purchased
            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
            ).to.be.revertedWith("ThrustpadFairLaunch: sale has not started yet"); //use buyer1 account

            await time.increase(3600); //1 hour

            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("0.09") })
            ).to.be.revertedWith("ThrustpadFairLaunch: amount is less than minimum buy");

            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
            ).to.be.revertedWith("ThrustpadFairLaunch: amount is more than maximum buy");

            expect(await launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("10") }))
                .to.emit(launch, "TokenBought")
                .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

            expect(await launch.connect(this.buyer2).buyToken({ value: ethers.parseEther("10") }))
                .to.emit(launch, "TokenBought")
                .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

            expect(await launch.connect(this.buyer2).buyToken({ value: ethers.parseEther("10") }))
                .to.emit(launch, "TokenBought")
                .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

            time.increase(86400 * 2.02); //2 days

            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("10") })
            ).to.be.revertedWith("ThrustpadFairLaunch: sale has ended");

            await expect(await launch.connect(this.buyer1).claimTokens())
                .to.emit(launch, "TokenClaimed")
                .withArgs(await this.buyer1.getAddress(), tokenAddress, ethers.parseEther("1000"));

            const totalSold = await launch.totalSold();

            assert.equal(totalSold, ethers.parseEther("30"));

            //Team can Claim 12 EDU which is 40% of 30 EDU raised [Button only shows for deplyer address on UI]
            await expect(await launch.connect(this.deployer).withdrawTeamTokens())
                .to.emit(launch, "TeamClaimed")
                .withArgs(this.deployerAddress, tokenAddress, ethers.parseEther("12"));

            //Anyone can call the deploy Liquidity function
        });
    });

    describe.skip("Fair Launch Raise Failed", function () {
        it("Should deploy token with known address", async function () {
            const MockToken = await ethers.getContractFactory("MockToken");
            const token = await MockToken.deploy();

            const tokenAddress = await token.getAddress();
            const _amountForSale = 10000;
            const _hardCap = 100;
            const _softCap = 30; // softCap must be greater than or equal to 25% of hardCa
            const _percentageForLiquidity = 60;
            const _percentageForTeam = 40;
            const _listingRate = 90;
            const option = {
                token: tokenAddress,
                softCap: ethers.parseEther(_softCap.toString()), //30 EDU Softcap cannot be less than 30% of hardcap
                hardCap: ethers.parseEther(_hardCap.toString()), //100 EDU
                amountForSale: ethers.parseEther(_amountForSale.toString()), //10000 tokens, making rate 1 EDU = 100 tokens
                listingRate: ethers.parseEther(_listingRate.toString()), //1 EDU = 90 tokens
                minimumBuy: ethers.parseEther("0.1"), //0.1 EDU, Max unique 1000 wallets can buy
                maximumBuy: ethers.parseEther("10"), //10 EDU
                percentageForLiquidity: _percentageForLiquidity, //60% of amount raised, Cannot be less than 60%
                percentageForTeam: _percentageForTeam, //40% of amount raised, Cannot be more than 40%. Both percentage must be equal 100
                startDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 1, //Starts in 1 hour
                endDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 24 * 2, //Ends in 2 days
            };
            const totalAmountTokensUserNeedForLaunch =
                _amountForSale + (_percentageForLiquidity * _hardCap * _listingRate) / 100;
            const byteCode = await this.factory.getBytecode(option);

            const salt = await this.factory.getdeployedLaunchesLen(this.deployerAddress);
            const address = await this.factory.getAddressCreate2(byteCode, salt);

            //Allow factory  to spend total tokens needed for launch
            await token.approve(
                this.factoryAddress,
                ethers.parseEther(totalAmountTokensUserNeedForLaunch.toString())
            );
            await this.factory.newFairLaunch(option);

            const launch = await ethers.getContractAt("ThrustpadFairLaunch", address);
            const deployedLaunches = await this.factory.getdeployedLaunches(this.deployerAddress);

            await expect(launch.buyToken()).to.be.revertedWith(
                "ThrustpadFairLaunch: sale has not started yet"
            );

            assert.equal(address, deployedLaunches[0]);
            assert.equal(deployedLaunches.length, 1);

            //Lets test purchase flow user 3 other different accounts
            //Case: 1
            //Soft cap is filled and sale ended and user claim tokens they purchased
            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
            ).to.be.revertedWith("ThrustpadFairLaunch: sale has not started yet"); //use buyer1 account

            await time.increase(3600); //1 hour

            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("0.09") })
            ).to.be.revertedWith("ThrustpadFairLaunch: amount is less than minimum buy");

            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
            ).to.be.revertedWith("ThrustpadFairLaunch: amount is more than maximum buy");

            expect(await launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("10") }))
                .to.emit(launch, "TokenBought")
                .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

            expect(await launch.connect(this.buyer2).buyToken({ value: ethers.parseEther("10") }))
                .to.emit(launch, "TokenBought")
                .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

            expect(await launch.connect(this.buyer2).buyToken({ value: ethers.parseEther("10") }))
                .to.emit(launch, "TokenBought")
                .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

            time.increase(86400 * 2.02); //2 days

            await expect(
                launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("10") })
            ).to.be.revertedWith("ThrustpadFairLaunch: sale has ended");

            await expect(await launch.connect(this.buyer1).claimTokens())
                .to.emit(launch, "TokenClaimed")
                .withArgs(await this.buyer1.getAddress(), tokenAddress, ethers.parseEther("1000"));
        });
    });
});

//For testing: npx hardhat test test/fair_launch_factory.test.js --network hardhat

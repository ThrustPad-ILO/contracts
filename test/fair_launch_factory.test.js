const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { bigint } = require("hardhat/internal/core/params/argumentTypes");

const twenty4Hours = 86400; //24 hours in seconds

describe("FairLaunch Factory", function () {
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
    it("Should deploy launch and user can buy and claim successfully", async function () {
      const MockToken = await ethers.getContractFactory("ThrustpadToken");
      const token = await MockToken.deploy(
        "Thrustpad Token",
        "THRUST",
        18,
        1_000_000_000,
        {
          mintable: true,
          burnable: true,
          pausable: true,
        },
        this.deployerAddress
      );
      const decimals = await token.decimals(); //tokenDecimals

      const tokenAddress = await token.getAddress();
      const _amountForSale = 6_000_000;
      const _hardCap = 300;
      const _softCap = 100; // softCap must be greater than or equal to 25% of hardCa
      const _percentageForLiquidity = 70;
      const _percentageForTeam = 30;
      const _listingRate = 20_000;
      const option = {
        token: tokenAddress,
        softCap: ethers.parseEther(_softCap.toString()), //30 EDU Softcap cannot be less than 30% of hardcap
        hardCap: ethers.parseEther(_hardCap.toString()), //100 EDU
        amountForSale: ethers.parseUnits(_amountForSale.toString(), decimals), //10000 tokens, making rate 1 EDU = 100 tokens
        listingRate: ethers.parseUnits(_listingRate.toString(), decimals), //1 EDU = 90 tokens
        minimumBuy: ethers.parseEther("2"), //0.1 EDU, Max unique 1000 wallets can buy
        maximumBuy: ethers.parseEther("50"), //10 EDU
        percentageForLiquidity: _percentageForLiquidity, //60% of amount raised, Cannot be less than 60%
        percentageForTeam: _percentageForTeam, //40% of amount raised, Cannot be more than 40%. Both percentage must be equal 100
        startDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 1, //Starts in 1 hour
        endDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 24 * 12, //Ends in 2 days
      };

      console.log(option);

      // _hardCap * percentageForLiquidity
      const totalAmountTokensUserNeedForLaunch =
        _amountForSale +
        (_percentageForLiquidity * _hardCap * _listingRate) / 100;
      const byteCode = await this.factory.getBytecode(
        option,
        this.deployerAddress
      );

      console.log({ totalAmountTokensUserNeedForLaunch });
      console.log((_percentageForLiquidity * _hardCap * _listingRate) / 100);
      console.log(
        (BigInt(option.percentageForLiquidity) *
          option.hardCap *
          option.listingRate) /
          100n /
          BigInt(10n ** (decimals + 18n))
      );

      console.log({
        hardCap: option.hardCap,
        amountForSale: option.amountForSale,
        percentageForLiquidity: option.percentageForLiquidity,
        listingRate: option.listingRate,
        decimals,
      });

      console.log(
        await this.factory.calculateTotalTokensNeeded(
          option.hardCap,
          option.amountForSale,
          option.percentageForLiquidity,
          option.listingRate,
          decimals
        )
      );

      // return;
      const salt = await this.factory.getdeployedLaunchesLen(
        this.deployerAddress
      );
      const address = await this.factory.getAddressCreate2(byteCode, salt);

      //Allow factory  to spend total tokens needed for launch
      await token.approve(
        this.factoryAddress,
        ethers.parseEther(totalAmountTokensUserNeedForLaunch.toString())
      );
      await this.factory.newFairLaunch(option, {
        value: ethers.parseEther("1"), //Add creation fee
      });

      const launch = await ethers.getContractAt("ThrustpadFairLaunch", address);
      const deployedLaunches = await this.factory.getdeployedLaunches(
        this.deployerAddress
      );

      console.log(deployedLaunches);
      return;
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
        launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("0.09") })
      ).to.be.revertedWith(
        "ThrustpadFairLaunch: amount is less than minimum buy"
      );

      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
      ).to.be.revertedWith(
        "ThrustpadFairLaunch: amount is more than maximum buy"
      );

      expect(
        await launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("10") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

      expect(
        await launch
          .connect(this.buyer2)
          .buyToken({ value: ethers.parseEther("10") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer2.getAddress(), ethers.parseEther("10"));

      expect(
        await launch
          .connect(this.buyer3)
          .buyToken({ value: ethers.parseEther("10") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer3.getAddress(), ethers.parseEther("10"));

      await time.increase(86400 * 2); //2 days

      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("10") })
      ).to.be.revertedWith("ThrustpadFairLaunch: sale has ended");

      await expect(await launch.connect(this.buyer1).claimTokens())
        .to.emit(launch, "TokenClaimed")
        .withArgs(
          await this.buyer1.getAddress(),
          tokenAddress,
          ethers.parseEther("1000")
        );

      await expect(await launch.connect(this.buyer2).claimTokens())
        .to.emit(launch, "TokenClaimed")
        .withArgs(
          await this.buyer2.getAddress(),
          tokenAddress,
          ethers.parseEther("1000")
        );

      //Can't claim twice
      await expect(
        launch.connect(this.buyer2).claimTokens()
      ).to.be.revertedWith("ThrustpadFairLaunch: tokens already claimed");

      //To get if user has claimed token and amount of token claimed
      assert.equal(
        await launch.claimed(await this.buyer2.getAddress()),
        ethers.parseEther("1000")
      );

      const totalSold = await launch.totalSold(); //In EDU

      assert.equal(totalSold, ethers.parseEther("30"));

      //Team can Claim 12 EDU which is 40% of 30 EDU raised [Button only shows for deplyer address on UI]
      await expect(await launch.connect(this.deployer).withdrawTeamTokens())
        .to.emit(launch, "TeamClaimed")
        .withArgs(this.deployerAddress, tokenAddress, ethers.parseEther("12"));

      //Anyone can call the deploy Liquidity function after sale end and is successful

      // await expect(await launch.deployLiquidity()).to.emit(launch, "LiquidityDeployed");
    });

    it.only("Should deploy launch and user can buy and claim successfully", async function () {
      // const token = await ethers.getContractAt(
      //   "MockToken",
      //   "0xF9f0be3b74544fDAB507C2F75eFA40Bd15b76877",
      //   this.deployer
      // );
      const ThrustpadToken = await ethers.getContractFactory("ThrustpadToken");
      const token = await ThrustpadToken.deploy(
        "GRACE",
        "GRE",
        6,
        1_000_000_000,
        {
          mintable: true,
          burnable: true,
          pausable: true,
        },
        this.deployerAddress
      );
      const factoryAddress = "0xaA16Aed74f6BF5AA54Afff63789C6de09f605A16";
      const factory = await ethers.getContractAt(
        "ThrustpadFairLaunchFactory",
        factoryAddress,
        this.deployer
      );

      const tokenAddress = await token.getAddress();
      const _amountForSale = 6_000_000;
      const _hardCap = 300;
      const _softCap = 100; // softCap must be greater than or equal to 25% of hardCa
      const _percentageForLiquidity = 60;
      const _percentageForTeam = 40;
      const _listingRate = 18000;
      const decimals = await token.decimals(); //tokenDecimals
      const option = {
        token: tokenAddress,
        softCap: ethers.parseEther(_softCap.toString()), //30 EDU Softcap cannot be less than 30% of hardcap
        hardCap: ethers.parseEther(_hardCap.toString()), //100 EDU
        amountForSale: ethers.parseUnits(_amountForSale.toString(), decimals), //10000 tokens, making rate 1 EDU = 100 tokens
        listingRate: ethers.parseUnits(_listingRate.toString(), decimals), //1 EDU = 90 tokens
        minimumBuy: ethers.parseEther("2"), //0.1 EDU, Max unique 1000 wallets can buy
        maximumBuy: ethers.parseEther("50"), //10 EDU
        percentageForLiquidity: _percentageForLiquidity, //60% of amount raised, Cannot be less than 60%
        percentageForTeam: _percentageForTeam, //40% of amount raised, Cannot be more than 40%. Both percentage must be equal 100
        startDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 1, //Starts in 1 hour
        endDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 24 * 12, //Ends in 12 days
      };
      const deployerAddress = "0x23ec23408904ebc20115BD7b1be52D52e01d8E41";

      console.log(option);
      console.log(this.deployerAddress, deployerAddress);

      const totalAmountTokensUserNeedForLaunch =
        _amountForSale +
        (_percentageForLiquidity * _hardCap * _listingRate) / 100;

      console.log(totalAmountTokensUserNeedForLaunch);

      const factoryTotalAmount = await this.factory.calculateTotalTokensNeeded(
        option.hardCap,
        option.amountForSale,
        option.percentageForLiquidity,
        option.listingRate,
        decimals
      );
      console.log({
        factoryTotalAmount: ethers.formatUnits(factoryTotalAmount, decimals),
      });

      // console.log(
      //   await factory.calculateTokenSaleRate(
      //     option.amountForSale,
      //     option.hardCap,
      //     decimals
      //   )
      // );
      console.log(await factory.getTotalAmount(option));

      // return;
      // await factory.getEncodedConfig(option, this.deployerAddress);
      const byteCode = await factory.getBytecode(option, this.deployerAddress);

      // return;

      console.log({ totalAmountTokensUserNeedForLaunch });

      const salt = await factory.getdeployedLaunchesLen(this.deployerAddress);
      const address = await factory.getAddressCreate2(byteCode, salt);

      //Allow factory  to spend total tokens needed for launch
      await token.approve(
        factoryAddress,
        ethers.parseUnits(
          totalAmountTokensUserNeedForLaunch.toString(),
          decimals
        )
      );

      // return;

      const tx = await factory.newFairLaunch(option, {
        value: ethers.parseEther("1"), //Add creation fee
      });

      console.log(tx);

      const launch = await ethers.getContractAt("ThrustpadFairLaunch", address);
      const deployedLaunches = await factory.getdeployedLaunches(
        this.deployerAddress
      );

      console.log(deployedLaunches);
      return;
      // await expect(launch.buyToken()).to.be.revertedWith(
      //   "ThrustpadFairLaunch: sale has not started yet"
      // );

      assert.equal(address, deployedLaunches[0]);
      assert.equal(deployedLaunches.length, 1);

      return;

      //Lets test purchase flow user 3 other different accounts
      //Case: 1
      //Soft cap is filled and sale ended and user claim tokens they purchased
      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
      ).to.be.revertedWith("ThrustpadFairLaunch: sale has not started yet"); //use buyer1 account

      await time.increase(3600); //1 hour

      await expect(
        launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("0.09") })
      ).to.be.revertedWith(
        "ThrustpadFairLaunch: amount is less than minimum buy"
      );

      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
      ).to.be.revertedWith(
        "ThrustpadFairLaunch: amount is more than maximum buy"
      );

      expect(
        await launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("10") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer1.getAddress(), ethers.parseEther("10"));

      expect(
        await launch
          .connect(this.buyer2)
          .buyToken({ value: ethers.parseEther("10") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer2.getAddress(), ethers.parseEther("10"));

      expect(
        await launch
          .connect(this.buyer3)
          .buyToken({ value: ethers.parseEther("10") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer3.getAddress(), ethers.parseEther("10"));

      await time.increase(86400 * 2); //2 days

      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("10") })
      ).to.be.revertedWith("ThrustpadFairLaunch: sale has ended");

      await expect(await launch.connect(this.buyer1).claimTokens())
        .to.emit(launch, "TokenClaimed")
        .withArgs(
          await this.buyer1.getAddress(),
          tokenAddress,
          ethers.parseEther("1000")
        );

      await expect(await launch.connect(this.buyer2).claimTokens())
        .to.emit(launch, "TokenClaimed")
        .withArgs(
          await this.buyer2.getAddress(),
          tokenAddress,
          ethers.parseEther("1000")
        );

      //Can't claim twice
      await expect(
        launch.connect(this.buyer2).claimTokens()
      ).to.be.revertedWith("ThrustpadFairLaunch: tokens already claimed");

      //To get if user has claimed token and amount of token claimed
      assert.equal(
        await launch.claimed(await this.buyer2.getAddress()),
        ethers.parseEther("1000")
      );

      const totalSold = await launch.totalSold(); //In EDU

      console.log({ totalSold });
      return;
      assert.equal(totalSold, ethers.parseEther("30"));

      //Team can Claim 12 EDU which is 40% of 30 EDU raised [Button only shows for deplyer address on UI]
      await expect(await launch.connect(this.deployer).withdrawTeamTokens())
        .to.emit(launch, "TeamClaimed")
        .withArgs(this.deployerAddress, tokenAddress, ethers.parseEther("12"));

      //Anyone can call the deploy Liquidity function after sale end and is successful

      // await expect(await launch.deployLiquidity()).to.emit(launch, "LiquidityDeployed");
    });
  });

  describe.skip("Fair Launch Raise Failed", function () {
    it("Should deploy launch and user can buy and claim refund", async function () {
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
        _amountForSale +
        (_percentageForLiquidity * _hardCap * _listingRate) / 100;
      const byteCode = await this.factory.getBytecode(
        option,
        this.deployerAddress
      );

      const salt = await this.factory.getdeployedLaunchesLen(
        this.deployerAddress
      );
      const address = await this.factory.getAddressCreate2(byteCode, salt);

      //Allow factory  to spend total tokens needed for launch
      await token.approve(
        this.factoryAddress,
        ethers.parseEther(totalAmountTokensUserNeedForLaunch.toString())
      );
      await this.factory.newFairLaunch(option, {
        value: ethers.parseEther("1"), //Add creation fee
      });

      const launch = await ethers.getContractAt("ThrustpadFairLaunch", address);
      const deployedLaunches = await this.factory.getdeployedLaunches(
        this.deployerAddress
      );

      await expect(launch.buyToken()).to.be.revertedWith(
        "ThrustpadFairLaunch: sale has not started yet"
      );

      assert.equal(address, deployedLaunches[0]);
      assert.equal(deployedLaunches.length, 1);

      //Lets test purchase flow user 3 other different accounts
      //Case: 2
      //Soft cap is not filled and sale ended and user claim back the EDU tokene they use to purchased
      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
      ).to.be.revertedWith("ThrustpadFairLaunch: sale has not started yet"); //use buyer1 account

      await time.increase(3600); //1 hour

      await expect(
        launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("0.09") })
      ).to.be.revertedWith(
        "ThrustpadFairLaunch: amount is less than minimum buy"
      );

      await expect(
        launch.connect(this.buyer1).buyToken({ value: ethers.parseEther("11") })
      ).to.be.revertedWith(
        "ThrustpadFairLaunch: amount is more than maximum buy"
      );

      //A user can buy multiple times
      expect(
        await launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("2") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer1.getAddress(), ethers.parseEther("2"));

      expect(
        await launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("3") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer1.getAddress(), ethers.parseEther("3"));

      assert.equal(
        await launch.purchaseHistory(this.buyer1.getAddress()),
        ethers.parseEther("5")
      );

      expect(
        await launch
          .connect(this.buyer2)
          .buyToken({ value: ethers.parseEther("5") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer2.getAddress(), ethers.parseEther("5"));

      expect(
        await launch
          .connect(this.buyer2)
          .buyToken({ value: ethers.parseEther("5") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer2.getAddress(), ethers.parseEther("5"));

      await time.increase(86400 * 3); //2 days

      await expect(
        launch.connect(this.buyer1).claimTokens()
      ).to.be.revertedWith("ThrustpadFairLaunch: soft cap not reached");

      await expect(await launch.connect(this.buyer1).claimRefund())
        .to.emit(launch, "Refund")
        .withArgs(
          await this.buyer1.getAddress(),
          tokenAddress,
          ethers.parseEther("5")
        ); //Claim total of 5 EDU you purchased
    });
  });
});

//For testing: npx hardhat test test/fair_launch_factory.test.js --network hardhat

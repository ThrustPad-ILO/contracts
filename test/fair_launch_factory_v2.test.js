const { expect, assert, should } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { bigint } = require("hardhat/internal/core/params/argumentTypes");
const { parseEther, toBigInt } = ethers;
const bn = require("bignumber.js");

describe("FairLaunch Factory V2", function () {
  const tokenAddress = "0x5285305a1c3Cf56f13dDee696676A41aAe5bB9b5";
  const wedu = "0x135E304139c5113895C97Dce8B9eDa56D4b53CF9";
  const iloAddress = "0xD4a89f0952b4cb0b59c004944eDB29e9F5F48a23";

  before(async function () {
    const [deployer, buyer1, buyer2, buyer3, buyer4, buyer5] =
      await ethers.getSigners();
    const ThrustpadFairLaunchFactory = await ethers.getContractFactory(
      "ThrustpadFairLaunchFactory"
    );
    const factory = await ThrustpadFairLaunchFactory.deploy();

    await factory.waitForDeployment();

    this.factory = factory;
    this.factoryAddress = await factory.getAddress();
    this.deployer = deployer;
    this.deployerAddress = await deployer.getAddress();

    this.token = await ethers.getContractAt(
      "ThrustpadToken",
      tokenAddress,
      deployer
    );

    this.buyer1 = buyer1;
    this.buyer2 = buyer2;
    this.buyer3 = buyer3;
    this.buyer4 = buyer4;
    this.buyer5 = buyer5;
  });

  const encodePriceSqrt = (reserve1, reserve0) => {
    return toBigInt(
      new bn(reserve1.toString())
        .div(reserve0.toString())
        .sqrt()
        .multipliedBy(new bn(2).pow(96))
        .integerValue(3)
        .toFixed()
    );
  };

  describe("Fair Launch Raise Success", function () {
    it("Debug", async function () {
      const sqrtPticeX96 = encodePriceSqrt(
        parseEther("100000"),
        parseEther("1")
      );

      console.log(sqrtPticeX96.toString());
    });

    it("Should deploy launch and user can buy and claim successfully", async function () {
      const _amountForSale = 1_000_000;
      const _hardCap = 10;
      const _softCap = 5; // softCap must be greater than or equal to 25% of hardCap
      const _percentageForLiquidity = 80;
      const _percentageForTeam = 20;
      const _listingRate = 100_000;
      const decimals = 12; //tokenDecimals

      const latestBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = latestBlock.timestamp;
      const deadline = currentTimestamp + 2 * 60; //5 mins

      // console.log({ currentTimestamp, deadline });
      // return;
      const options = { timeZone: "Asia/Dubai", hour12: false };

      // const now0 = new Date();
      // now0.setMinutes(now0.getMinutes() + 1);
      // const dubaiTime0 = now0.toLocaleString("en-US", options);

      // const now1 = new Date();
      // now1.setMinutes(now1.getMinutes() + 10);
      // const dubaiTime1 = now1.toLocaleString("en-US", options);

      // const start = Date.parse(dubaiTime0) / 1000;
      // const end = Date.parse(dubaiTime1) / 1000;

      const option = {
        token: tokenAddress,
        softCap: ethers.parseEther(_softCap.toString()), //Softcap cannot be less than 30% of hardcap
        hardCap: ethers.parseEther(_hardCap.toString()),
        amountForSale: ethers.parseUnits(_amountForSale.toString(), decimals),
        listingRate: ethers.parseUnits(_listingRate.toString(), decimals),
        minimumBuy: ethers.parseEther("1"),
        maximumBuy: ethers.parseEther("5"),
        percentageForLiquidity: _percentageForLiquidity,
        percentageForTeam: _percentageForTeam,
        startDate: currentTimestamp,
        endDate: deadline,
        // startDate: Math.floor(new Date().getTime() / 1000.0), //Starts now
        // endDate: Math.floor(new Date().getTime() / 1000.0) + 60 * 60 * 30, //Ends in 10 mins
      };

      console.log(option);

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

      console.log(await this.factory.getTotalAmount(option));

      const byteCode = await this.factory.getBytecode(
        option,
        this.deployerAddress
      );

      console.log({ totalAmountTokensUserNeedForLaunch });

      const salt = await this.factory.getdeployedLaunchesLen(
        this.deployerAddress
      );
      const address = await this.factory.getAddressCreate2(byteCode, salt);

      //Allow factory  to spend total tokens needed for launch
      const tx_ = await this.token
        .connect(this.deployer)
        .approve(
          this.factoryAddress,
          ethers.parseUnits(
            totalAmountTokensUserNeedForLaunch.toString(),
            decimals
          )
        );

      console.log(tx_);

      const tx = await this.factory.newFairLaunch(option, {
        value: ethers.parseEther("0.001"), //Add creation fee
      });

      console.log(tx);

      const deployedLaunches = await this.factory.getdeployedLaunches(
        this.deployerAddress
      );

      console.log(deployedLaunches);
      return;
    });

    it("Should allow users buy successfully", async function () {
      const launch = await ethers.getContractAt(
        "ThrustpadFairLaunch",
        iloAddress
      );

      console.log(await launch.config());

      expect(
        await launch
          .connect(this.buyer1)
          .buyToken({ value: ethers.parseEther("1.2") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer1.getAddress(), ethers.parseEther("1.2"));

      expect(
        await launch
          .connect(this.buyer2)
          .buyToken({ value: ethers.parseEther("1.5") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer2.getAddress(), ethers.parseEther("1.5"));

      expect(
        await launch
          .connect(this.buyer3)
          .buyToken({ value: ethers.parseEther("2") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer3.getAddress(), ethers.parseEther("2"));

      expect(
        await launch
          .connect(this.buyer4)
          .buyToken({ value: ethers.parseEther("2") })
      )
        .to.emit(launch, "TokenBought")
        .withArgs(await this.buyer3.getAddress(), ethers.parseEther("2"));
    });

    it("Should allow users claim successfully", async function () {
      const launch = await ethers.getContractAt(
        "ThrustpadFairLaunch",
        iloAddress
      );

      await expect(await launch.connect(this.buyer1).claimTokens()).to.emit(
        launch,
        "TokenClaimed"
      );

      await expect(await launch.connect(this.buyer2).claimTokens()).to.emit(
        launch,
        "TokenClaimed"
      );

      await expect(await launch.connect(this.buyer3).claimTokens()).to.emit(
        launch,
        "TokenClaimed"
      );

      await expect(await launch.connect(this.buyer4).claimTokens()).to.emit(
        launch,
        "TokenClaimed"
      );
    });

    it("Should claims team token", async function () {
      const launch = await ethers.getContractAt(
        "ThrustpadFairLaunch",
        iloAddress
      );

      const trx = await launch.withdrawTeamTokens();

      console.log(trx);
    });

    it.only("Should deploy Liquidity", async function () {
      const launch = await ethers.getContractAt(
        "ThrustpadFairLaunch",
        iloAddress
      );

      const totalSold = await launch.totalSold();

      console.log(await launch.config());
      console.log(totalSold.toString());
      // return;

      const [token0, token1] =
        Number(wedu) < Number(tokenAddress)
          ? [wedu, tokenAddress]
          : [tokenAddress, wedu];

      const trx = await launch.deployLiquidity(
        token0,
        token1,
        500,
        encodePriceSqrt(100_000e12, 1e18)
      );

      console.log(trx);
    });

    it("Emergency withdraw EDU", async function () {
      const launch = await ethers.getContractAt(
        "ThrustpadFairLaunch",
        iloAddress
      );

      const trx = await launch.emergencyTransferEDU(ethers.parseEther("5.36"));

      console.log(trx);
    });

    it("Emergency withdraw Tokens", async function () {
      const launch = await ethers.getContractAt(
        "ThrustpadFairLaunch",
        iloAddress
      );

      const trx = await launch.emergencyTransferTokens(
        tokenAddress,
        ethers.parseEther("1000000")
      );

      console.log(trx);
    });
  });
});

//For testing: npx hardhat test test/fair_launch_factory_v2.test.js --network opencampus

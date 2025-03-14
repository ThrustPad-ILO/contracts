// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interface/types.sol";
import "./interfaces/sailfish/IFactory.sol";
import {IVault} from "./interfaces/sailfish/IVault.sol";
import "./libs/Token.sol";

import "hardhat/console.sol";

contract ThrustpadFairLaunch is Ownable, ReentrancyGuard {
    FairLaunchConfig public config;

    event TokenBought(
        address indexed buyer,
        address indexed token,
        uint256 amountInEdu
    );
    event TokenClaimed(
        address indexed buyer,
        address indexed token,
        uint256 amountInToken
    );
    event TeamClaimed(
        address indexed team,
        address indexed token,
        uint256 amountInToken
    );
    event Refund(
        address indexed buyer,
        address indexed token,
        uint256 amountInEdu
    );
    event LiquidityDeployed(
        address indexed pair,
        address indexed token,
        uint256 amountMinted
    );
    event LPTokensClaimed(
        address indexed owner,
        address indexed pair,
        uint256 amountLPTokens
    );

    uint256 public totalSold;

    uint256 public totalContributors;

    address public LPTokenAddress;

    mapping(address => uint256) public purchaseHistory;
    mapping(address => uint256) public claimed; //Token claim or refund

    address sailFishStablePoolFactory =
        0x1CcC7382d46313C24e1D13510B1C9445A792f4d4;
    address sailFishVault = 0xB97582DCB6F2866098cA210095a04dF3e11B76A6;

    constructor(FairLaunchConfig memory _config) Ownable(tx.origin) {
        config = _config;
    }

    function buyToken() public payable {
        require(
            block.timestamp >= config.startDate,
            "ThrustpadFairLaunch: sale has not started yet"
        );
        require(
            block.timestamp <= config.endDate,
            "ThrustpadFairLaunch: sale has ended"
        );
        require(
            msg.value >= config.minimumBuy,
            "ThrustpadFairLaunch: amount is less than minimum buy"
        );
        require(
            msg.value <= config.maximumBuy,
            "ThrustpadFairLaunch: amount is more than maximum buy"
        );
        require(
            totalSold + msg.value <= config.hardCap,
            "ThrustpadFairLaunch: hard cap reached"
        );

        totalSold += msg.value;
        totalContributors += 1;
        purchaseHistory[msg.sender] += msg.value;

        emit TokenBought(msg.sender, config.token, msg.value);
    }

    function claimTokens() public nonReentrant {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold >= config.softCap,
            "ThrustpadFairLaunch: soft cap not reached"
        );
        require(
            claimed[msg.sender] == 0,
            "ThrustpadFairLaunch: tokens already claimed"
        );

        uint256 pricePerToken = config.amountForSale / config.hardCap;
        uint256 purchase = purchaseHistory[msg.sender] * pricePerToken;

        claimed[msg.sender] = purchase;

        IERC20(config.token).transfer(msg.sender, purchase);

        emit TokenClaimed(msg.sender, config.token, purchase);
    }

    function claimRefund() public nonReentrant {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold < config.softCap,
            "ThrustpadFairLaunch: soft cap reached"
        );
        require(
            claimed[msg.sender] == 0,
            "ThrustpadFairLaunch: tokens already claimed"
        );

        uint256 refund = purchaseHistory[msg.sender];

        claimed[msg.sender] = refund;

        payable(msg.sender).transfer(refund);

        emit Refund(msg.sender, config.token, refund);
    }

    function withdrawTeamTokens() public onlyOwner {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold >= config.softCap,
            "ThrustpadFairLaunch: soft cap not reached"
        );

        uint256 teamTokens = (config.percentageForTeam * totalSold) / 100;

        payable(owner()).transfer(teamTokens);

        emit TeamClaimed(owner(), config.token, teamTokens);
    }

    function deployLiquidity() public {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold >= config.softCap,
            "ThrustpadFairLaunch: soft cap not reached"
        );

        address pair = IFactory(sailFishStablePoolFactory).deploy(
            NATIVE_TOKEN,
            toToken(IERC20(config.token))
        );

        LPTokenAddress = pair;

        IERC20(config.token).approve(sailFishVault, type(uint256).max);

        uint256 liquidity = (config.percentageForLiquidity * totalSold) / 100;
        uint256 tokenAmount = liquidity * config.listingRate;

        IVault(sailFishVault).addLiquidity{value: liquidity}(
            config.token,
            address(0),
            false,
            tokenAmount,
            liquidity,
            0,
            0,
            address(this),
            type(uint256).max
        );

        //Burn remaining tokens
        uint256 remainingToken = IERC20(config.token).balanceOf(address(this));

        IERC20(config.token).transfer(address(0), remainingToken);

        uint256 lpTokenBalance = IERC20(pair).balanceOf(address(this));

        emit LiquidityDeployed(pair, config.token, lpTokenBalance);
    }

    function claimLPTokens() public onlyOwner {
        require(
            block.timestamp >= config.endDate + 30 days,
            "ThrustpadFairLaunch: Lock period not over yet"
        );
        require(
            LPTokenAddress != address(0),
            "ThrustpadFairLaunch: LP tokens not deployed yet"
        );

        uint256 lpTokenBalance = IERC20(LPTokenAddress).balanceOf(
            address(this)
        );

        IERC20(LPTokenAddress).transfer(msg.sender, lpTokenBalance);

        emit LPTokensClaimed(msg.sender, LPTokenAddress, lpTokenBalance);
    }

    receive() external payable {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct stakeOption {
    address token;
    uint256 startDate;
    uint256 endDate;
    uint256 hardCap;
    uint256 minTokenStake;
    uint256 apyEdu;
    uint256 apyToken;
    uint256 rewardPoolToken;
    uint256 rewardPoolEDU;
    uint256 tokenToEDURate;
}

struct LaunchType {
    bool mintable;
    bool pausable;
    bool burnable;
}

struct FairLaunchConfig {
    address token;
    uint256 softCap;
    uint256 hardCap;
    uint256 amountForSale;
    uint256 listingRate;
    uint256 minimumBuy;
    uint256 maximumBuy;
    uint256 percentageForLiquidity;
    uint256 percentageForTeam;
    uint256 startDate;
    uint256 endDate;
}

interface ThrustpadType {}

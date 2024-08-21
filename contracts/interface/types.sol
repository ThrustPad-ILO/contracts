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

interface ThrustpadType {}

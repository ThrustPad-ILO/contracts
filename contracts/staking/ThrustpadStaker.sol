// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "hardhat/console.sol";

contract Staking is Ownable, Pausable, ReentrancyGuard {
    IERC20 public token;

    enum Period {
        THIRTY_DAYS,
        FORTY_FIVE_DAYS,
        SIXTY_DAYS,
        NINETY_DAYS
    }

    enum StakePercentage {
        TEN,
        TWENTY,
        THIRTY,
        FORTY,
        FIFTY,
        SIXTY,
        SEVENTY,
        EIGHTY,
        NINETY,
        HUNDRED
    }

    struct Stake {
        uint256 amount;
        uint256 start;
        uint256 end;
        uint256 rewardEDU;
        uint256 rewardToken;
        uint256 period;
        uint256 claimedEDU;
        uint256 claimedToken;
        uint256 priceEDU;
        uint256 priceToken;
        address owner;
        bool unstaked;
        uint256 eduAPY;
        uint256 tokenAPY;
    }

    struct ClaimableReward {
        uint256 edu;
        uint256 token;
        uint256 index;
    }

    Stake[] public stakes;

    mapping(address => uint256[]) public userStakes;

    mapping(address => bool) public claimed;

    //metrics
    uint256 public totalStaked;
    uint256 public totalRewardsEDU;
    uint256 public totalRewardsToken;
    uint256 public totalStakes;

    uint256 public eduAPY;
    uint256 public tokenAPY;
    uint256 public minTokenStake;

    uint256 startDate;
    uint256 endDate;
    uint256 hardCap;
    uint256 rewardPool;
    uint256 tokenToEDURate;

    event Staked(
        address indexed user,
        uint256 amount,
        uint256 period,
        uint256 rewardEDU,
        uint256 rewardToken
    );

    event Unstaked(
        address indexed user,
        uint256 amount,
        uint256 rewardEDU,
        uint256 rewardToken
    );
    event ClaimedRewards(address indexed user, uint256 edu, uint256 token);
    event ClaimedTGE(address indexed user, uint256 amount);
    event MinimumStakeUpdated(uint256 amount);
    event APYUpdated(uint256 eduAPY, uint256 tokenAPY);
    event PricesUpdated(uint256 ethPrice, uint256 TokenPrice);

    constructor(
        address _token,
        uint256 startdate,
        uint256 enddate,
        uint256 hardcap,
        uint256 minimum,
        uint256 apyEdu,
        uint256 apyToken,
        uint256 deposit,
        uint256 rate
    ) Ownable(tx.origin) {
        //set params
        eduAPY = apyEdu;
        tokenAPY = apyToken;
        minTokenStake = minimum;
        rewardPool = deposit;
        hardCap = hardcap;
        startDate = startdate;
        endDate = enddate;

        token = IERC20(_token);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function directStake(
        uint256 amount,
        Period period
    ) external payable nonReentrant whenNotPaused returns (uint256 stakeIndex) {
        require(block.timestamp >= startDate, "Staking not started");
        require(block.timestamp <= endDate, "Staking ended");
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        stakeIndex = _stake(amount, period);

        return stakeIndex;
    }

    function getStakes(address addr) external view returns (Stake[] memory) {
        uint256[] memory userStakeIndexes = userStakes[addr];
        Stake[] memory userStakesArr = new Stake[](userStakeIndexes.length);

        for (uint256 i = 0; i < userStakeIndexes.length; i++) {
            userStakesArr[i] = stakes[userStakeIndexes[i]];
        }

        return userStakesArr;
    }

    function getClaimableRewards(
        address addr
    ) public view returns (ClaimableReward[] memory claimableRewards) {
        uint256[] memory userStakeIndexes = userStakes[addr];

        claimableRewards = new ClaimableReward[](userStakeIndexes.length);

        for (uint256 i = 0; i < userStakeIndexes.length; i++) {
            if (stakes[userStakeIndexes[i]].unstaked) {
                continue;
            }

            Stake memory stake = stakes[userStakeIndexes[i]];

            claimableRewards[i] = _claimableRewards(stake, userStakeIndexes[i]);
        }
    }

    function claimAvailableRewards(
        uint256 stakeIndex
    ) public nonReentrant whenNotPaused {
        require(stakes[stakeIndex].owner == msg.sender, "Not owner");

        Stake storage stake = stakes[stakeIndex];

        require(!stake.unstaked, "Already unstaked");

        ClaimableReward memory claimableReward = _claimableRewards(
            stake,
            stakeIndex
        );

        require(
            claimableReward.edu > stake.claimedEDU ||
                claimableReward.token > stake.claimedToken,
            "No rewards to claim"
        );

        uint256 ethToClaim = claimableReward.edu;
        uint256 tokenToClaim = claimableReward.token;

        stake.claimedEDU += claimableReward.edu;
        stake.claimedToken += claimableReward.token;

        payable(msg.sender).transfer(ethToClaim);

        require(token.transfer(msg.sender, tokenToClaim), "Transfer failed");

        emit ClaimedRewards(msg.sender, ethToClaim, tokenToClaim);
    }

    function _claimableRewards(
        Stake memory stake,
        uint256 stakeIndex
    ) private view returns (ClaimableReward memory claimableReward) {
        uint256 mantissa = 1000;
        uint256 uptillNow = block.timestamp - stake.start;

        uint256 appliedEDUAPY = ((stake.eduAPY * mantissa * uptillNow) /
            365 days);
        uint256 appliedTokenAPY = ((stake.tokenAPY * mantissa * uptillNow) /
            365 days);

        uint256 eduReward = (((stake.amount * appliedEDUAPY) / 100) /
            mantissa) / tokenToEDURate;

        uint256 tokenReward = (((stake.amount * appliedTokenAPY) / 100) /
            mantissa);

        return
            ClaimableReward({
                edu: eduReward - stake.claimedEDU,
                token: tokenReward - stake.claimedToken,
                index: stakeIndex
            });
    }

    function unstake(uint256 stakeIndex) external nonReentrant whenNotPaused {
        Stake storage stake = stakes[stakeIndex];

        require(!stake.unstaked, "Already unstaked");
        require(stake.end < block.timestamp, "Stake not matured");
        require(stake.owner == msg.sender, "Not owner");

        stake.unstaked = true;

        require(token.transfer(msg.sender, stake.amount), "Transfer failed");

        emit Unstaked(
            msg.sender,
            stake.amount,
            stake.rewardEDU - stake.claimedEDU,
            stake.rewardDCASK - stake.claimedDCASK
        );
    }

    function _stake(
        uint256 stakeAmt,
        Period _period
    ) private returns (uint256 stakeIndex) {
        require(stakeAmt >= minTokenStake, "Minimum stake not met");

        uint256 period = _getStakingPeriod(_period);
        (uint256 ethRewardInUsd, uint256 tokenReward) = calculateRewards(
            stakeAmt,
            period
        );

        stakeIndex = stakes.length;

        stakes.push(
            Stake({
                amount: stakeAmt,
                start: block.timestamp,
                end: block.timestamp + period,
                rewardEDU: ethRewardInUsd,
                rewardDCASK: tokenReward,
                period: period,
                claimedEDU: 0,
                claimedDCASK: 0,
                unstaked: false,
                owner: msg.sender,
                priceEDU: 0,
                priceToken: 0,
                eduAPY: eduAPY,
                tokenAPY: tokenAPY
            })
        );

        userStakes[msg.sender].push(stakeIndex);

        totalStaked += stakeAmt;
        totalRewardsEDU += ethRewardInUsd;
        totalRewardsToken += tokenReward;
        totalStakes += 1;

        emit Staked(msg.sender, stakeAmt, period, ethRewardInUsd, tokenReward);
    }

    function calculateRewards(
        uint256 stakeAmt,
        uint256 period
    ) public view returns (uint256 eduRewardInUsd, uint256 tokenReward) {
        uint256 mantissa = 1000;
        uint256 appliedEDUAPY = ((eduAPY * mantissa * period) / 365 days);
        uint256 appliedTokenAPY = ((tokenAPY * mantissa * period) / 365 days);

        tokenReward = (((stakeAmt * appliedTokenAPY) / 100) / mantissa);
        eduRewardInUsd =
            (((stakeAmt * appliedEDUAPY) / 100) / mantissa) /
            tokenToEDURate;
    }

    function _getStakingPeriod(
        Period period
    ) private pure returns (uint256 stakePeriod) {
        if (period == Period.THIRTY_DAYS) {
            return 30 days;
        } else if (period == Period.FORTY_FIVE_DAYS) {
            return 45 days;
        } else if (period == Period.SIXTY_DAYS) {
            return 60 days;
        } else if (period == Period.NINETY_DAYS) {
            return 90 days;
        }
    }

    function _getStakingPercentage(
        StakePercentage stakePercentage
    ) private pure returns (uint8 percentage) {
        if (stakePercentage == StakePercentage.TEN) {
            return 10;
        } else if (stakePercentage == StakePercentage.TWENTY) {
            return 20;
        } else if (stakePercentage == StakePercentage.THIRTY) {
            return 30;
        } else if (stakePercentage == StakePercentage.FORTY) {
            return 40;
        } else if (stakePercentage == StakePercentage.FIFTY) {
            return 50;
        } else if (stakePercentage == StakePercentage.SIXTY) {
            return 60;
        } else if (stakePercentage == StakePercentage.SEVENTY) {
            return 70;
        } else if (stakePercentage == StakePercentage.EIGHTY) {
            return 80;
        } else if (stakePercentage == StakePercentage.NINETY) {
            return 90;
        } else if (stakePercentage == StakePercentage.HUNDRED) {
            return 100;
        }
    }

    function updateMinTokenStake(uint256 amount) public onlyOwner {
        minTokenStake = amount;

        emit MinimumStakeUpdated(amount);
    }

    function getLatestPrice(
        bytes[] calldata priceUpdateData
    ) public returns (uint256 ethPrice) {
        return _getPrice(priceUpdateData);
    }

    function _getPrice(
        bytes[] calldata priceUpdateData
    ) private returns (uint256 ethPrice) {
        return 4.5e17; //Defaults to USD 0.45
    }

    function getPriceEDU(
        bytes[] calldata priceUpdate
    ) public payable returns (uint256) {
        return _getPrice(priceUpdate);
    }

    function _calculateProportion(
        uint256 amount,
        uint8 stakePercentage
    ) private pure returns (uint256 stakeAmt, uint256 claimAmt) {
        stakeAmt = (amount * stakePercentage) / 100;
        claimAmt = amount - stakeAmt;
    }

    function updateAPY(
        uint256 _eduAPY,
        uint256 _tokenAPY
    ) external whenNotPaused onlyOwner {
        eduAPY = _eduAPY;
        tokenAPY = _tokenAPY;

        emit APYUpdated(_eduAPY, _tokenAPY);
    }

    // withdraw functions
    function withdrawEDU(address recipient, uint256 amount) public onlyOwner {
        payable(address(recipient)).transfer(amount);
    }

    function withdrawToken(address recipient, uint256 amount) public onlyOwner {
        require(token.transfer(address(recipient), amount), "Transfer failed");
    }

    receive() external payable {}
}

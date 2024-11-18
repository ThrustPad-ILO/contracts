// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interface/types.sol";
import "hardhat/console.sol";

contract ThrustpadStaker is Ownable, Pausable, ReentrancyGuard {
    IERC20 public token;

    enum Period {
        THIRTY_DAYS,
        FORTY_FIVE_DAYS,
        SIXTY_DAYS,
        NINETY_DAYS
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
        uint256 lastclaimtime;
    }

    struct ClaimableReward {
        uint256 edu;
        uint256 token;
        uint256 index;
    }

    mapping(address => uint256[]) public userStakes;

    Stake[] internal stakes;

    // //metrics
    uint256 public totalStaked;
    uint256 public totalRewardsEDU;
    uint256 public totalRewardsToken;
    uint256 public totalStakes;

    stakeOption public option;

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
    event MinimumStakeUpdated(uint256 amount);
    event APYUpdated(uint256 eduAPY, uint256 tokenAPY);
    event PricesUpdated(uint256 ethPrice, uint256 TokenPrice);

    constructor(stakeOption memory _option) payable Ownable(tx.origin) {
        //set params
        option = _option;
        token = IERC20(_option.token);
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
        require(block.timestamp >= option.startDate, "Staking not started");
        require(block.timestamp <= option.endDate, "Staking ended");
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
        require(option.startDate < block.timestamp, "Staking not started");

        Stake storage stake = stakes[stakeIndex];

        require(!stake.unstaked, "Already unstaked");

        ClaimableReward memory claimableReward = _claimableRewards(
            stake,
            stakeIndex
        );

        require(
            claimableReward.edu > 0 || claimableReward.token > 0,
            "No rewards to claim"
        );

        uint256 ethToClaim = claimableReward.edu;
        uint256 tokenToClaim = claimableReward.token;

        stake.claimedEDU += claimableReward.edu;
        stake.claimedToken += claimableReward.token;
        stake.lastclaimtime = block.timestamp;

        payable(msg.sender).transfer(ethToClaim);

        require(token.transfer(msg.sender, tokenToClaim), "Transfer failed");

        emit ClaimedRewards(msg.sender, ethToClaim, tokenToClaim);
    }

    function _claimableRewards(
        Stake memory stake,
        uint256 stakeIndex
    ) private view returns (ClaimableReward memory claimableReward) {
        uint256 mantissa = 1000;
        uint256 uptillNow = block.timestamp - stake.lastclaimtime;

        uint256 appliedEDUAPY = ((stake.eduAPY * mantissa * uptillNow) /
            365 days);
        uint256 appliedTokenAPY = ((stake.tokenAPY * mantissa * uptillNow) /
            365 days);

        uint256 eduReward = (((stake.amount * appliedEDUAPY) / 100) /
            mantissa) / option.tokenToEDURate;

        uint256 tokenReward = (((stake.amount * appliedTokenAPY) / 100) /
            mantissa);

        return
            ClaimableReward({
                edu: eduReward,
                token: tokenReward,
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
            stake.rewardToken - stake.claimedToken
        );
    }

    function _stake(
        uint256 stakeAmt,
        Period _period
    ) private returns (uint256 stakeIndex) {
        require(stakeAmt >= option.minTokenStake, "Minimum stake not met");

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
                rewardToken: tokenReward,
                period: period,
                claimedEDU: 0,
                claimedToken: 0,
                unstaked: false,
                owner: msg.sender,
                priceEDU: 0,
                priceToken: 0,
                eduAPY: option.apyEdu,
                tokenAPY: option.apyToken,
                lastclaimtime: block.timestamp
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
        uint256 appliedEDUAPY = ((option.apyEdu * mantissa * period) /
            365 days);

        uint256 appliedTokenAPY = ((option.apyToken * mantissa * period) /
            365 days);

        tokenReward = (((stakeAmt * appliedTokenAPY) / 100) / mantissa);
        eduRewardInUsd =
            (((stakeAmt * appliedEDUAPY) / 100) / mantissa) /
            option.tokenToEDURate;
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

    function updateMinTokenStake(uint256 amount) public onlyOwner {
        option.minTokenStake = amount;

        emit MinimumStakeUpdated(amount);
    }

    function _calculateProportion(
        uint256 amount,
        uint8 stakePercentage
    ) private pure returns (uint256 stakeAmt, uint256 claimAmt) {
        stakeAmt = (amount * stakePercentage) / 100;
        claimAmt = amount - stakeAmt;
    }

    // function updateAPY(
    //     uint256 _eduAPY,
    //     uint256 _tokenAPY
    // ) external whenNotPaused onlyOwner {
    //     option.apyEdu = _eduAPY;
    //     option.apyToken = _tokenAPY;

    //     emit APYUpdated(_eduAPY, _tokenAPY);
    // }

    // withdraw functions
    function withdrawEDU200(
        address recipient,
        uint256 amount
    ) public onlyOwner {
        payable(address(recipient)).transfer(amount);
    }

    function withdrawToken200(
        address recipient,
        uint256 amount
    ) public onlyOwner {
        require(token.transfer(address(recipient), amount), "Transfer failed");
    }

    receive() external payable {}
}

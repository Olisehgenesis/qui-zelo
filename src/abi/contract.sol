// Deployed with the Atlas IDE
// https://app.atlaszk.com/
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Quizelo
 * @dev Simple quiz platform - 3 quizzes per day, 20min cooldown, reduced rewards after first win
 */
contract Quizelo is Ownable, ReentrancyGuard {
    // ==================== CONSTRUCTOR ====================

    constructor() Ownable(msg.sender) {}

    // ==================== CONSTANTS ====================

    uint256 public constant QUIZ_FEE = 0.1 ether; // 0.1 CELO
    uint256 public constant QUIZ_DURATION = 10 minutes; // 5 minutes to claim
    uint256 public constant COOLDOWN_PERIOD = 20 minutes; // 20 minutes between quizzes
    uint256 public constant MAX_DAILY_QUIZZES = 3; // 3 quizzes per day
    uint256 public constant MIN_CONTRACT_BALANCE = 1 ether; // Min balance to operate

    // ==================== STATE VARIABLES ====================

    mapping(address => uint256) public userNonces;
    mapping(address => uint256) public lastQuizTime;
    mapping(address => uint256) public dailyQuizCount;
    mapping(address => uint256) public lastResetDay;
    mapping(address => bool) public hasWonToday; // Track if user won today

    // Active quiz sessions
    mapping(bytes32 => QuizSession) public activeQuizzes;
    bytes32[] public currentQuizTakers; // List of active quiz takers

    struct QuizSession {
        address user;
        uint256 startTime;
        uint256 expiryTime;
        bool active;
        bool claimed;
    }

    // ==================== EVENTS ====================

    event QuizStarted(bytes32 indexed sessionId, address indexed user, uint256 startTime);
    event QuizCompleted(bytes32 indexed sessionId, address indexed user, uint256 score, uint256 reward);
    event ContractToppedUp(uint256 amount);

    // ==================== MODIFIERS ====================

    modifier canTakeQuiz() {
        _resetDailyCountIfNeeded(msg.sender);
        require(block.timestamp >= lastQuizTime[msg.sender] + COOLDOWN_PERIOD, "Wait 20 minutes between quizzes");
        require(dailyQuizCount[msg.sender] < MAX_DAILY_QUIZZES, "Max 3 quizzes per day");
        require(address(this).balance >= MIN_CONTRACT_BALANCE, "Contract balance too low");
        _;
    }

    modifier hasActiveQuiz(bytes32 sessionId) {
        require(activeQuizzes[sessionId].active, "No active quiz");
        require(activeQuizzes[sessionId].user == msg.sender, "Not your quiz");
        _;
    }

    // ==================== MAIN FUNCTIONS ====================

    /**
     * @dev Start a quiz
     */
    function startQuiz() external payable nonReentrant canTakeQuiz {
        require(msg.value == QUIZ_FEE, "Must pay 0.1 CELO");

        uint256 currentNonce = userNonces[msg.sender];
        bytes32 sessionId = keccak256(abi.encodePacked(msg.sender, block.timestamp, currentNonce));

        // Create quiz session
        activeQuizzes[sessionId] = QuizSession({
            user: msg.sender,
            startTime: block.timestamp,
            expiryTime: block.timestamp + QUIZ_DURATION,
            active: true,
            claimed: false
        });

        // Add to active quiz takers list
        currentQuizTakers.push(sessionId);

        // Update user data
        userNonces[msg.sender]++;
        lastQuizTime[msg.sender] = block.timestamp;
        dailyQuizCount[msg.sender]++;

        emit QuizStarted(sessionId, msg.sender, block.timestamp);
    }

    /**
     * @dev Claim reward (user submits their own score)
     */
    function claimReward(bytes32 sessionId, uint256 score) external nonReentrant hasActiveQuiz(sessionId) {
        QuizSession storage session = activeQuizzes[sessionId];

        require(block.timestamp <= session.expiryTime, "Quiz expired");
        require(!session.claimed, "Already claimed");
        require(score <= 100, "Invalid score");

        session.claimed = true;
        session.active = false;

        // Remove from active list
        _removeFromActiveList(sessionId);

        uint256 reward = 0;

        if (score >= 60) {
            // Passed - calculate reward
            reward = _calculateReward(msg.sender, score);

            if (reward > 0 && address(this).balance >= reward) {
                hasWonToday[msg.sender] = true;

                (bool success,) = payable(msg.sender).call{value: reward}("");
                require(success, "Reward transfer failed");
            } else {
                reward = 0; // No reward if insufficient balance
            }
        }
        // Below 60% = money taken (no refund)

        emit QuizCompleted(sessionId, msg.sender, score, reward);
    }

    /**
     * @dev Clean up expired quiz
     */
    function cleanupExpiredQuiz(bytes32 sessionId) external {
        QuizSession storage session = activeQuizzes[sessionId];

        require(session.active, "Quiz not active");
        require(block.timestamp > session.expiryTime, "Quiz not expired yet");

        session.active = false;

        // Remove from active list
        _removeFromActiveList(sessionId);

        // Money is forfeited for expired quizzes
    }

    // ==================== INTERNAL FUNCTIONS ====================

    /**
     * @dev Calculate reward based on user status and score - NEW IMPROVED VERSION
     * Range: 0.1 - 0.4 CELO with weighted distribution favoring smaller amounts
     */
    function _calculateReward(address user, uint256 score) internal view returns (uint256) {
        if (score < 60) return 0;

        // Check if user already won today
        if (hasWonToday[user]) {
            // For subsequent wins, give smaller random reward (0.1 - 0.2 CELO)
            uint256 randomSeed = uint256(
                keccak256(abi.encodePacked(block.timestamp, block.difficulty, user, score, userNonces[user]))
            ) % 100; // 0-99

            // 70% chance for 0.1, 20% for 0.15, 10% for 0.2
            uint256 subsequentReward;
            if (randomSeed < 70) {
                subsequentReward = 0.1 ether;
            } else if (randomSeed < 90) {
                subsequentReward = 0.15 ether;
            } else {
                subsequentReward = 0.2 ether;
            }

            // Ensure contract has enough balance
            return address(this).balance >= subsequentReward ? subsequentReward : 0;
        }

        // First win of the day - weighted random between 0.1-0.4 CELO
        // Higher probability for smaller amounts
        uint256 randomSeed = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.difficulty, user, score, userNonces[user], gasleft()))
        ) % 100; // 0-99

        uint256 baseReward;

        // Weighted distribution:
        // 40% chance: 0.1 CELO
        // 25% chance: 0.15 CELO
        // 15% chance: 0.2 CELO
        // 10% chance: 0.25 CELO
        // 5% chance: 0.3 CELO
        // 3% chance: 0.35 CELO
        // 2% chance: 0.4 CELO

        if (randomSeed < 40) {
            baseReward = 0.1 ether; // 40% chance
        } else if (randomSeed < 65) {
            baseReward = 0.15 ether; // 25% chance
        } else if (randomSeed < 80) {
            baseReward = 0.2 ether; // 15% chance
        } else if (randomSeed < 90) {
            baseReward = 0.25 ether; // 10% chance
        } else if (randomSeed < 95) {
            baseReward = 0.3 ether; // 5% chance
        } else if (randomSeed < 98) {
            baseReward = 0.35 ether; // 3% chance
        } else {
            baseReward = 0.4 ether; // 2% chance
        }

        // Score bonus: Higher scores get slight boost
        uint256 scoreBonus = 0;
        if (score >= 90) {
            scoreBonus = 0.02 ether; // +0.02 for 90%+
        } else if (score >= 80) {
            scoreBonus = 0.01 ether; // +0.01 for 80%+
        }

        uint256 finalReward = baseReward + scoreBonus;

        // Cap at 0.4 CELO maximum
        if (finalReward > 0.4 ether) {
            finalReward = 0.4 ether;
        }

        // Ensure contract has enough balance
        if (address(this).balance < finalReward) {
            // If contract can't afford full reward, give proportional amount
            if (address(this).balance >= 0.1 ether) {
                return 0.1 ether; // Minimum fallback
            } else {
                return 0; // No reward if balance too low
            }
        }

        return finalReward;
    }

    /**
     * @dev Reset daily count if new day
     */
    function _resetDailyCountIfNeeded(address user) internal {
        uint256 currentDay = block.timestamp / 1 days;

        if (lastResetDay[user] < currentDay) {
            dailyQuizCount[user] = 0;
            hasWonToday[user] = false;
            lastResetDay[user] = currentDay;
        }
    }

    /**
     * @dev Remove session from active list
     */
    function _removeFromActiveList(bytes32 sessionId) internal {
        for (uint256 i = 0; i < currentQuizTakers.length; i++) {
            if (currentQuizTakers[i] == sessionId) {
                currentQuizTakers[i] = currentQuizTakers[currentQuizTakers.length - 1];
                currentQuizTakers.pop();
                break;
            }
        }
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @dev Top up contract for rewards
     */
    function topUpContract() external payable onlyOwner {
        emit ContractToppedUp(msg.value);
    }

    /**
     * @dev Emergency drain
     */
    function adminEmergencyDrain() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success,) = payable(owner()).call{value: balance}("");
        require(success, "Emergency drain failed");
    }

    /**
     * @dev Clean up all expired quizzes (admin function)
     */
    function adminCleanupExpired() external onlyOwner {
        uint256 currentTime = block.timestamp;

        for (uint256 i = currentQuizTakers.length; i > 0; i--) {
            bytes32 sessionId = currentQuizTakers[i - 1];
            QuizSession storage session = activeQuizzes[sessionId];

            if (currentTime > session.expiryTime) {
                session.active = false;
                // Remove from array
                currentQuizTakers[i - 1] = currentQuizTakers[currentQuizTakers.length - 1];
                currentQuizTakers.pop();
            }
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Get user quiz info
     */
    function getUserInfo(address user)
        external
        view
        returns (uint256 dailyCount, uint256 lastQuiz, uint256 nextQuizTime, bool wonToday, bool canQuiz)
    {
        // Check if we need to reset (view function simulation)
        uint256 currentDay = block.timestamp / 1 days;
        uint256 effectiveDailyCount = dailyQuizCount[user];
        bool effectiveWonToday = hasWonToday[user];

        if (lastResetDay[user] < currentDay) {
            effectiveDailyCount = 0;
            effectiveWonToday = false;
        }

        uint256 cooldownEnd = lastQuizTime[user] + COOLDOWN_PERIOD;
        bool canTakeNewQuiz = block.timestamp >= cooldownEnd && effectiveDailyCount < MAX_DAILY_QUIZZES
            && address(this).balance >= MIN_CONTRACT_BALANCE;

        return (effectiveDailyCount, lastQuizTime[user], cooldownEnd, effectiveWonToday, canTakeNewQuiz);
    }

    /**
     * @dev Get current active quiz takers
     */
    function getCurrentQuizTakers() external view returns (bytes32[] memory) {
        return currentQuizTakers;
    }

    /**
     * @dev Get quiz session details
     */
    function getQuizSession(bytes32 sessionId)
        external
        view
        returns (address user, uint256 startTime, uint256 expiryTime, bool active, bool claimed, uint256 timeRemaining)
    {
        QuizSession memory session = activeQuizzes[sessionId];
        uint256 remaining = 0;

        if (session.active && block.timestamp < session.expiryTime) {
            remaining = session.expiryTime - block.timestamp;
        }

        return (session.user, session.startTime, session.expiryTime, session.active, session.claimed, remaining);
    }

    /**
     * @dev Check if contract can operate
     */
    function canOperateQuizzes() external view returns (bool) {
        return address(this).balance >= MIN_CONTRACT_BALANCE;
    }

    /**
     * @dev Get contract stats
     */
    function getContractStats()
        external
        view
        returns (uint256 balance, uint256 activeQuizCount, uint256 minBalance, bool operational)
    {
        return (
            address(this).balance,
            currentQuizTakers.length,
            MIN_CONTRACT_BALANCE,
            address(this).balance >= MIN_CONTRACT_BALANCE
        );
    }

    /**
     * @dev Calculate potential reward for user and score
     */
    function calculatePotentialReward(address user, uint256 score) external view returns (uint256) {
        if (score < 60) return 0;
        return _calculateReward(user, score);
    }

    // ==================== RECEIVE FUNCTION ====================

    receive() external payable {
        emit ContractToppedUp(msg.value);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
// Removed: import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Quizelo
 * @dev A decentralized quiz platform on Celo blockchain
 * Users pay CELO to attempt quizzes and earn NFT rewards for passing
 * Powered by Celo - Learn, Earn, and Build on Celo
 */
contract Quizelo is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // Removed: using Counters for Counters.Counter;
    using Strings for uint256;
    
    // ==================== STATE VARIABLES ====================
    
    // Replaced Counters with simple uint256 variables
    uint256 private _tokenIdCounter;
    uint256 private _quizIdCounter;
    
    // Configurable values
    uint256 public quizFee = 1 ether; // 1 CELO in wei (configurable)
    uint256 public sessionDuration = 10 minutes; // Configurable
    uint256 public passingScore = 60; // 60% to pass (configurable)
    uint256 public confiscationThreshold = 60; // Below 60% = money taken
    
    // Treasury and reward distribution (configurable)
    uint256 public treasuryBalance;
    uint256 public rewardPool;
    uint256 public treasuryPercentage = 30; // 30% to treasury
    uint256 public rewardPercentage = 70; // 70% to reward pool
    
    // NFT metadata base URI
    string public baseMetadataURI = "https://quizelo.public/nft/metadata/";
    string public baseImageURI = "https://quizelo.public/images/";
    
    // ==================== STRUCTS ====================
    
    struct QuizSession {
        address user;
        string topicId;
        string questionsHash; // IPFS hash of questions
        uint256 startTime;
        uint256 expiryTime;
        bool completed;
        bool passed;
        uint256 score;
        bool processed; // Whether rewards/penalties have been processed
    }
    
    struct QuizStats {
        uint256 totalAttempts;
        uint256 totalPassed;
        uint256 totalFailed;
        uint256 totalConfiscated; // Below threshold
        uint256 totalRevenue;
        uint256 totalRewardsDistributed;
    }
    
    struct UserStats {
        uint256 totalQuizzes;
        uint256 quizzesPassed;
        uint256 quizzesFailed;
        uint256 totalEarned;
        uint256 totalLost;
        uint256 nftsOwned;
        uint256 bestScore;
        string[] completedTopics;
    }
    
    struct Topic {
        string id;
        string name;
        string description;
        string emoji;
        bool active;
        uint256 attempts;
        uint256 passRate; // in basis points (1% = 100)
        uint256 averageScore;
    }
    
    struct RewardTier {
        uint256 minScore;
        uint256 rewardMultiplier; // in basis points (100% = 10000)
        string tierName;
    }
    
    // ==================== MAPPINGS ====================
    
    mapping(bytes32 => QuizSession) public quizSessions;
    mapping(address => UserStats) public userStats;
    mapping(address => bytes32[]) public userQuizHistory;
    mapping(string => Topic) public topics;
    mapping(address => bool) public authorizedOracles;
    mapping(uint256 => RewardTier) public rewardTiers;
    
    string[] public topicIds;
    QuizStats public globalStats;
    uint256 public rewardTierCount;
    
    // ==================== EVENTS ====================
    
    event QuizStarted(
        bytes32 indexed sessionId,
        address indexed user,
        string topicId,
        uint256 startTime,
        uint256 expiryTime,
        uint256 feePaid
    );
    
    event QuizCompleted(
        bytes32 indexed sessionId,
        address indexed user,
        string topicId,
        bool passed,
        uint256 score,
        uint256 reward,
        string result
    );
    
    event QuizExpired(
        bytes32 indexed sessionId,
        address indexed user,
        uint256 expiredAt
    );
    
    event MoneyConfiscated(
        bytes32 indexed sessionId,
        address indexed user,
        uint256 score,
        uint256 amount
    );
    
    event NFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        string topicId,
        uint256 score,
        string tier
    );
    
    event RewardClaimed(
        address indexed user,
        uint256 amount,
        string tier
    );
    
    event ConfigurationUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue
    );
    
    event TopicAdded(
        string indexed topicId,
        string name,
        string description,
        string emoji
    );
    
    event OracleAuthorized(address indexed oracle, bool authorized);
    
    // ==================== CONSTRUCTOR ====================
    
    constructor() ERC721("Quizelo Achievement NFT", "QUIZ") {
        // Initialize counters (starting from 0)
        _tokenIdCounter = 0;
        _quizIdCounter = 0;
        
        // Initialize reward tiers
        _initializeRewardTiers();
        
        // Initialize Celo-themed topics with updated list
        _addTopic("celo-basics", "Celo Basics", "Learn about Celo blockchain fundamentals", unicode"🌱");
        _addTopic("mobile-defi", "Mobile DeFi", "Mobile-first decentralized finance on Celo", unicode"📱");
        _addTopic("stable-coins", "Stable Coins", "cUSD, cEUR and Celo stablecoins", unicode"💰");
        _addTopic("regenerative-finance", "ReFi", "Regenerative Finance and climate impact", unicode"🌍");
        _addTopic("public-goods", "Public Goods", "Funding and supporting public goods on Celo", unicode"🏛️");
        _addTopic("celo-governance", "Governance", "Celo governance and community participation", unicode"⚖️");
    }
    
    // ==================== INITIALIZATION ====================
    
    function _initializeRewardTiers() internal {
        // Tier 1: 60-69% - Get money back (100%)
        rewardTiers[0] = RewardTier(60, 10000, "Bronze");
        
        // Tier 2: 70-79% - 120% return
        rewardTiers[1] = RewardTier(70, 12000, "Silver");
        
        // Tier 3: 80-89% - 150% return
        rewardTiers[2] = RewardTier(80, 15000, "Gold");
        
        // Tier 4: 90-100% - 200% return
        rewardTiers[3] = RewardTier(90, 20000, "Platinum");
        
        rewardTierCount = 4;
    }
    
    // ==================== MODIFIERS ====================
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender] || msg.sender == owner(), "Not authorized oracle");
        _;
    }
    
    modifier validTopic(string memory topicId) {
        require(topics[topicId].active, "Invalid or inactive topic");
        _;
    }
    
    modifier sessionExists(bytes32 sessionId) {
        require(quizSessions[sessionId].user != address(0), "Session does not exist");
        _;
    }
    
    // ==================== MAIN FUNCTIONS ====================
    
    /**
     * @dev Start a new quiz session
     * @param topicId The topic to quiz on
     * @param questionsHash IPFS hash of the generated questions
     */
    function startQuiz(
        string memory topicId, 
        string memory questionsHash
    ) external payable nonReentrant whenNotPaused validTopic(topicId) {
        require(msg.value == quizFee, "Incorrect quiz fee");
        require(bytes(questionsHash).length > 0, "Questions hash required");
        
        // Generate unique session ID using current counter value
        bytes32 sessionId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _quizIdCounter, // Use current value
                topicId,
                questionsHash
            )
        );
        
        uint256 startTime = block.timestamp;
        uint256 expiryTime = startTime + sessionDuration;
        
        // Create quiz session
        quizSessions[sessionId] = QuizSession({
            user: msg.sender,
            topicId: topicId,
            questionsHash: questionsHash,
            startTime: startTime,
            expiryTime: expiryTime,
            completed: false,
            passed: false,
            score: 0,
            processed: false
        });
        
        // Update user history
        userQuizHistory[msg.sender].push(sessionId);
        
        // Update stats
        userStats[msg.sender].totalQuizzes++;
        topics[topicId].attempts++;
        globalStats.totalAttempts++;
        globalStats.totalRevenue += msg.value;
        
        // Distribute payment
        uint256 treasuryAmount = (msg.value * treasuryPercentage) / 100;
        uint256 rewardAmount = msg.value - treasuryAmount;
        
        treasuryBalance += treasuryAmount;
        rewardPool += rewardAmount;
        
        // Increment counter after use
        ++_quizIdCounter;
        
        emit QuizStarted(sessionId, msg.sender, topicId, startTime, expiryTime, msg.value);
    }
    
    /**
     * @dev Submit quiz results (called by authorized oracle)
     * @param sessionId The quiz session ID
     * @param score The user's score (0-100)
     */
    function submitQuizResult(
        bytes32 sessionId,
        uint256 score
    ) external sessionExists(sessionId) onlyAuthorizedOracle nonReentrant {
        QuizSession storage session = quizSessions[sessionId];
        
        require(!session.completed, "Quiz already completed");
        require(block.timestamp <= session.expiryTime, "Quiz session expired");
        require(score <= 100, "Invalid score");
        require(!session.processed, "Session already processed");
        
        session.completed = true;
        session.score = score;
        session.passed = score >= passingScore;
        session.processed = true;
        
        address user = session.user;
        string memory result;
        uint256 reward = 0;
        
        // Update user stats
        if (score < confiscationThreshold) {
            // Money confiscated - below 60%
            userStats[user].quizzesFailed++;
            userStats[user].totalLost += quizFee;
            globalStats.totalFailed++;
            globalStats.totalConfiscated += quizFee;
            result = "Failed - Money Confiscated";
            
            emit MoneyConfiscated(sessionId, user, score, quizFee);
            
        } else if (session.passed) {
            // Passed - calculate reward and mint NFT
            userStats[user].quizzesPassed++;
            globalStats.totalPassed++;
            
            string memory tier;
            (reward, tier) = _calculateReward(score);
            
            if (reward > 0) {
                require(rewardPool >= reward, "Insufficient reward pool");
                userStats[user].totalEarned += reward;
                globalStats.totalRewardsDistributed += reward;
                rewardPool -= reward;
                
                // Transfer reward
                (bool success, ) = payable(user).call{value: reward}("");
                require(success, "Reward transfer failed");
                
                result = string(abi.encodePacked("Passed - ", tier, " Tier"));
                
                emit RewardClaimed(user, reward, tier);
            }
            
            // Mint achievement NFT
            _mintAchievementNFT(user, session.topicId, score);
            
            // Update user's best score
            if (score > userStats[user].bestScore) {
                userStats[user].bestScore = score;
            }
            
            // Add to completed topics if not already there
            _addCompletedTopic(user, session.topicId);
            
        } else {
            // Failed but above confiscation threshold - return money
            userStats[user].quizzesFailed++;
            globalStats.totalFailed++;
            
            reward = quizFee; // Return original fee
            rewardPool -= reward;
            
            (bool success, ) = payable(user).call{value: reward}("");
            require(success, "Refund transfer failed");
            
            result = "Failed - Money Returned";
        }
        
        // Update topic statistics
        _updateTopicStats(session.topicId, score);
        
        emit QuizCompleted(sessionId, user, session.topicId, session.passed, score, reward, result);
    }
    
    /**
     * @dev Handle expired quiz sessions
     * @param sessionId The expired session ID
     */
    function handleExpiredSession(bytes32 sessionId) external sessionExists(sessionId) {
        QuizSession storage session = quizSessions[sessionId];
        
        require(block.timestamp > session.expiryTime, "Session not expired yet");
        require(!session.completed, "Session already completed");
        require(!session.processed, "Already processed");
        
        session.completed = true;
        session.processed = true;
        
        // Treat as failure - money confiscated
        userStats[session.user].quizzesFailed++;
        userStats[session.user].totalLost += quizFee;
        globalStats.totalFailed++;
        globalStats.totalConfiscated += quizFee;
        
        // Update topic stats with 0 score
        _updateTopicStats(session.topicId, 0);
        
        emit QuizExpired(sessionId, session.user, block.timestamp);
    }
    
    // ==================== NFT FUNCTIONS ====================
    
    /**
     * @dev Mint achievement NFT for passed quiz
     */
    function _mintAchievementNFT(
        address user,
        string memory topicId,
        uint256 score
    ) internal {
        uint256 tokenId = _tokenIdCounter; // Use current value
        ++_tokenIdCounter; // Increment after use
        
        _safeMint(user, tokenId);
        
        // Generate metadata URI
        string memory metadataURI = _generateTokenURI(tokenId, topicId, score);
        _setTokenURI(tokenId, metadataURI);
        
        userStats[user].nftsOwned++;
        
        (, string memory tier) = _calculateReward(score);
        
        emit NFTMinted(user, tokenId, topicId, score, tier);
    }
    
    /**
     * @dev Generate token URI for NFT metadata
     */
    function _generateTokenURI(
        uint256 tokenId,
        string memory topicId,
        uint256 score
    ) internal view returns (string memory) {
        Topic memory topic = topics[topicId];
        (, string memory tier) = _calculateReward(score);
        
        // Create JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name": "Quizelo Achievement #',
            tokenId.toString(),
            '", "description": "Quizelo Achievement NFT for completing ',
            topic.name,
            ' quiz with score ',
            score.toString(),
            '%", "image": "',
            baseImageURI,
            topicId,
            '/',
            tier,
            '.png", "attributes": [',
            '{"trait_type": "Topic", "value": "',
            topic.name,
            '"}, {"trait_type": "Score", "value": ',
            score.toString(),
            '}, {"trait_type": "Tier", "value": "',
            tier,
            '"}, {"trait_type": "Emoji", "value": "',
            topic.emoji,
            '"}, {"trait_type": "Platform", "value": "Quizelo"}, {"trait_type": "Blockchain", "value": "Celo"}]}'
        ));
        
        return string(abi.encodePacked(
            'data:application/json;base64,',
            _base64Encode(bytes(json))
        ));
    }
    
    /**
     * @dev Simple base64 encoding for metadata
     */
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        // Simple base64 encoding - in production use a proper library
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        string memory result = new string(4 * ((data.length + 2) / 3));
        
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            
            for { let dataPtr := data } lt(dataPtr, add(data, mload(data))) {} {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore8(sub(resultPtr, 1), 0x3d) mstore8(sub(resultPtr, 2), 0x3d) }
            case 2 { mstore8(sub(resultPtr, 1), 0x3d) }
        }
        
        return result;
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    /**
     * @dev Calculate reward based on score
     */
    function _calculateReward(uint256 score) internal view returns (uint256 reward, string memory tier) {
        if (score < passingScore) return (0, "None");
        
        // Find the appropriate tier
        for (uint256 i = rewardTierCount; i > 0; i--) {
            RewardTier memory rewardTier = rewardTiers[i - 1];
            if (score >= rewardTier.minScore) {
                reward = (quizFee * rewardTier.rewardMultiplier) / 10000;
                tier = rewardTier.tierName;
                return (reward, tier);
            }
        }
        
        return (0, "None");
    }
    
    /**
     * @dev Update topic statistics
     */
    function _updateTopicStats(string memory topicId, uint256 score) internal {
        Topic storage topic = topics[topicId];
        
        if (topic.attempts > 0) {
            // Update pass rate
            uint256 totalPassed = 0;
            uint256 totalScore = 0;
            
            // This is simplified - in production, you'd track these more efficiently
            topic.passRate = (globalStats.totalPassed * 10000) / globalStats.totalAttempts;
            topic.averageScore = score; // Simplified - should be running average
        }
    }
    
    /**
     * @dev Add topic to user's completed topics
     */
    function _addCompletedTopic(address user, string memory topicId) internal {
        string[] storage completed = userStats[user].completedTopics;
        
        // Check if topic already completed
        for (uint256 i = 0; i < completed.length; i++) {
            if (keccak256(bytes(completed[i])) == keccak256(bytes(topicId))) {
                return; // Already completed
            }
        }
        
        completed.push(topicId);
    }
    
    /**
     * @dev Add new topic
     */
    function _addTopic(
        string memory id,
        string memory name,
        string memory description,
        string memory emoji
    ) internal {
        topics[id] = Topic({
            id: id,
            name: name,
            description: description,
            emoji: emoji,
            active: true,
            attempts: 0,
            passRate: 0,
            averageScore: 0
        });
        topicIds.push(id);
    }
    
    // ==================== CONFIGURATION FUNCTIONS ====================
    
    /**
     * @dev Update quiz fee
     */
    function setQuizFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = quizFee;
        quizFee = newFee;
        emit ConfigurationUpdated("quizFee", oldFee, newFee);
    }
    
    /**
     * @dev Update session duration
     */
    function setSessionDuration(uint256 newDuration) external onlyOwner {
        uint256 oldDuration = sessionDuration;
        sessionDuration = newDuration;
        emit ConfigurationUpdated("sessionDuration", oldDuration, newDuration);
    }
    
    /**
     * @dev Update passing score
     */
    function setPassingScore(uint256 newScore) external onlyOwner {
        require(newScore <= 100, "Score cannot exceed 100");
        uint256 oldScore = passingScore;
        passingScore = newScore;
        emit ConfigurationUpdated("passingScore", oldScore, newScore);
    }
    
    /**
     * @dev Update confiscation threshold
     */
    function setConfiscationThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold <= 100, "Threshold cannot exceed 100");
        uint256 oldThreshold = confiscationThreshold;
        confiscationThreshold = newThreshold;
        emit ConfigurationUpdated("confiscationThreshold", oldThreshold, newThreshold);
    }
    
    /**
     * @dev Update treasury percentage
     */
    function setTreasuryPercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= 100, "Percentage cannot exceed 100");
        uint256 oldPercentage = treasuryPercentage;
        treasuryPercentage = newPercentage;
        rewardPercentage = 100 - newPercentage;
        emit ConfigurationUpdated("treasuryPercentage", oldPercentage, newPercentage);
    }
    
    /**
     * @dev Update metadata URIs
     */
    function setMetadataURIs(
        string memory newBaseMetadataURI,
        string memory newBaseImageURI
    ) external onlyOwner {
        baseMetadataURI = newBaseMetadataURI;
        baseImageURI = newBaseImageURI;
    }
    
    /**
     * @dev Update reward tier
     */
    function updateRewardTier(
        uint256 tierId,
        uint256 minScore,
        uint256 rewardMultiplier,
        string memory tierName
    ) external onlyOwner {
        require(tierId < rewardTierCount, "Invalid tier ID");
        require(minScore <= 100, "Score cannot exceed 100");
        
        rewardTiers[tierId] = RewardTier(minScore, rewardMultiplier, tierName);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @dev Add new quiz topic
     */
    function addTopic(
        string memory id,
        string memory name,
        string memory description,
        string memory emoji
    ) external onlyOwner {
        require(bytes(topics[id].id).length == 0, "Topic already exists");
        _addTopic(id, name, description, emoji);
        emit TopicAdded(id, name, description, emoji);
    }
    
    /**
     * @dev Toggle topic active status
     */
    function toggleTopicStatus(string memory topicId) external onlyOwner {
        require(bytes(topics[topicId].id).length > 0, "Topic does not exist");
        topics[topicId].active = !topics[topicId].active;
    }
    
    /**
     * @dev Authorize oracle for quiz result submission
     */
    function authorizeOracle(address oracle, bool authorized) external onlyOwner {
        authorizedOracles[oracle] = authorized;
        emit OracleAuthorized(oracle, authorized);
    }
    
    /**
     * @dev Withdraw treasury funds
     */
    function withdrawTreasury(uint256 amount) external onlyOwner {
        require(amount <= treasuryBalance, "Insufficient treasury balance");
        treasuryBalance -= amount;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Treasury withdrawal failed");
    }
    
    /**
     * @dev Emergency fund injection to reward pool
     */
    function fundRewardPool() external payable onlyOwner {
        rewardPool += msg.value;
    }
    
    /**
     * @dev Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Get current token ID counter
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get current quiz ID counter
     */
    function getCurrentQuizId() external view returns (uint256) {
        return _quizIdCounter;
    }
    
    /**
     * @dev Get user's quiz history
     */
    function getUserQuizHistory(address user) external view returns (bytes32[] memory) {
        return userQuizHistory[user];
    }
    
    /**
     * @dev Get all topic IDs
     */
    function getAllTopics() external view returns (string[] memory) {
        return topicIds;
    }
    
    /**
     * @dev Get detailed topic information
     */
    function getTopicDetails(string memory topicId) external view returns (Topic memory) {
        return topics[topicId];
    }
    
    /**
     * @dev Get user's completed topics
     */
    function getUserCompletedTopics(address user) external view returns (string[] memory) {
        return userStats[user].completedTopics;
    }
    
    /**
     * @dev Get reward tier information
     */
    function getRewardTier(uint256 tierId) external view returns (RewardTier memory) {
        require(tierId < rewardTierCount, "Invalid tier ID");
        return rewardTiers[tierId];
    }
    
    /**
     * @dev Get all reward tiers
     */
    function getAllRewardTiers() external view returns (RewardTier[] memory) {
        RewardTier[] memory tiers = new RewardTier[](rewardTierCount);
        for (uint256 i = 0; i < rewardTierCount; i++) {
            tiers[i] = rewardTiers[i];
        }
        return tiers;
    }
    
    /**
     * @dev Get contract configuration
     */
    function getConfiguration() external view returns (
        uint256 fee,
        uint256 duration,
        uint256 passing,
        uint256 confiscation,
        uint256 treasury,
        uint256 reward
    ) {
        return (
            quizFee,
            sessionDuration,
            passingScore,
            confiscationThreshold,
            treasuryPercentage,
            rewardPercentage
        );
    }
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        QuizStats memory stats,
        uint256 treasury,
        uint256 rewards,
        uint256 totalTopics
    ) {
        return (globalStats, treasuryBalance, rewardPool, topicIds.length);
    }
    
    /**
     * @dev Check if session is still valid
     */
    function isSessionValid(bytes32 sessionId) external view returns (bool) {
        QuizSession memory session = quizSessions[sessionId];
        return session.user != address(0) && 
               !session.completed && 
               block.timestamp <= session.expiryTime;
    }
    
    /**
     * @dev Get time remaining for session
     */
    function getSessionTimeRemaining(bytes32 sessionId) external view returns (uint256) {
        QuizSession memory session = quizSessions[sessionId];
        if (session.user == address(0) || session.completed) return 0;
        if (block.timestamp >= session.expiryTime) return 0;
        return session.expiryTime - block.timestamp;
    }
    
    /**
     * @dev Calculate potential reward for a score
     */
    function calculatePotentialReward(uint256 score) external view returns (uint256 reward, string memory tier) {
        return _calculateReward(score);
    }
    
    // ==================== REQUIRED OVERRIDES ====================
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
   function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // ==================== EMERGENCY FUNCTIONS ====================
    
    /**
     * @dev Emergency withdrawal (only in extreme cases)
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    /**
     * @dev Receive function to accept CELO
     */
    receive() external payable {
        rewardPool += msg.value;
    }
}
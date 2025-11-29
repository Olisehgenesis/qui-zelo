# Quizelo Smart Contract

This directory contains the reverse-engineered Quizelo smart contract based on the frontend hooks and ABI.

## Contract Overview

The Quizelo contract is a quiz game where users:
1. Pay a fee (`QUIZ_FEE`) to start a quiz
2. Complete the quiz within a time limit (`QUIZ_DURATION`)
3. Claim rewards based on their score (60%+ required to win)

## Key Features

### Constants
- `QUIZ_FEE`: 0.1 ether (fee to start a quiz)
- `QUIZ_DURATION`: 900 seconds (15 minutes)
- `COOLDOWN_PERIOD`: 3600 seconds (1 hour between quizzes)
- `MAX_DAILY_QUIZZES`: 3 (maximum quizzes per day)
- `MIN_CONTRACT_BALANCE`: 1 ether (minimum balance to operate)

### Main Functions

#### `startQuiz()`
- Starts a new quiz session
- Requires payment of `QUIZ_FEE`
- Checks daily limits and cooldown period
- Generates unique session ID
- Emits `QuizStarted` event

#### `claimReward(bytes32 sessionId, uint256 score)`
- Claims reward for completed quiz
- Requires score >= 60% to receive reward
- Calculates reward based on score:
  - 60-69%: 5x quiz fee
  - 70-79%: 6x quiz fee
  - 80-89%: 7.5x quiz fee
  - 90-100%: 10x quiz fee
- Emits `QuizCompleted` event

#### `cleanupExpiredQuiz(bytes32 sessionId)`
- Removes expired quiz sessions
- Can be called by anyone

### View Functions

#### `getUserInfo(address user)`
Returns user's quiz status:
- `dailyCount`: Number of quizzes taken today
- `lastQuiz`: Timestamp of last quiz
- `nextQuizTime`: When user can take next quiz
- `wonToday`: Whether user won today
- `canQuiz`: Whether user can take quiz now

#### `getContractStats()`
Returns contract statistics:
- `balance`: Current contract balance
- `activeQuizCount`: Number of active quizzes
- `minBalance`: Minimum required balance
- `operational`: Whether contract can operate

#### `getQuizSession(bytes32 sessionId)`
Returns quiz session details:
- `user`: User address
- `startTime`: Start timestamp
- `expiryTime`: Expiry timestamp
- `active`: Whether session is active
- `claimed`: Whether reward was claimed
- `timeRemaining`: Time remaining in seconds

#### `calculatePotentialReward(address user, uint256 score)`
Calculates potential reward for a given score.

#### `canOperateQuizzes()`
Checks if contract has sufficient balance to operate.

### Admin Functions

#### `topUpContract()`
- Allows anyone to top up contract balance
- Emits `ContractToppedUp` event

#### `adminCleanupExpired()`
- Owner only
- Cleans up all expired quiz sessions

#### `adminEmergencyDrain()`
- Owner only
- Drains all contract balance to owner

## Events

- `QuizStarted(bytes32 indexed sessionId, address indexed user, uint256 startTime)`
- `QuizCompleted(bytes32 indexed sessionId, address indexed user, uint256 score, uint256 reward)`
- `ContractToppedUp(uint256 amount)`
- `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`

## Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **Ownable**: Access control for admin functions
3. **Balance Checks**: Ensures contract has sufficient balance before operations
4. **Time Limits**: Quiz sessions expire after `QUIZ_DURATION`
5. **Daily Limits**: Users limited to `MAX_DAILY_QUIZZES` per day
6. **Cooldown Period**: Users must wait `COOLDOWN_PERIOD` between quizzes

## State Variables

- `activeQuizzes`: Mapping of sessionId to QuizSession
- `currentQuizTakers`: Array of active session IDs
- `dailyQuizCount`: Mapping of user to daily quiz count
- `lastQuizTime`: Mapping of user to last quiz timestamp
- `lastResetDay`: Mapping of user to last reset day
- `hasWonToday`: Mapping of user to whether they won today
- `userNonces`: Nonce for generating unique session IDs

## Deployment

The contract uses OpenZeppelin's `Ownable` and `ReentrancyGuard` contracts. Make sure to install dependencies:

```bash
npm install @openzeppelin/contracts
```

## Contract Address

The contract address is stored in environment variables:
- `NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_ENV` (dev/prod)

## Network Support

- **Mainnet**: Celo (Chain ID: 42220)
- **Testnet**: Celo Alfajores (Chain ID: 44787)


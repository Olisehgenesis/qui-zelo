# Quizelo Contract Analysis

## Reverse Engineering Summary

This contract was reverse-engineered from the frontend hooks (`useQuizelo.ts`, `useContract.ts`, `useLeaderboard.ts`) and the ABI (`quizABI.ts`).

## Contract Architecture

### Inheritance
- `Ownable`: Provides ownership and access control
- `ReentrancyGuard`: Prevents reentrancy attacks

### Core Mechanics

1. **Quiz Flow**:
   - User pays `QUIZ_FEE` to start quiz
   - Quiz session created with unique `sessionId`
   - User has `QUIZ_DURATION` (15 minutes) to complete
   - User submits score via `claimReward()`
   - If score >= 60%, user receives reward

2. **Reward System**:
   - Base reward: 5x quiz fee (for 60%+)
   - Score-based multipliers:
     - 60-69%: 5x
     - 70-79%: 6x
     - 80-89%: 7.5x
     - 90-100%: 10x

3. **Rate Limiting**:
   - Daily limit: `MAX_DAILY_QUIZZES` (3 per day)
   - Cooldown: `COOLDOWN_PERIOD` (1 hour between quizzes)
   - Daily count resets at midnight (UTC)

4. **Session Management**:
   - Sessions stored in `activeQuizzes` mapping
   - Active sessions tracked in `currentQuizTakers` array
   - Expired sessions can be cleaned up

## State Variables Analysis

### Mappings
- `activeQuizzes[bytes32]`: QuizSession struct
- `dailyQuizCount[address]`: uint256
- `lastQuizTime[address]`: uint256
- `lastResetDay[address]`: uint256
- `hasWonToday[address]`: bool
- `userNonces[address]`: uint256

### Arrays
- `currentQuizTakers[]`: bytes32[] (active session IDs)

## Function Analysis

### Public Functions

#### `startQuiz()`
- **Payable**: Yes (requires QUIZ_FEE)
- **Effects**: 
  - Creates new quiz session
  - Increments daily count
  - Updates last quiz time
  - Adds to currentQuizTakers
- **Events**: QuizStarted

#### `claimReward(bytes32 sessionId, uint256 score)`
- **Payable**: No
- **Effects**:
  - Validates session
  - Calculates and transfers reward (if score >= 60)
  - Marks session as claimed
  - Removes from active quizzes
- **Events**: QuizCompleted

#### `cleanupExpiredQuiz(bytes32 sessionId)`
- **Payable**: No
- **Effects**: Removes expired session from active list

### View Functions

#### `getUserInfo(address user)`
Returns comprehensive user status including:
- Daily quiz count
- Last quiz timestamp
- Next available quiz time
- Win status
- Eligibility to quiz

#### `getContractStats()`
Returns contract health metrics:
- Current balance
- Active quiz count
- Minimum balance requirement
- Operational status

#### `getQuizSession(bytes32 sessionId)`
Returns full session details including time remaining.

#### `calculatePotentialReward(address user, uint256 score)`
Calculates reward based on score tier.

### Admin Functions

#### `topUpContract()`
- Anyone can call
- Accepts ETH and emits event

#### `adminCleanupExpired()`
- Owner only
- Batch cleanup of expired sessions

#### `adminEmergencyDrain()`
- Owner only
- Drains all contract balance

## Security Considerations

1. **Reentrancy Protection**: All state-changing functions use `nonReentrant`
2. **Access Control**: Admin functions protected by `onlyOwner`
3. **Balance Checks**: Operations check contract balance before proceeding
4. **Time Validation**: Expiry checks prevent claiming expired quizzes
5. **Session Validation**: Users can only claim their own sessions

## Gas Optimization Opportunities

1. **Array Operations**: `currentQuizTakers` array could be optimized
2. **Storage**: Some mappings could be packed
3. **Events**: Consider indexed parameters for better filtering

## Potential Improvements

1. **Batch Operations**: Add batch cleanup for multiple sessions
2. **Pausable**: Consider adding pause functionality
3. **Upgradeable**: Consider proxy pattern for upgrades
4. **Events**: Add more detailed events for better tracking
5. **Time Zones**: Daily reset uses UTC, could be configurable

## Testing Checklist

- [ ] Quiz start with correct fee
- [ ] Quiz start with incorrect fee (should fail)
- [ ] Daily limit enforcement
- [ ] Cooldown period enforcement
- [ ] Reward calculation for different scores
- [ ] Expired session cleanup
- [ ] Session expiry handling
- [ ] Multiple users taking quizzes
- [ ] Contract balance checks
- [ ] Admin functions access control
- [ ] Daily count reset
- [ ] Edge cases (score = 0, score = 100, etc.)

## Deployment Notes

1. Deploy with owner address
2. Initial funding recommended (at least MIN_CONTRACT_BALANCE)
3. Verify contract on block explorer
4. Update frontend with contract address
5. Test all functions on testnet first

## Known Limitations

1. No pause mechanism (relies on balance check)
2. No upgrade mechanism
3. Fixed reward tiers (not configurable)
4. Daily reset uses UTC (not configurable)
5. No refund mechanism for expired quizzes


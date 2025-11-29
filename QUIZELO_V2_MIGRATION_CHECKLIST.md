# QuizeloV2 Migration Checklist

This checklist ensures all functionality is updated for QuizeloV2 contract with ERC20 token support, user statistics, leaderboards, and quiz history.

## ✅ Core Contract Integration

### useQuizelo Hook (`src/hooks/useQuizelo.ts`)
- [x] Updated to support ERC20 token payments
- [x] Added `getSupportedTokens()` function
- [x] Added `isTokenSupported(token)` function
- [x] Added `approveToken(token, amount)` function
- [x] Added `checkTokenAllowance(token, owner)` function
- [x] Updated `startQuiz()` to accept token parameter
- [x] Updated `startQuiz()` to handle ERC20 approval
- [x] Updated `claimReward()` to work with new contract
- [x] Updated `getQuizSession()` to return all new fields (paymentToken, score, reward)
- [x] Updated `calculatePotentialReward()` to not require user address
- [x] Updated `canOperateQuizzes()` to accept token parameter
- [x] Updated `getContractStats()` to accept token parameter
- [x] Updated `topUpContract()` to accept token parameter
- [x] Updated `adminEmergencyDrain()` to accept token parameter
- [x] Added `getUserStats(address)` function
- [x] Added `getUserQuizHistory(address, limit)` function
- [x] Added `getTopScoresLeaderboard(limit)` function
- [x] Added `getTopEarnersLeaderboard(limit)` function
- [x] Added `getTopStreaksLeaderboard(limit)` function
- [x] Added `getUserScoreRank(address)` function
- [x] Added `getUserEarnerRank(address)` function
- [x] Added `getUserStreakRank(address)` function
- [x] Added `getGlobalStats()` function
- [x] Added `compareUsers(user1, user2)` function
- [x] Added `getTokenBalance(token)` function
- [x] Added state for `userStats`
- [x] Added state for `supportedTokens`
- [x] Added state for `selectedToken`
- [x] Added `setSelectedToken()` function
- [x] Updated types to match QuizeloV2 contract

## ✅ Leaderboard Hook (`src/hooks/useLeaderboard.ts`)
- [x] Updated to use contract leaderboard functions instead of event parsing
- [x] Added support for three leaderboard types (scores, earners, streaks)
- [x] Added `topScores` state
- [x] Added `topEarners` state
- [x] Added `topStreaks` state
- [x] Added `activeTab` state for tab switching
- [x] Added `setActiveTab()` function
- [x] Added `getCurrentLeaderboard()` function
- [x] Added `getUserRanks()` function
- [x] Updated `getPlayerRank()` to work with current tab
- [x] Updated `getPlayerStats()` to work with current tab
- [x] Added formatters: `formatScore()`, `formatStreak()`
- [x] Updated to fetch from contract instead of events

## ✅ Leaderboard Component (`src/components/pages/LeaderboardContent.tsx`)
- [x] Added tab selector for three leaderboard types
- [x] Updated to display top scores leaderboard
- [x] Updated to display top earners leaderboard
- [x] Updated to display top streaks leaderboard
- [x] Added user rank display for all three leaderboards
- [x] Updated to show current user's rankings
- [x] Added global stats display
- [x] Updated formatting for different leaderboard types
- [x] Added proper styling for leaderboard entries
- [x] Added medal icons for top 3 positions
- [x] Highlighted current user's entry

## ✅ Profile Component (`src/components/pages/ProfileContent.tsx`)
- [x] Updated to display comprehensive user statistics
- [x] Added display for `totalQuizzes`
- [x] Added display for `totalEarnings`
- [x] Added display for `bestScore`
- [x] Added display for `averageScore`
- [x] Added display for `currentStreak`
- [x] Added display for `longestStreak`
- [x] Added display for `totalWins`
- [x] Added display for `lastActivity`
- [x] Added quiz history section
- [x] Updated to fetch and display quiz history
- [x] Added loading states for history
- [x] Updated daily status display
- [x] Maintained backward compatibility with existing userInfo

## ✅ Home Component (`src/components/pages/HomeContent.tsx`)
- [x] Updated contract stats display
- [x] Added total quizzes display
- [x] Updated reward pool display (changed from CELO to tokens)
- [x] Maintained all existing functionality
- [x] Updated text colors to black for visibility

## ✅ Main App Component (`src/components/Demo.tsx`)
- [x] Updated `startQuizFlow()` to pass token to `startQuiz()`
- [x] Updated to use selected token or first supported token
- [x] Maintained all existing quiz flow functionality
- [x] Updated play button styling (cool button with animations)

## ✅ Type Definitions
- [x] Updated `QuizSession` interface with paymentToken, score, reward
- [x] Updated `ContractStats` interface with totalQuizzes, totalRewards, totalFees
- [x] Added `UserStats` interface
- [x] Added `LeaderboardEntry` interface
- [x] Added `QuizHistory` interface
- [x] Added `GlobalStats` interface

## ✅ Token Management
- [x] Token selection support
- [x] Token approval handling
- [x] Token allowance checking
- [x] Multiple token support
- [x] Token balance display

## ✅ Error Handling
- [x] Token approval errors handled
- [x] Token allowance errors handled
- [x] Contract call errors handled
- [x] Network switching errors handled
- [x] User-friendly error messages

## ✅ UI/UX Updates
- [x] All text changed to black for visibility
- [x] Play button enhanced with cool animations
- [x] Leaderboard tabs with proper styling
- [x] Profile stats with comprehensive display
- [x] Quiz history with proper formatting
- [x] Loading states for all async operations
- [x] Error states with proper messaging

## ✅ Testing Checklist

### Token Functions
- [ ] Test token selection
- [ ] Test token approval flow
- [ ] Test startQuiz with different tokens
- [ ] Test token balance display
- [ ] Test multiple token support

### User Stats
- [ ] Test getUserStats() function
- [ ] Test getUserQuizHistory() function
- [ ] Test user stats display in profile
- [ ] Test quiz history display
- [ ] Test stats refresh

### Leaderboards
- [ ] Test top scores leaderboard
- [ ] Test top earners leaderboard
- [ ] Test top streaks leaderboard
- [ ] Test tab switching
- [ ] Test user rank display
- [ ] Test leaderboard refresh

### Quiz Flow
- [ ] Test startQuiz with token approval
- [ ] Test claimReward with new contract
- [ ] Test quiz session retrieval
- [ ] Test score calculation
- [ ] Test reward calculation

### Contract Stats
- [ ] Test getContractStats() with token
- [ ] Test contract stats display
- [ ] Test operational status
- [ ] Test balance display

### Admin Functions
- [ ] Test topUpContract with token
- [ ] Test adminEmergencyDrain with token
- [ ] Test adminCleanupExpired

## 🔄 Migration Notes

### Breaking Changes
1. **startQuiz()** now requires token approval before calling
2. **startQuiz()** now accepts optional token parameter
3. **getContractStats()** now requires token parameter
4. **calculatePotentialReward()** no longer needs user address
5. **canOperateQuizzes()** now requires token parameter
6. **topUpContract()** now requires token parameter
7. **adminEmergencyDrain()** now requires token parameter

### New Features
1. ERC20 token support for payments and rewards
2. Comprehensive user statistics tracking
3. Three types of leaderboards (scores, earners, streaks)
4. Quiz history tracking
5. User ranking system
6. Global statistics

### Backward Compatibility
- Most functions maintain backward compatibility
- Old event-based leaderboard still works but new contract-based is preferred
- UserInfo structure remains the same
- Quiz flow remains the same

## 📝 Environment Variables

Ensure these are set:
- `NEXT_PUBLIC_QUIZELO_CONTRACT_ADDRESS` - Contract address
- `NEXT_PUBLIC_ENV` - Environment (dev/prod)
- `NEXT_PUBLIC_OPENAI_API_KEY` - For AI quiz generation

## 🚀 Deployment Checklist

- [ ] Update contract address in environment variables
- [ ] Deploy QuizeloV2 contract
- [ ] Verify contract on block explorer
- [ ] Add supported tokens to contract
- [ ] Fund contract with initial tokens
- [ ] Test all functions on testnet
- [ ] Update frontend with new contract address
- [ ] Test token approval flow
- [ ] Test complete quiz flow
- [ ] Test leaderboards
- [ ] Test user stats
- [ ] Test quiz history
- [ ] Monitor for errors
- [ ] Update documentation

## 🐛 Known Issues / TODO

- [ ] Add token selector UI component
- [ ] Add token balance display in UI
- [ ] Add token approval status indicator
- [ ] Optimize leaderboard loading (pagination)
- [ ] Add caching for leaderboard data
- [ ] Add error recovery mechanisms
- [ ] Add retry logic for failed transactions
- [ ] Add transaction status tracking
- [ ] Add gas estimation display
- [ ] Add transaction history

## 📚 Documentation Updates Needed

- [ ] Update README with new features
- [ ] Update API documentation
- [ ] Update user guide
- [ ] Update developer guide
- [ ] Add migration guide
- [ ] Add token integration guide


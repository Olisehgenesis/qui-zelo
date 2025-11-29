# MiniPay Integration Notes

## Overview
This document outlines the MiniPay integration for Quizelo, including fee currency selection and transaction handling.

## Implementation Details

### 1. MiniPay Detection
- MiniPay is detected via `window.ethereum.isMiniPay`
- Detection utility: `src/lib/minipay.ts`
- Auto-connects when MiniPay is detected

### 2. Fee Currency Selection Modal
- Modal appears on app startup when wallet is connected
- Users must select a payment token (cUSD, USDC, USDT, or CELO)
- **MiniPay Restriction**: MiniPay only supports stablecoins (cUSD, USDC, USDT)
  - CELO native token is NOT available in MiniPay
  - Modal automatically filters out CELO when MiniPay is detected

### 3. Transaction Fee Currency
- MiniPay supports `feeCurrency` parameter in transactions
- When using MiniPay with cUSD, gas fees can be paid in cUSD
- For other stablecoins in MiniPay, gas fees default to CELO or can be set to cUSD
- Implementation: `src/hooks/useQuizelo.ts` - `useContractTransaction` hook

### 4. Contract Fee Note
**IMPORTANT**: The current contract has `QUIZ_FEE = 100 * 1e18` (100 tokens).

To support 0.1 cUSD as requested:
- Current: `100 * 1e18 = 100000000000000000000` (100 tokens with 18 decimals)
- Required: `0.1 * 1e18 = 100000000000000000` (0.1 tokens with 18 decimals)

**The contract constant `QUIZ_FEE` needs to be updated to `0.1 * 1e18` to support 0.1 cUSD fees.**

Alternatively, if the contract cannot be changed, the UI displays "0.1 tokens" but the actual fee will be 100 tokens as defined in the contract.

### 5. Supported Tokens in MiniPay
- ✅ cUSD: `0x765DE816845861e75A25fCA122bb6898B8B1282a`
- ✅ USDC: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
- ✅ USDT: `0x48065fbbe25f71C9282ddf5e1cD6D6A887483D5e`
- ❌ CELO: Not supported in MiniPay

### 6. Gas Fees in MiniPay
- Gas fees can be paid in CELO (default) or cUSD (when feeCurrency is set)
- The `feeCurrency` parameter is automatically added to transactions when:
  - User is using MiniPay
  - User selected cUSD as payment token
  - Transaction is `startQuiz`

## Files Modified
1. `src/lib/minipay.ts` - MiniPay detection and utilities
2. `src/components/modals/FeeCurrencyModal.tsx` - Fee currency selection modal
3. `src/components/Demo.tsx` - App initialization with MiniPay detection
4. `src/hooks/useQuizelo.ts` - Transaction logic with feeCurrency support
5. `src/components/modals/index.ts` - Export new modal

## Testing Checklist
- [ ] Test MiniPay detection
- [ ] Test fee currency modal appears on startup
- [ ] Test CELO is blocked in MiniPay
- [ ] Test stablecoin selection works in MiniPay
- [ ] Test transactions include feeCurrency parameter
- [ ] Test gas fees are paid correctly (CELO or cUSD)
- [ ] Verify contract QUIZ_FEE matches UI display (currently 100 tokens, should be 0.1)

## Next Steps
1. Update contract `QUIZ_FEE` constant to `0.1 * 1e18` if 0.1 cUSD is desired
2. Deploy updated contract
3. Update `QUIZELO_CONTRACT_ADDRESS` in environment variables
4. Test end-to-end flow in MiniPay


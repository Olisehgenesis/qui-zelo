/**
 * MiniPay detection and utility functions
 */

export interface MiniPayInfo {
  isMiniPay: boolean;
  feeCurrency?: string;
}

/**
 * Check if the current wallet is MiniPay
 */
export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.ethereum && (window.ethereum as { isMiniPay?: boolean }).isMiniPay);
}

/**
 * Get MiniPay information
 */
export function getMiniPayInfo(): MiniPayInfo {
  const isMiniPayWallet = isMiniPay();
  return {
    isMiniPay: isMiniPayWallet,
  };
}

/**
 * MiniPay only supports stablecoins (cUSD, USDC, USDT)
 * CELO native token is NOT supported
 */
export const MINIPAY_SUPPORTED_TOKENS = [
  '0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD
  '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', // USDC
  '0x48065fbbe25f71C9282ddf5e1cD6D6A887483D5e', // USDT
] as const;

/**
 * Check if a token address is supported by MiniPay
 */
export function isTokenSupportedByMiniPay(tokenAddress: string): boolean {
  return MINIPAY_SUPPORTED_TOKENS.some(
    (addr) => addr.toLowerCase() === tokenAddress.toLowerCase()
  );
}

/**
 * Get fee currency for MiniPay transactions
 * Uses the selected token as fee currency if it's supported by MiniPay
 * MiniPay supports stablecoins (cUSD, USDC, USDT) as fee currency
 * If the selected token is not supported, defaults to cUSD
 */
export function getFeeCurrencyForMiniPay(selectedToken: string | null): string | undefined {
  if (!isMiniPay() || !selectedToken) return undefined;
  
  const tokenLower = selectedToken.toLowerCase();
  
  // Check if selected token is supported by MiniPay
  const isSupported = MINIPAY_SUPPORTED_TOKENS.some(
    (addr) => addr.toLowerCase() === tokenLower
  );
  
  if (isSupported) {
    // Use the selected token as fee currency
    return selectedToken;
  }
  
  // If selected token is not supported by MiniPay, default to cUSD
  return MINIPAY_SUPPORTED_TOKENS[0]; // cUSD
}


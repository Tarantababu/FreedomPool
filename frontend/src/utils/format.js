/**
 * Formatting utilities for the FreedomPool frontend.
 */

/**
 * Format a number with Turkish locale
 */
export function fmt(n, dec = 0) {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/**
 * Format USDC amount
 */
export function fmtUsdc(n, dec = 2) {
  return `$${fmt(n, dec)} USDC`;
}

/**
 * Shorten an Ethereum address
 */
export function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Format seconds into human-readable countdown
 */
export function formatCountdown(seconds) {
  if (seconds <= 0) return "Şimdi!";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s ${m}dk`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

/**
 * Format a timestamp to relative time
 */
export function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

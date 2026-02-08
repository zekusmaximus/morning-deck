
/**
 * Ensures a URL is safe for use in an href attribute.
 *
 * It validates the protocol against a whitelist (http, https, mailto, tel).
 * If the URL has no protocol, it prepends http:// (unless it starts with /).
 * If the URL has a dangerous protocol (e.g. javascript:), it returns '#'.
 */
export function ensureSafeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";

  try {
    const parsed = new URL(trimmed);
    // Whitelist allowed protocols
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return trimmed;
    }
    // Block other protocols (javascript:, data:, file:, etc.)
    return "#";
  } catch {
    // Parsing failed. Assume domain or relative path.

    // Check if it starts with / (relative path)
    if (trimmed.startsWith("/")) {
      return trimmed;
    }

    // Assume it's a domain name or host-relative path, prepend http://
    return `http://${trimmed}`;
  }
}

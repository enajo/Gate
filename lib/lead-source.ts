/** Best-effort label for where a visitor came from — never fails on a malformed referrer. */
export function getLeadSourceLabel(lead: {
  referrer?: string | null;
  utmSource?: string | null;
}): string {
  if (lead.utmSource) return lead.utmSource;

  if (lead.referrer) {
    try {
      return new URL(lead.referrer).hostname.replace(/^www\./, "");
    } catch {
      // malformed/relative referrer — fall through to "Direct"
    }
  }

  return "Direct";
}

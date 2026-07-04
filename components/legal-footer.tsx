export const LEGAL_DISCLAIMER =
  "This product does not create, transfer, or evidence legal equity ownership. Contribution records are for internal coordination and negotiation support only. Any actual equity, option, token, bonus, revenue-share, or founder agreement requires separate legal documentation, corporate approval, tax review, and applicable securities-law compliance.";

export function LegalFooter() {
  return (
    <footer className="border-t border-line bg-white/80 px-4 py-4 text-xs leading-5 text-muted">
      <div className="mx-auto max-w-7xl">{LEGAL_DISCLAIMER}</div>
    </footer>
  );
}

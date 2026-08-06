import { Link } from "react-router";

import { REPOSITORY_URL } from "./configuratorData.js";

const RECEIPTS = [
  {
    detail: "complete configurable JSON artifacts",
    href: `${REPOSITORY_URL}/blob/main/package.json`,
    value: "24",
  },
  {
    detail: "named syntax, test, and experimental artifacts",
    to: "/guide/named-configurations",
    value: "+4",
  },
  {
    detail: "curated overrides and exceptions with fixtures",
    href: `${REPOSITORY_URL}/blob/main/docs/rule-catalog.md`,
    value: "27",
  },
  {
    detail: "profiles exercised by the behavioral harness",
    href: `${REPOSITORY_URL}/blob/main/scripts/test-harness.ts`,
    value: "11",
  },
  {
    detail: "in-place helpers for narrow project exceptions",
    to: "/guide/rule-customization",
    value: "5",
  },
  {
    detail: "accepted architecture decisions, including this site",
    href: `${REPOSITORY_URL}/tree/main/docs/adr`,
    value: "13",
  },
] as const;

function ReceiptContent({ detail, value }: { detail: string; value: string }) {
  return (
    <>
      <span className="hp-receipt-value">{value}</span>
      <span>{detail}</span>
    </>
  );
}

export function ReceiptsSection() {
  return (
    <section aria-labelledby="hp-receipts-title" className="hp-section">
      <div className="hp-container">
        <div className="hp-section-head hp-section-head-narrow">
          <h2 className="hp-section-title" id="hp-receipts-title">
            No testimonials. The repository has receipts.
          </h2>
          <p className="hp-section-lead">
            Every number links to the source, test, or decision behind it. These
            are release artifacts, not marketing estimates.
          </p>
        </div>
        <ul className="hp-receipts">
          {RECEIPTS.map((receipt) => (
            <li key={`${receipt.value}-${receipt.detail}`}>
              {"to" in receipt ? (
                <Link to={receipt.to}>
                  <ReceiptContent
                    detail={receipt.detail}
                    value={receipt.value}
                  />
                </Link>
              ) : (
                <a href={receipt.href}>
                  <ReceiptContent
                    detail={receipt.detail}
                    value={receipt.value}
                  />
                </a>
              )}
            </li>
          ))}
        </ul>
        <aside className="hp-principle">
          <p>
            This is a beta and it is opinionated on purpose. The broad baseline
            comes from pinned native Oxlint categories. Every project-specific
            override and exception has an owner, a stability boundary, and
            executable evidence; missing ecosystems stay visible.
          </p>
        </aside>
      </div>
    </section>
  );
}

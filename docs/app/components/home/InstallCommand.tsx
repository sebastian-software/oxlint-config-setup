import { useState } from "react";

import { INSTALL_COMMAND } from "./configuratorData.js";

type CopyState = "copied" | "failed" | "idle";

export function InstallCommand() {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  const buttonLabel = {
    copied: "Copied",
    failed: "Copy failed",
    idle: "Copy install command",
  }[copyState];

  return (
    <div className="hp-command">
      <code className="hp-command-text">
        <span aria-hidden="true" className="hp-command-prompt" />
        {INSTALL_COMMAND}
      </code>
      <button
        className="hp-command-copy"
        onClick={() => void copyCommand()}
        type="button"
      >
        {buttonLabel}
      </button>
      <span aria-live="polite" className="hp-sr-only">
        {copyState === "copied"
          ? "Install command copied to clipboard."
          : copyState === "failed"
            ? "The install command could not be copied. Select it manually."
            : ""}
      </span>
    </div>
  );
}

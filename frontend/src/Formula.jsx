// src/Formula.jsx
// Renders a LaTeX string with KaTeX. Falls back to the plain-text version
// (e.g. "BSA = √(...) = 1.82 m²") if the LaTeX fails to parse for any
// reason, so a malformed expression never breaks the page or hides the
// result from the user.

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function Formula({ latex, fallback, displayMode = true }) {
  const html = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return <p className="calc-step-formula">{fallback}</p>;
  }

  // eslint-disable-next-line react/no-danger
  return <div className="calc-step-formula katex-formula" dangerouslySetInnerHTML={{ __html: html }} />;
}

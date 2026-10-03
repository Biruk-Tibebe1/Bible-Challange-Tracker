"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fums?: (...args: unknown[]) => void;
    fumsData?: unknown[][];
  }
}

const FUMS_SCRIPT_URL = "https://pkg.api.bible/fumsV3.min.js";

export function ApiBibleFairUseTracker({ token }: { token?: string }) {
  const reportedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || reportedToken.current === token) return;
    reportedToken.current = token;

    window.fumsData ??= [];
    window.fums ??= (...args) => window.fumsData?.push(args);
    window.fums("trackView", token);

    if (!document.querySelector(`script[src="${FUMS_SCRIPT_URL}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = FUMS_SCRIPT_URL;
      script.crossOrigin = "anonymous";
      document.head.append(script);
    }
  }, [token]);

  return null;
}
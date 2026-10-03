"use client";

import { useEffect, useState } from "react";
import { getConnectivityState } from "@/lib/pwa/connectivity";

export function ConnectivityIndicator() {
  const [state, setState] = useState<"online" | "offline" | null>(null);

  useEffect(() => {
    const update = (event?: Event) => {
      if (event?.type === "offline") {
        setState("offline");
        return;
      }
      if (event?.type === "online") {
        setState("online");
        return;
      }
      setState(getConnectivityState(navigator.onLine));
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (state !== "offline") return null;
  return (
    <div aria-live="polite" className="border-b border-[#d7b8ad] bg-[#fff3ed] px-4 py-2 text-center text-xs leading-5 text-[#763c31] sm:text-sm" role="status">
      You&apos;re offline. Local reader data stays on this device; account-backed challenge changes need a connection.
    </div>
  );
}
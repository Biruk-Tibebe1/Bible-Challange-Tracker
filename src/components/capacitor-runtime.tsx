"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function CapacitorRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let removeBackButtonListener: (() => void) | undefined;
    const backButtonListener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    });

    void backButtonListener.then((listener) => {
      if (active) {
        removeBackButtonListener = () => void listener.remove();
      } else {
        void listener.remove();
      }
    });

    const openExternalLinks = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      const url = new URL(link.href, window.location.href);
      if (
        url.origin === window.location.origin ||
        (url.protocol !== "https:" && url.protocol !== "http:")
      ) {
        return;
      }

      event.preventDefault();
      void Browser.open({ url: url.toString() }).catch((error: unknown) => {
        console.error("Unable to open external link", error);
      });
    };
    document.addEventListener("click", openExternalLinks);

    return () => {
      active = false;
      removeBackButtonListener?.();
      document.removeEventListener("click", openExternalLinks);
    };
  }, []);

  return null;
}

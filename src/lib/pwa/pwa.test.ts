import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import manifest from "../../app/manifest.ts";
import { getConnectivityState } from "./connectivity.ts";

test("PWA manifest has installable names, display mode, colors, and a vector icon", () => {
  const value = manifest();
  assert.equal(value.name, "Bible Challenge Tracker");
  assert.equal(value.short_name, "Bible Challenge");
  assert.equal(value.display, "standalone");
  assert.equal(value.start_url, "/");
  assert.equal(value.scope, "/");
  assert.equal(value.theme_color, "#315b49");
  assert.equal(value.background_color, "#f7f7f1");
  assert.deepEqual(value.icons?.slice(0, 2), [{
    src: "/icon.png",
    sizes: "1254x1254",
    type: "image/png",
    purpose: "any",
  }, {
    src: "/icon.svg",
    sizes: "any",
    type: "image/svg+xml",
    purpose: "maskable",
  }]);
});

test("service worker caches only public pages, static assets, and KJV chapters", () => {
  const worker = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /SAFE_PAGE_PATHS = new Set\(\["\/", "\/today", "\/bible", "\/challenge", "\/challenges"\]\)/);
  assert.match(worker, /function isSafeKJVChapterUrl/);
  assert.match(worker, /\/api\/bible\/kjv\//);
  assert.match(worker, /function isNextStaticUrl/);
  assert.doesNotMatch(worker, /"\/profile"|"\/groups"|"\/auth/);
  assert.doesNotMatch(worker, /supabase\.co|Authorization|service.role/i);
});

test("connectivity state follows the browser online flag", () => {
  assert.equal(getConnectivityState(true), "online");
  assert.equal(getConnectivityState(false), "offline");
});
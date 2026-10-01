import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createKJVSearch } from "./kjv-search.ts";
import type { KJVDataset } from "./kjv-search.ts";

const dataset = JSON.parse(readFileSync(new URL("./data/kjv.json", import.meta.url), "utf8")) as KJVDataset;
const searchKJV = createKJVSearch(dataset);

test("KJV word search is case-insensitive and returns verse references and snippets", () => {
  const result = searchKJV("LOVE", 5);
  const lowercase = searchKJV("love", 5);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(lowercase.status, "ok");
  if (lowercase.status !== "ok") return;
  assert.equal(result.total, lowercase.total);
  assert.deepEqual(result.results, lowercase.results);
  assert.ok(result.total > 0);
  assert.ok(result.results.every((item) => item.reference && item.snippet));
});

test("KJV phrase search returns Genesis 1:1", () => {
  const result = searchKJV("In the beginning");
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.ok(result.results.some((item) => item.reference === "Genesis 1:1"));
});

test("exact book chapter verse reference search returns one matching verse", () => {
  const result = searchKJV("john 3:16");
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.total, 1);
  assert.equal(result.results[0]?.reference, "John 3:16");
});

test("empty, missing, and oversized queries are safe", () => {
  assert.deepEqual(searchKJV(""), { status: "ok", query: "", total: 0, results: [] });
  const missing = searchKJV("zzqxv_not_a_bible_word");
  assert.equal(missing.status, "ok");
  if (missing.status === "ok") assert.equal(missing.total, 0);
  assert.equal(searchKJV("x".repeat(121)).status, "error");
});

test("search result limit is clamped and search spans the full canon", () => {
  const result = searchKJV("Jesus", 1000);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.ok(result.results.length <= 100);
  assert.ok(result.total > 100);
  assert.ok(searchKJV("Jesus", 100, result.total - 1).status === "ok");
  const lastPage = searchKJV("Jesus", 100, result.total - 1);
  assert.equal(lastPage.status, "ok");
  if (lastPage.status === "ok") assert.equal(lastPage.results[0]?.bookId, "revelation");
});
import kjvDataset from "@/features/bible-books/data/kjv.json";
import { createKJVSearch } from "@/features/bible-books/kjv-search";
import type { KJVDataset } from "@/features/bible-books/kjv-search";

const searchKJV = createKJVSearch(kjvDataset as KJVDataset);

export function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const resultLimit = Number(url.searchParams.get("limit") ?? "40");
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const result = searchKJV(query, resultLimit, offset);
  return Response.json(result, { status: result.status === "error" ? 400 : 200 });
}
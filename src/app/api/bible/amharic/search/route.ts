import { createAmharicSourceClient, getAmharicSourceConfig } from "@/features/bible-books/amharic-source";

function resultStatus(result: { status: string; reason?: string }): number {
  if (result.status === "available") return 200;
  if (result.status === "unavailable") return result.reason === "chapter-not-available" ? 404 : 503;
  return 502;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = createAmharicSourceClient(getAmharicSourceConfig());
  const result = await client.search(url.searchParams.get("q") ?? "", {
    limit: Number(url.searchParams.get("limit") ?? 40),
    offset: Number(url.searchParams.get("offset") ?? 0),
  }, request.signal);
  return Response.json(result, { status: resultStatus(result) });
}
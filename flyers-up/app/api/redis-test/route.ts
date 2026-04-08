import { redis } from "@/lib/redis";

export async function GET() {
  await redis.set("test", "working");

  const value = await redis.get("test");

  return Response.json({
    success: true,
    value,
  });
}

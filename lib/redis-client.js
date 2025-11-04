import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_REST_API_TOKEN,
});
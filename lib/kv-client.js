// lib/kv-client.js
import { createClient } from "@vercel/kv";

// We are now using the correct REST API URL variable
export const kv = createClient({
  url: process.env.KV_REST_API_URL, 
  token: process.env.KV_REST_API_TOKEN,
});
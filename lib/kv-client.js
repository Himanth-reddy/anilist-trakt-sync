// lib/kv-client.js
// This connects to your Vercel KV store

import { createClient } from "@vercel/kv";

// We use the variable names from your screenshot
export const kv = createClient({
  url: process.env.KV_URL,
  token: process.env.KV_REST_API_TOKEN,
});
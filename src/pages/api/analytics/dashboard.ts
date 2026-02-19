import type { NextApiRequest, NextApiResponse } from "next";
import { API_BASE_URL } from "@/lib/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = req.headers.authorization;
  const url = new URL(`${API_BASE_URL}/analytics/dashboard`);

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({ error: "BAD_GATEWAY", message: "Backend unavailable" });
  }
}

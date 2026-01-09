import type { NextApiRequest, NextApiResponse } from "next";

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  return res.status(410).json({ error: "Client-side hashing is deprecated. Update your client." });
}

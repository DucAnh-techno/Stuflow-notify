import { NextResponse } from "next/server";
import admin,{ db } from "../../../../../../back-end/lib/firebaseAdmin.js";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    await admin.auth().revokeRefreshTokens(uid);
    await db.collection("portalSessions").doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

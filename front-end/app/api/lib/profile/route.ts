import { NextResponse } from "next/server";
import admin, { db } from "../../../../../back-end/lib/firebaseAdmin.js";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const portalSession = await db.collection("portalSessions").doc(uid).get();

    return NextResponse.json({
      ok: true,
      uid,
      decoded,
      portalSession: portalSession.exists ? portalSession.data() : null,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

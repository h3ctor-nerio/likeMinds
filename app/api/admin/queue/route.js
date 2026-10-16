import { getDb } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import { route, json, fail } from "@/lib/http";

export const GET = route(
  async (req, { user }) => {
    if (!isAdmin(user)) return fail("Only moderators can open the review queue.", 403);
    const db = await getDb();
    const [thoughts, replies, reports, organizers] = await Promise.all([
      db.collection("thoughts").find({ status: "in_review" }).sort({ createdAt: 1 }).limit(50).toArray(),
      db.collection("replies").find({ status: "in_review" }).sort({ createdAt: 1 }).limit(50).toArray(),
      db.collection("reports").find({ status: "open" }).sort({ createdAt: 1 }).limit(50).toArray(),
      db.collection("users").find({ "organizer.status": "pending" }).limit(50).toArray(),
    ]);
    return json({
      thoughts: thoughts.map((t) => ({ id: String(t._id), text: t.text, tags: t.tags, flags: t.moderation?.flags || [], support: Boolean(t.moderation?.support), reportCount: t.reportCount || 0, createdAt: t.createdAt })),
      replies: replies.map((r) => ({ id: String(r._id), text: r.text, flags: r.moderation?.flags || [], createdAt: r.createdAt })),
      reports: reports.map((r) => ({ id: String(r._id), kind: r.kind, targetId: String(r.targetId), reason: r.reason, excerpt: r.excerpt, createdAt: r.createdAt })),
      organizers: organizers.map((u) => ({ id: String(u._id), displayName: u.displayName, ...u.organizer })),
    });
  },
  { auth: true }
);

import { getDb } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import { route, json, fail, readJson, oid } from "@/lib/http";

const REMOVE = { thought: "thoughts", reply: "replies", message: "messages", event: "events", group: "groups" };

export const POST = route(
  async (req, { user }) => {
    if (!isAdmin(user)) return fail("Only moderators can do that.", 403);
    const { type, id, decision } = await readJson(req);
    const _id = oid(id);
    if (!_id) return fail("Missing id.");
    const db = await getDb();
    const by = { reviewedBy: user._id, reviewedAt: new Date() };

    if (type === "thought" || type === "reply") {
      const col = type === "thought" ? "thoughts" : "replies";
      const status = decision === "approve" ? "published" : "removed";
      const doc = await db.collection(col).findOneAndUpdate({ _id }, { $set: { status, ...by } }, { returnDocument: "after" });
      if (type === "reply" && doc && status === "published") await db.collection("thoughts").updateOne({ _id: doc.thoughtId }, { $inc: { replyCount: 1 } });
    } else if (type === "report") {
      const r = await db.collection("reports").findOne({ _id });
      if (!r) return fail("Report not found.", 404);
      if (decision === "remove") {
        const col = REMOVE[r.kind];
        if (r.kind === "message") await db.collection("messages").deleteOne({ _id: r.targetId });
        else await db.collection(col).updateOne({ _id: r.targetId }, { $set: { status: r.kind === "event" ? "cancelled" : "removed", ...by } });
      }
      await db.collection("reports").updateMany({ targetId: r.targetId, status: "open" }, { $set: { status: decision === "remove" ? "actioned" : "dismissed", ...by } });
    } else if (type === "organizer") {
      await db.collection("users").updateOne({ _id }, { $set: { "organizer.status": decision === "approve" ? "verified" : "rejected", "organizer.reviewedAt": new Date() } });
    } else {
      return fail("Unknown review type.");
    }
    return json({ ok: true });
  },
  { auth: true }
);

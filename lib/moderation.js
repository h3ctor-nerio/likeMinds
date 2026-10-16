import { askClaude, parseJson } from "./claude";

const CRISIS = [
  "kill myself", "end my life", "suicide", "suicidal", "want to die", "hurt myself", "self harm", "self-harm",
  "no reason to live", "better off without me",
];
const HARASSMENT = [
  "kill you", "kys", "go die", "i will hurt you", "you're worthless", "youre worthless", "nobody likes you",
  "i know where you live",
];
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{8,}\d)/;
const ADDRESS = /\b(my address is|i live at)\b/i;
const LINK = /https?:\/\/|www\./i;

export const SUPPORT_NOTE =
  "If you're going through something heavy, you don't have to hold it alone. In the US you can call or text 988 to reach the Suicide & Crisis Lifeline any time. Outside the US, contact your local emergency number or a local crisis line.";

/**
 * Check text before it becomes visible to others.
 * context: "thought" | "reply" | "message" | "event"
 * Returns { status: "published" | "in_review" | "blocked", flags: [], note, support }
 */
export async function checkContent(text, context = "thought") {
  const lower = ` ${String(text || "").toLowerCase()} `;
  const flags = [];
  let support = false;

  if (CRISIS.some((p) => lower.includes(p))) {
    flags.push("possible crisis");
    support = true;
  }
  if (HARASSMENT.some((p) => lower.includes(p))) flags.push("possible harassment");

  // Contact details and links are fine in private chats after both people agreed to connect.
  if (context !== "message") {
    if (EMAIL.test(text) || PHONE.test(text) || ADDRESS.test(text)) flags.push("personal contact details");
    if (context !== "event" && LINK.test(text)) flags.push("link");
  }

  if (flags.length === 0) {
    const ai = await aiCheck(text, context);
    if (ai?.flags?.length) flags.push(...ai.flags.map((f) => `AI: ${f}`));
    if (ai?.support) support = true;
  }

  if (context === "message") {
    // Private chats are not pre-screened by people; only clearly hostile messages are stopped.
    if (flags.some((f) => f.includes("harassment"))) {
      return { status: "blocked", flags, support, note: "This message reads as hostile. Rephrase it to send." };
    }
    return { status: "published", flags, support, note: support ? SUPPORT_NOTE : "" };
  }

  if (flags.length === 0) return { status: "published", flags, support, note: "" };

  let note = "Thanks for sharing. A person on our team will take a quick look before this appears to others.";
  if (flags.includes("personal contact details")) {
    note += " To protect your privacy, share contact details in a private chat after you've both agreed to connect.";
  }
  if (support) note += " " + SUPPORT_NOTE;
  return { status: "in_review", flags, support, note };
}

async function aiCheck(text, context) {
  const out = await askClaude({
    maxTokens: 200,
    timeoutMs: 8000,
    system:
      "You screen short posts for a community-connection app used by teens and adults. " +
      "Respond with JSON only, no prose: {\"flags\": string[], \"support\": boolean}. " +
      "Add a flag only for: harassment, hate, sexual content, threats, scams, or sharing someone's private information. " +
      "Set support to true if the writer may be in crisis or at risk of self-harm. " +
      "Ordinary sadness, loneliness, disagreement, and political opinions are fine and get no flags.",
    prompt: `Context: ${context}\nPost:\n"""${String(text).slice(0, 2000)}"""`,
  });
  const parsed = parseJson(out);
  if (!parsed || !Array.isArray(parsed.flags)) return null;
  return { flags: parsed.flags.slice(0, 4).map(String), support: Boolean(parsed.support) };
}

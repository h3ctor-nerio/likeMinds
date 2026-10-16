// Transparent, explainable matching. Every suggestion carries a plain-language reason.
import { distanceKm } from "./geo";

const STOP = new Set(
  "about after again also always among another around because been before being between both cannot could does doing down during each else even every from further have having here into itself just like made make many more most much must myself never only other ought over really same should since some such than that their them then there these they thing things think this those though through today together very want what when where which while will with would your yours just feel feeling felt still".split(" ")
);

export function words(text) {
  return (String(text || "").toLowerCase().match(/[\p{L}]{4,}/gu) || []).filter((w) => !STOP.has(w));
}

function overlap(a, b) {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
}

/** Rank candidate thoughts by how much they share with `thought`. */
export function similarThoughts(thought, candidates, limit = 5) {
  const baseWords = words(thought.text);
  const baseTags = thought.tags || [];
  return candidates
    .filter((c) => String(c._id) !== String(thought._id))
    .map((c) => {
      const tags = overlap(baseTags, c.tags || []);
      const shared = overlap(baseWords, words(c.text));
      const union = new Set([...baseWords, ...words(c.text)]).size || 1;
      const score = tags.length * 2 + (shared.length / union) * 6 + shared.length * 0.3;
      let reason = "";
      if (tags.length) reason = `Also tagged ${tags.slice(0, 3).map((t) => "#" + t).join(", ")}`;
      else if (shared.length) reason = `Mentions ${shared.slice(0, 3).join(", ")}`;
      return { item: c, score, reason };
    })
    .filter((r) => r.score > 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function userTerms(user) {
  const p = user?.profile || {};
  return [
    ...(p.interests || []),
    ...(p.skills || []),
    ...(p.strengths || []),
    ...(p.tags || []),
    ...words(p.aspirations),
    ...words(p.values),
  ].map((s) => String(s).toLowerCase());
}

/** Score events against the profile and access needs the user chose to share. */
export function recommendEvents(user, events, limit = 4) {
  if (!user) return [];
  const terms = userTerms(user);
  const prefs = user.prefs || {};
  const langs = (prefs.languages || []).map((l) => l.toLowerCase());
  const home = prefs.home || null;
  return events
    .map((e) => {
      const reasons = [];
      let score = 0;
      const eventTerms = [...(e.tags || []), ...words(e.title), ...words(e.description)];
      const shared = overlap(terms, eventTerms);
      if (shared.length) {
        score += shared.length * 2;
        reasons.push(`Matches your interest in ${shared.slice(0, 2).join(" and ")}`);
      }
      if (langs.length && (e.languages || []).some((l) => langs.includes(l.toLowerCase()))) {
        score += 1;
        reasons.push("In a language you speak");
      }
      if (prefs.access?.freeOnly && e.cost?.free) {
        score += 1.5;
        reasons.push("Free to attend");
      }
      if (prefs.participation === "online" && e.mode !== "in-person") score += 1.5;
      if (prefs.participation === "in-person" && e.mode !== "online") score += 1;
      if (prefs.access?.freeOnly && !e.cost?.free) score -= 3;
      if (prefs.participation === "online" && e.mode === "in-person") score -= 3;
      if (home && e.location && e.mode !== "online") {
        const km = distanceKm(home, e.location);
        if (km != null && km < 25) {
          score += 1.5;
          reasons.push("Close to your area");
        } else if (km != null && km > 150) score -= 2;
      }
      return { item: e, score, reasons };
    })
    .filter((r) => r.score >= 2 && r.reasons.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function recommendGroups(user, groups, limit = 4) {
  if (!user) return [];
  const terms = userTerms(user);
  return groups
    .map((g) => {
      const shared = overlap(terms, [...(g.tags || []), ...words(g.name), ...words(g.description)]);
      return { item: g, score: shared.length, reasons: shared.length ? [`Shares your interest in ${shared.slice(0, 2).join(" and ")}`] : [] };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

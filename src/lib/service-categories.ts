/**
 * What work did the caller actually want?
 *
 * Nobody asks the agent this directly yet, so this file guesses it from the
 * words the caller used, in `issue_summary` and `vehicle_or_equipment`.
 *
 * **It is a guess, and the screen must always say so.** Two thirds of calls
 * carry no words at all, and a guess dressed up as a fact is worse than no
 * answer. So there are two honest buckets that are never hidden:
 *
 *   - "No words captured" — the caller said nothing to work from.
 *   - "Could not match"   — there were words, but none of the rules fitted.
 *
 * The day `service_category` exists on the agent, that answer wins and this
 * file becomes the fallback for old calls, which will never have it.
 *
 * RULES LAST CHANGED: 2026-09-19. Changing a rule silently rewrites history,
 * because every report re-reads old calls through today's rules. Change the
 * date below whenever a rule changes, and the page will show it.
 */

export const RULES_CHANGED = "2026-09-19";

export type ServiceBucket = {
  id: string;
  /** What a person reads. */
  label: string;
  /** One sentence, for the tooltip and the table. */
  means: string;
  /**
   * Words that put a call in this bucket. Matched whole-word, lower case.
   * Order matters: the first bucket that matches wins, so the list below runs
   * most specific first.
   */
  words: string[];
};

/**
 * The buckets, most specific first.
 *
 * "Stranded" comes before everything because it is the one that changes what
 * somebody does in the next ten minutes, and a stranded caller usually also
 * mentions a battery or a tyre.
 */
export const SERVICE_BUCKETS: ServiceBucket[] = [
  {
    id: "roadside",
    label: "Stuck at the roadside",
    means: "Broken down, stranded, blocking traffic, or needing a tow.",
    words: [
      "stranded", "roadside", "towed", "tow", "towing", "stuck", "blocking",
      "side of the road", "freeway", "highway", "broke down", "broken down",
      "won't move", "wont move", "cannot move",
    ],
  },
  {
    id: "battery",
    label: "Battery or jump start",
    means: "A flat battery, a jump start, or an alternator.",
    words: [
      "battery", "batteries", "jump start", "jumpstart", "jump-start",
      "jumped", "alternator", "no power", "dead battery",
    ],
  },
  {
    id: "wont-start",
    label: "Will not start",
    means: "The engine turns over but will not run, or does nothing at all.",
    words: [
      "won't start", "wont start", "will not start", "no start", "no-start",
      "cranks", "cranking", "turning over", "won't turn over", "wont turn over",
      "starter", "ignition",
    ],
  },
  {
    id: "tyres",
    label: "Tyres or wheels",
    means: "A flat, a blowout, a wheel or a rim.",
    words: [
      "tire", "tires", "tyre", "tyres", "flat", "blowout", "blow out",
      "wheel", "wheels", "rim", "rims", "puncture", "lug",
    ],
  },
  {
    id: "brakes",
    label: "Brakes",
    means: "Brakes, pads, rotors or air brakes.",
    words: [
      "brake", "brakes", "braking", "pads", "rotor", "rotors", "caliper",
      "air brake", "abs",
    ],
  },
  {
    id: "engine",
    label: "Engine or transmission",
    means: "The engine, the gearbox, the clutch, or overheating.",
    words: [
      "engine", "motor", "overheat", "overheating", "coolant", "radiator",
      "transmission", "gearbox", "clutch", "gears", "shifting", "smoking",
      "knocking", "misfire", "head gasket", "turbo",
    ],
  },
  {
    id: "fluids",
    label: "Oil, fluids or a service",
    means: "An oil change, a fluid leak, a filter, or routine servicing.",
    words: [
      "oil", "oil change", "fluid", "fluids", "leak", "leaking", "filter",
      "service", "servicing", "maintenance", "grease", "def",
      // "pm" was here for preventive maintenance and was removed on
      // 2026-09-19: it also matches "call me back at 5 pm", so it put
      // ordinary callbacks in the servicing bucket.
    ],
  },
  {
    id: "electrical",
    label: "Electrics or lights",
    means: "Wiring, lights, sensors or a warning light.",
    words: [
      "electrical", "wiring", "wire", "fuse", "light", "lights", "headlight",
      "sensor", "warning light", "check engine", "dash", "short",
    ],
  },
];

/**
 * How a call was put in its bucket. The screen says which, every time, so
 * nobody mistakes a guess for the agent's own answer.
 */
export type BucketSource = "field" | "words" | "no-words" | "no-match";

export type BucketResult = { id: string; label: string; source: BucketSource };

/** Nothing to work from: the caller said no words this could read. */
export const NO_WORDS: BucketResult = {
  id: "no-words",
  label: "No words captured",
  source: "no-words",
};

/** There were words, but no rule fitted them. */
export const NO_MATCH: BucketResult = {
  id: "no-match",
  label: "Could not match",
  source: "no-match",
};

/**
 * Put one call in a bucket.
 *
 * `fieldValue` is the agent's own `service_category`, once that field exists.
 * When it has a value, it wins outright and no guessing happens. Everything
 * else is a guess from `text`.
 */
export function bucketFor(
  fieldValue: string | undefined,
  text: string,
): BucketResult {
  // Matched without case, and the bucket id is what gets counted. Otherwise
  // "Roadside" and "roadside" become two buckets with two colours and two
  // rows, for one answer. Nobody has agreed the wording of this field yet, so
  // it will arrive in whatever shape the agent writes it.
  const given = (fieldValue ?? "").trim();
  if (given && given.toLowerCase() !== "unknown") {
    const key = given.toLowerCase();
    const known = SERVICE_BUCKETS.find(
      (b) => b.id.toLowerCase() === key || b.label.toLowerCase() === key,
    );
    return {
      id: known?.id ?? key,
      label: known?.label ?? prettyish(given),
      source: "field",
    };
  }

  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9']+/g, " ")} `;
  if (haystack.trim().length === 0) return NO_WORDS;

  for (const bucket of SERVICE_BUCKETS) {
    if (bucket.words.some((w) => haystack.includes(` ${w} `))) {
      return { id: bucket.id, label: bucket.label, source: "words" };
    }
  }
  return NO_MATCH;
}

/** A code we have no wording for, made readable. Never shown as raw. */
function prettyish(code: string): string {
  return code
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function bucketMeans(id: string): string {
  if (id === NO_WORDS.id) {
    return "The caller said nothing we could read, usually because they hung up.";
  }
  if (id === NO_MATCH.id) {
    return "The caller did say something, but it did not match any of our rules.";
  }
  return SERVICE_BUCKETS.find((b) => b.id === id)?.means ?? "";
}

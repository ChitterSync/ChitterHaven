export type UpdateSeverity = "security" | "major" | "minor";
export type UpdateAudience = "all" | "mods" | "admins" | "mobile" | "desktop";

export type UpdateHighlight = {
  text: string;
  severity: UpdateSeverity;
  audience?: UpdateAudience | UpdateAudience[];
};

export type UpdateEntry = {
  version: string;
  releasedAt: string;
  highlights: UpdateHighlight[];
  fullNotesMarkdown?: string;
};

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0-dev";
export const UPDATE_LAST_SEEN_KEY = "update_last_seen_version";

export const UPDATE_FEED: UpdateEntry[] = [
  {
    version: "0.2.2-beta",
    releasedAt: "2026-02-08",
    highlights: [
      {
        text: "User Settings redesign with reliable scrolling, clearer categories, and mobile-safe layouts.",
        severity: "major",
        audience: "all",
      },
      {
        text: "New Connections experience with lock overlay when unlinked and additional account options.",
        severity: "major",
        audience: "all",
      },
      {
        text: "Call UI polish with icons, safer join flow, and microphone availability warnings.",
        severity: "minor",
        audience: "all",
      },
      {
        text: "Context menu refresh for better positioning and readability.",
        severity: "minor",
        audience: "all",
      },
    ],
    fullNotesMarkdown: [
      "## 0.2.2-beta",
      "",
      "- Settings modal now stays within the viewport, with independent scrolling for categories and content.",
      "- New connections gating: unlinked accounts show a lock overlay and a clear prompt.",
      "- Added a Browser settings section to surface permissions and device info.",
      "- Refined global UI styling for checkmarks, sliders, scrollbars, and color pickers.",
      "- Call popups now include icons and a microphone check before joining.",
      "- Context menu updated with improved placement and styling.",
    ].join("\n"),
  },
  {
    version: "0.2.1.1hotfix-beta",
    releasedAt: "2026-01-08",
    highlights: [
      {
        text: "Security hardening for sign-in and session cookies.",
        severity: "security",
        audience: "all",
      },
      {
        text: "Legacy conversion flow cleaned up and made friendlier to use.",
        severity: "minor",
        audience: "all",
      },
      {
        text: "Conversion link now routes directly to the new ChitterSync destination.",
        severity: "minor",
        audience: "all",
      },
    ],
    fullNotesMarkdown: [
      "## Beta Hotfix: 0.2.1.1",
      "",
      "- Hardened sign-in by moving hashing server-side and tightening cookie settings.",
      "- Legacy conversion page now uses the updated flow and landing URL.",
      "- UI polish across the conversion wizard for clearer steps and less clutter.",
    ].join("\n"),
  },
  {
    version: "0.2.1-beta",
    releasedAt: "2026-01-05",
    highlights: [
      {
        text: "Polite update notices that appear only once per version and sync across devices.",
        severity: "major",
        audience: "all",
      },
      {
        text: "Release notes are now available any time from Settings.",
        severity: "minor",
        audience: "all",
      },
      {
        text: "Mobile update panel now tucks into a compact bottom sheet.",
        severity: "minor",
        audience: "mobile",
      },
    ],
    fullNotesMarkdown: [
      "## Update News",
      "",
      "- Update highlights appear once per version and remember dismissals per account.",
      "- Release notes live at `/release-notes` and list full detail.",
      "- Mobile layouts use a compact bottom sheet so the UI never blocks chat.",
    ].join("\n"),
  },
  {
    version: "0.2.0-beta",
    releasedAt: "2025-12-27",
    highlights: [
      {
        text: "ChitterSync integration now keeps settings synced across devices.",
        severity: "major",
        audience: "all",
      },
      {
        text: "New chat styles, custom themes, and privacy controls.",
        severity: "major",
        audience: "all",
      },
      {
        text: "Group DMs and expanded server moderation tooling.",
        severity: "major",
        audience: ["mods", "admins"],
      },
    ],
  },
];

export const getUpdateEntry = (version = APP_VERSION) =>
  UPDATE_FEED.find((entry) => entry.version === version) || null;

const normalizeAudience = (audience?: UpdateHighlight["audience"]) => {
  if (!audience) return ["all"];
  return Array.isArray(audience) ? audience : [audience];
};

export type UpdateAudienceContext = {
  isMobile: boolean;
  isAdmin: boolean;
  isMod: boolean;
};

export const matchesAudience = (highlight: UpdateHighlight, context: UpdateAudienceContext) => {
  const audiences = normalizeAudience(highlight.audience);
  if (audiences.includes("all")) return true;
  if (audiences.includes("mobile") && context.isMobile) return true;
  if (audiences.includes("desktop") && !context.isMobile) return true;
  if (audiences.includes("admins") && context.isAdmin) return true;
  if (audiences.includes("mods") && (context.isMod || context.isAdmin)) return true;
  return false;
};

export const filterHighlightsForAudience = (entry: UpdateEntry, context: UpdateAudienceContext) =>
  entry.highlights.filter((highlight) => matchesAudience(highlight, context));

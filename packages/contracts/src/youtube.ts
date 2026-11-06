// YouTube watch and share links. A returned id means the URL itself is the original video.
// Channel pages, playlist-only links and every non-YouTube URL return null.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const SITE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
]);

/** 11-character video id, or null when `url` is not a YouTube video page. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = decodeURIComponent(parsed.pathname.split("/").filter(Boolean)[0] ?? "");
    return VIDEO_ID.test(id) ? id : null;
  }
  if (!SITE_HOSTS.has(host)) return null;
  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery && VIDEO_ID.test(fromQuery)) return fromQuery;
  const [kind, id] = parsed.pathname.split("/").filter(Boolean);
  if (id && (kind === "embed" || kind === "shorts" || kind === "live" || kind === "v") && VIDEO_ID.test(id)) return id;
  return null;
}

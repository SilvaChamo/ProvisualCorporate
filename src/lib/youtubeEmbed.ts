export function youtubeThumbnail(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export const YOUTUBE_PLAYER_VARS = {
  rel: 0,
  modestbranding: 1,
  controls: 1,
  playsinline: 1,
  iv_load_policy: 3,
  cc_load_policy: 1,
  enablejsapi: 1,
  fs: 1,
  disablekb: 0,
} as const;

export const YOUTUBE_DEFAULT_QUALITY = "hd720" as const;

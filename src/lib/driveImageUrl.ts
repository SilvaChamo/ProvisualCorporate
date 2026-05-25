/** Extrai ID do Google Drive a partir de URL da API local. */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]id=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export type DriveImageSize = "sm" | "md" | "lg" | "full";

const SIZE_PX: Record<Exclude<DriveImageSize, "full">, number> = {
  sm: 400,
  md: 800,
  lg: 1200,
};

/** URL optimizada: thumbnail para exibição, media só quando necessário. */
export function driveDisplayUrl(url: string, size: DriveImageSize = "md"): string {
  if (!url || !url.includes("/api/drive/")) return url;
  const id = extractDriveFileId(url);
  if (!id) return url;
  if (size === "full") {
    return `/api/drive/media?id=${encodeURIComponent(id)}`;
  }
  return `/api/drive/thumbnail?id=${encodeURIComponent(id)}&sz=${SIZE_PX[size]}`;
}

export function preloadDriveImages(urls: string[], size: DriveImageSize = "md") {
  const seen = new Set<string>();
  urls.slice(0, 2).forEach((url) => {
    const optimized = driveDisplayUrl(url, size);
    if (!optimized || seen.has(optimized)) return;
    seen.add(optimized);
    const img = new Image();
    img.decoding = "async";
    img.src = optimized;
  });
}

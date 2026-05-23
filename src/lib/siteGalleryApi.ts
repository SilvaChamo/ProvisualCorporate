import { GALLERY_ALBUMS, type GalleryAlbum } from "./sitePages";
import { getGalleryPhotos } from "./galleryPhotos";
import { mergeHomeContent, type HomeContent } from "./homeContent";

export interface SiteDrivePhoto {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  mimeType?: string;
}

export interface SiteDriveAlbum {
  slug: string;
  name: string;
  folderId: string | null;
  coverUrl: string | null;
  coverDriveId: string | null;
  photoCount: number;
}

const HOME_CACHE_KEY = "provisual_home_content_v2";
const HOME_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface HomeCacheEntry {
  content: HomeContent;
  savedAt: number;
}

function readHomeCache(): HomeContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeCacheEntry;
    if (!parsed?.content || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > HOME_CACHE_TTL_MS) {
      localStorage.removeItem(HOME_CACHE_KEY);
      return null;
    }
    return parsed.content;
  } catch {
    return null;
  }
}

function writeHomeCache(content: HomeContent) {
  if (typeof window === "undefined") return;
  try {
    const entry: HomeCacheEntry = { content, savedAt: Date.now() };
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota or private mode — ignore
  }
}

async function fetchHomeFromApi(): Promise<HomeContent> {
  const res = await fetch("/api/site/home");
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  const merged = mergeHomeContent(data.content);
  writeHomeCache(merged);
  return merged;
}

function mergeAlbumMetadata(driveAlbum: SiteDriveAlbum): GalleryAlbum {
  const meta = GALLERY_ALBUMS.find((a) => a.slug === driveAlbum.slug);
  const cover =
    (driveAlbum.coverDriveId && `/api/drive/media?id=${encodeURIComponent(driveAlbum.coverDriveId)}`) ||
    driveAlbum.coverUrl ||
    meta?.image ||
    "";
  return {
    slug: driveAlbum.slug,
    title: meta?.title || driveAlbum.name,
    subtitle: meta?.subtitle || `${driveAlbum.photoCount} fotos`,
    image: cover,
  };
}

export async function fetchSiteHomeContent(): Promise<HomeContent> {
  const cached = readHomeCache();
  if (cached) {
    fetchHomeFromApi()
      .then((fresh) => {
        writeHomeCache(fresh);
      })
      .catch(() => {});
    return mergeHomeContent(cached);
  }

  try {
    return await fetchHomeFromApi();
  } catch (e) {
    console.warn("Home Drive indisponível, usando dados locais:", e);
    return mergeHomeContent(null);
  }
}

export async function fetchSiteGalleryAlbums(): Promise<GalleryAlbum[]> {
  try {
    const res = await fetch("/api/site/gallery");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const driveAlbums: SiteDriveAlbum[] = data.albums || [];
    const merged = driveAlbums.map(mergeAlbumMetadata);

    for (const staticAlbum of GALLERY_ALBUMS) {
      if (!merged.some((a) => a.slug === staticAlbum.slug)) {
        merged.push(staticAlbum);
      }
    }

    if (merged.length > 0) return merged;
  } catch (e) {
    console.warn("Galeria Drive indisponível, usando dados locais:", e);
  }
  return GALLERY_ALBUMS;
}

export async function fetchSiteGalleryPhotos(slug: string, fallbackCover: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/site/gallery/${encodeURIComponent(slug)}/photos`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const photos: SiteDrivePhoto[] = data.photos || [];
    if (photos.length > 0) {
      return photos.map((p) => p.url);
    }
  } catch (e) {
    console.warn(`Fotos Drive (${slug}) indisponíveis, usando dados locais:`, e);
  }
  return getGalleryPhotos(slug, fallbackCover);
}

export async function uploadSiteMedia(file: File, subpath = ""): Promise<SiteDrivePhoto & { folderId: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("subpath", subpath);

  const res = await fetch("/api/site/media/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao carregar imagem.");
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    mimeType: data.mimeType,
    folderId: data.folderId,
  };
}

export async function fetchSiteLibrary(): Promise<SiteDrivePhoto[]> {
  const res = await fetch("/api/site/library");
  if (!res.ok) throw new Error("Erro ao carregar biblioteca.");
  const data = await res.json();
  return data.photos || [];
}

export async function fetchSiteServiceImages(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/site/services");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.images || {};
  } catch (e) {
    console.warn("Imagens de serviços Drive indisponíveis:", e);
    return {};
  }
}

export function applyDriveServiceImages<T extends { slug: string; image: string }>(
  items: T[],
  images: Record<string, string>,
): T[] {
  return items.map((item) => ({
    ...item,
    image: images[item.slug] || item.image,
  }));
}

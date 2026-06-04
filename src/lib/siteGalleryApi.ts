import { GALLERY_ALBUMS, VIDEO_ITEMS, type GalleryAlbum, type VideoItem } from "./sitePages";
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
  title?: string;
  subtitle?: string;
  image?: string;
  folderId: string | null;
  coverUrl: string | null;
  coverDriveId: string | null;
  photoCount: number;
}

const HOME_CACHE_KEY = "provisual_home_content_v4";
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
  const coverFromDrive =
    driveAlbum.image ||
    (driveAlbum.coverDriveId &&
      `/api/drive/thumbnail?id=${encodeURIComponent(driveAlbum.coverDriveId)}&sz=800`) ||
    (driveAlbum.coverUrl?.includes("/api/drive/") ? driveAlbum.coverUrl : "") ||
    "";
  return {
    slug: driveAlbum.slug,
    title: driveAlbum.title || meta?.title || driveAlbum.name,
    subtitle: driveAlbum.subtitle || meta?.subtitle || `${driveAlbum.photoCount} fotos`,
    image: coverFromDrive,
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

export async function fetchSiteGalleryAlbums(options?: { resync?: boolean }): Promise<GalleryAlbum[]> {
  try {
    if (options?.resync) {
      try {
        await syncSiteGalleryMeta();
      } catch (syncErr) {
        console.warn("Sync galeria falhou:", syncErr);
      }
    }

    const res = await fetch("/api/site/gallery", { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const driveAlbums: SiteDriveAlbum[] = data.albums || [];
    if (driveAlbums.length > 0) {
      return driveAlbums.map(mergeAlbumMetadata);
    }

    if (!options?.resync) {
      return fetchSiteGalleryAlbums({ resync: true });
    }
  } catch (e) {
    console.warn("Galeria Drive indisponível, usando dados locais:", e);
  }

  if (import.meta.env.DEV) {
    return GALLERY_ALBUMS;
  }

  return GALLERY_ALBUMS.map((album) => ({
    ...album,
    image: album.image?.includes("/api/drive/") ? album.image : "",
  }));
}

export async function syncSiteGalleryMeta(): Promise<GalleryAlbum[]> {
  const res = await fetch("/api/site/gallery/sync-meta", { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao sincronizar galeria.");
  }
  const data = await res.json();
  return (data.albums || []).map(mergeAlbumMetadata);
}

function localGalleryPhotos(slug: string, fallbackCover: string): SiteDrivePhoto[] {
  return getGalleryPhotos(slug, fallbackCover).map((url, index) => ({
    id: `local-${slug}-${index}`,
    name: url.split("/").pop() || `foto-${index + 1}.jpg`,
    url,
    thumbnailUrl: url,
  }));
}

export async function fetchSiteGalleryPhotos(slug: string, fallbackCover: string): Promise<SiteDrivePhoto[]> {
  try {
    const res = await fetch(`/api/site/gallery/${encodeURIComponent(slug)}/photos`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const photos: SiteDrivePhoto[] = data.photos || [];
    if (photos.length > 0) {
      return photos;
    }
  } catch (e) {
    console.warn(`Fotos Drive (${slug}) indisponíveis, usando dados locais:`, e);
  }

  if (import.meta.env.DEV) {
    return localGalleryPhotos(slug, fallbackCover);
  }

  if (fallbackCover && fallbackCover.includes("/api/drive/")) {
    return [{
      id: "cover",
      name: "capa.jpg",
      url: fallbackCover,
      thumbnailUrl: fallbackCover,
    }];
  }

  return [];
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

export async function fetchAdminGalleryAlbums(): Promise<SiteDriveAlbum[]> {
  const res = await fetch("/api/site/gallery?summary=1", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || data.message;
    if (message === "invalid_grant") {
      throw new Error(
        "Ligação ao Google Drive expirou. Reconecte em Google Drive → Conectar e actualize esta página.",
      );
    }
    throw new Error(message || "Erro ao carregar álbuns.");
  }
  return data.albums || [];
}

export async function createGalleryAlbum(payload: {
  title: string;
  subtitle: string;
  cover: File;
  photos: File[];
}): Promise<SiteDriveAlbum> {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("subtitle", payload.subtitle);
  form.append("cover", payload.cover);
  payload.photos.forEach((photo) => form.append("photos", photo));

  const res = await fetch("/api/site/gallery/albums", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao criar álbum.");
  }
  const data = await res.json();
  return data.album;
}

export async function fetchAdminGalleryPhotos(slug: string): Promise<SiteDrivePhoto[]> {
  const res = await fetch(`/api/site/gallery/${encodeURIComponent(slug)}/photos`);
  if (!res.ok) throw new Error("Erro ao carregar fotos do álbum.");
  const data = await res.json();
  return data.photos || [];
}

export async function updateGalleryAlbum(
  slug: string,
  payload: {
    title: string;
    subtitle: string;
    cover?: File | null;
    photos: File[];
    deletedPhotoIds?: string[];
  },
): Promise<SiteDriveAlbum> {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("subtitle", payload.subtitle);
  if (payload.cover) form.append("cover", payload.cover);
  payload.photos.forEach((photo) => form.append("photos", photo));
  if (payload.deletedPhotoIds?.length) {
    form.append("deletedPhotoIds", JSON.stringify(payload.deletedPhotoIds));
  }

  const res = await fetch(`/api/site/gallery/albums/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao atualizar álbum.");
  }
  const data = await res.json();
  return data.album;
}

export async function deleteGalleryAlbum(slug: string): Promise<void> {
  const res = await fetch(`/api/site/gallery/albums/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao eliminar álbum.");
  }
}

export async function fetchSiteVideos(): Promise<VideoItem[]> {
  try {
    const res = await fetch("/api/site/videos", { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (Array.isArray(data.videos)) return data.videos;
  } catch (e) {
    console.warn("Vídeos do site indisponíveis, usando dados locais:", e);
  }
  return VIDEO_ITEMS;
}

export async function fetchAdminSiteVideos(): Promise<VideoItem[]> {
  const res = await fetch("/api/site/videos", { cache: "no-store" });
  if (!res.ok) throw new Error("Erro ao carregar vídeos.");
  const data = await res.json();
  return data.videos || [];
}

export async function addSiteVideo(title: string, url: string): Promise<VideoItem[]> {
  const res = await fetch("/api/site/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao adicionar vídeo.");
  }
  const data = await res.json();
  return data.videos || [];
}

export async function deleteSiteVideo(slug: string): Promise<VideoItem[]> {
  const res = await fetch(`/api/site/videos/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao eliminar vídeo.");
  }
  const data = await res.json();
  return data.videos || [];
}

export async function updateSiteVideo(slug: string, title: string, url: string): Promise<VideoItem[]> {
  const res = await fetch("/api/site/videos", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ slug, title, url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao atualizar vídeo.");
  }
  const data = await res.json();
  return data.videos || [];
}

export async function fetchAdminAccounts(): Promise<any[]> {
  const res = await fetch("/api/admin/accounts");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao carregar contas.");
  }
  const data = await res.json();
  return (data.accounts || []).map(mapAccountRow);
}

function mapAccountRow(row: any) {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    role: row.role || "cliente",
    displayName: row.display_name || row.displayName || "",
    clientId: row.client_id || row.clientId || row.id,
  };
}

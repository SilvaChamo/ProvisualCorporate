import { Readable } from "stream";

const SITE_FOLDER_SETTINGS_KEY = "site_drive_folder_id";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export function slugifyName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isDriveFolder(file) {
  return file?.mimeType === FOLDER_MIME;
}

export function isDriveImage(file) {
  if (!file) return false;
  if (file.mimeType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name || "");
}

export function driveMediaUrl(fileId) {
  return `/api/drive/media?id=${encodeURIComponent(fileId)}`;
}

export function driveThumbUrl(fileId) {
  return `/api/drive/thumbnail?id=${encodeURIComponent(fileId)}`;
}

export async function listAllDriveFiles(drive, queryStr, orderByStr = "folder,name,createdTime") {
  const allFiles = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: queryStr,
      orderBy: orderByStr,
      fields:
        "nextPageToken, files(id, name, mimeType, webViewLink, size, thumbnailLink, createdTime, shortcutDetails, starred, trashed)",
      pageSize: 1000,
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    if (response.data.files?.length) {
      allFiles.push(...response.data.files);
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return allFiles.filter((f) => !f.trashed);
}

export async function listFolderChildren(drive, folderId) {
  const parent = folderId && folderId !== "root" ? folderId : "root";
  const queryStr =
    parent === "root"
      ? "('root' in parents or sharedWithMe = true) and trashed = false"
      : `'${parent}' in parents and trashed = false`;
  return listAllDriveFiles(drive, queryStr);
}

export async function findFolderByName(drive, parentId, folderName) {
  const children = await listFolderChildren(drive, parentId);
  const target = folderName.toLowerCase();
  return children.find((f) => isDriveFolder(f) && f.name?.toLowerCase() === target) || null;
}

export async function findOrCreateFolder(drive, parentId, folderName) {
  const existing = await findFolderByName(drive, parentId, folderName);
  if (existing) return existing;

  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: FOLDER_MIME,
      parents: parentId && parentId !== "root" ? [parentId] : undefined,
    },
    fields: "id, name, mimeType",
    supportsAllDrives: true,
  });

  return response.data;
}

async function readCachedSiteFolderId(supabase) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", SITE_FOLDER_SETTINGS_KEY)
      .single();
    if (!error && data?.value?.folderId) return data.value.folderId;
  } catch (_) {}
  return null;
}

async function cacheSiteFolderId(supabase, folderId) {
  if (!supabase || !folderId) return;
  try {
    await supabase.from("settings").upsert({
      key: SITE_FOLDER_SETTINGS_KEY,
      value: { folderId, updatedAt: new Date().toISOString() },
    });
  } catch (_) {}
}

/** Resolve a pasta de conteúdo do site (My Drive > Site, primeiro nível). */
export async function getSiteContentFolderId(drive, supabase, { refresh = false } = {}) {
  if (!refresh) {
    const cached = await readCachedSiteFolderId(supabase);
    if (cached) return cached;
  }

  const rootChildren = await listFolderChildren(drive, "root");
  let siteFolder = rootChildren.find(
    (f) => isDriveFolder(f) && f.name?.toLowerCase() === "site",
  );

  if (!siteFolder) {
    siteFolder = await findOrCreateFolder(drive, "root", "site");
  }

  await cacheSiteFolderId(supabase, siteFolder.id);
  return siteFolder.id;
}

export async function moveDriveItem(drive, fileId, newParentId, oldParentId) {
  await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: oldParentId,
    supportsAllDrives: true,
    fields: "id, parents",
  });
}

/** Move recursivamente o conteúdo de uma subpasta para o destino (mescla pastas homónimas). */
export async function mergeFolderContents(drive, sourceFolderId, destFolderId) {
  const children = await listFolderChildren(drive, sourceFolderId);
  for (const child of children) {
    if (isDriveFolder(child)) {
      const destSub = await findOrCreateFolder(drive, destFolderId, child.name);
      await mergeFolderContents(drive, child.id, destSub.id);
      try {
        await drive.files.update({
          fileId: child.id,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
      } catch (_) {}
    } else {
      await moveDriveItem(drive, child.id, destFolderId, sourceFolderId);
    }
  }
}

export async function resolveSiteSubfolderId(drive, supabase, subpath = "") {
  const siteId = await getSiteContentFolderId(drive, supabase);
  if (!subpath) return siteId;

  const parts = subpath.split("/").filter(Boolean);
  let currentId = siteId;
  for (const part of parts) {
    const folder = await findOrCreateFolder(drive, currentId, part);
    currentId = folder.id;
  }
  return currentId;
}

export function mapDrivePhoto(file) {
  return {
    id: file.id,
    name: file.name,
    url: driveMediaUrl(file.id),
    thumbnailUrl: driveThumbUrl(file.id),
    mimeType: file.mimeType,
  };
}

export async function listSiteLibraryPhotos(drive, supabase) {
  const siteId = await getSiteContentFolderId(drive, supabase);
  const files = await listFolderChildren(drive, siteId);
  return files.filter(isDriveImage).map(mapDrivePhoto);
}

export async function listSiteGalleryAlbums(drive, supabase) {
  const siteId = await getSiteContentFolderId(drive, supabase);
  const galeriaFolder = await findFolderByName(drive, siteId, "galeria");

  if (!galeriaFolder) {
    const library = await listSiteLibraryPhotos(drive, supabase);
    if (!library.length) return { siteFolderId: siteId, albums: [] };
    return {
      siteFolderId: siteId,
      albums: [
        {
          slug: "biblioteca",
          name: "Biblioteca",
          folderId: siteId,
          coverUrl: library[0].thumbnailUrl,
          coverDriveId: library[0].id,
          photoCount: library.length,
        },
      ],
    };
  }

  const albumFolders = (await listFolderChildren(drive, galeriaFolder.id)).filter(isDriveFolder);
  const albums = [];

  for (const folder of albumFolders) {
    const photos = (await listFolderChildren(drive, folder.id)).filter(isDriveImage);
    const coverPhoto =
      photos.find((p) => /^cover\./i.test(p.name || "")) ||
      photos.find((p) => /cover/i.test(p.name || "")) ||
      photos[0];
    albums.push({
      slug: slugifyName(folder.name),
      name: folder.name,
      folderId: folder.id,
      coverUrl: coverPhoto ? driveThumbUrl(coverPhoto.id) : null,
      coverDriveId: coverPhoto?.id || null,
      photoCount: photos.length,
    });
  }

  return { siteFolderId: siteId, galeriaFolderId: galeriaFolder.id, albums };
}

function guessMimeType(filename) {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
}

/** Carrega ficheiro para uma subpasta do site (ex: home, galeria/mmec, servicos/branding-design). */
export async function uploadFileToSiteFolder(
  drive,
  supabase,
  subpath,
  filename,
  buffer,
  mimeType,
  { skipIfExists = true } = {},
) {
  const folderId = await resolveSiteSubfolderId(drive, supabase, subpath);
  const children = await listFolderChildren(drive, folderId);
  const existing = children.find((f) => f.name === filename);

  if (existing && skipIfExists) {
    return { id: existing.id, url: driveMediaUrl(existing.id), skipped: true };
  }

  const bufferStream = new Readable();
  bufferStream.push(buffer);
  bufferStream.push(null);

  const response = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: mimeType || guessMimeType(filename), body: bufferStream },
    supportsAllDrives: true,
    fields: "id, name, mimeType",
  });

  return {
    id: response.data.id,
    url: driveMediaUrl(response.data.id),
    skipped: false,
  };
}

export async function listSiteServiceImages(drive, supabase) {
  const siteId = await getSiteContentFolderId(drive, supabase);
  const servicosFolder = await findFolderByName(drive, siteId, "servicos");
  if (!servicosFolder) return {};

  const map = {};
  const children = await listFolderChildren(drive, servicosFolder.id);

  for (const child of children) {
    if (isDriveImage(child)) {
      const slug = slugifyName(child.name.replace(/\.[^.]+$/, ""));
      map[slug] = driveMediaUrl(child.id);
      continue;
    }
    if (!isDriveFolder(child)) continue;

    const slug = slugifyName(child.name);
    const photos = (await listFolderChildren(drive, child.id)).filter(isDriveImage);
    const cover =
      photos.find((p) => /^cover\./i.test(p.name || "")) ||
      photos.find((p) => /cover/i.test(p.name || "")) ||
      photos[0];
    if (cover) map[slug] = driveMediaUrl(cover.id);
  }

  return map;
}

/** Indexa todas as imagens em site/ (recursivo) por nome de ficheiro. */
let siteImageIndexCache = { map: null, expires: 0, loading: null };
const SITE_INDEX_TTL_MS = 10 * 60 * 1000;

export async function buildSiteImageIndex(drive, supabase) {
  if (siteImageIndexCache.map && Date.now() < siteImageIndexCache.expires) {
    return siteImageIndexCache.map;
  }
  if (siteImageIndexCache.loading) return siteImageIndexCache.loading;

  siteImageIndexCache.loading = (async () => {
    const siteId = await getSiteContentFolderId(drive, supabase);
    const index = new Map();

    async function scanFolder(folderId) {
      const children = await listFolderChildren(drive, folderId);
      for (const child of children) {
        if (isDriveImage(child)) {
          const key = (child.name || "").toLowerCase();
          if (!index.has(key)) index.set(key, driveMediaUrl(child.id));
        } else if (isDriveFolder(child)) {
          await scanFolder(child.id);
        }
      }
    }

    await scanFolder(siteId);
    siteImageIndexCache.map = index;
    siteImageIndexCache.expires = Date.now() + SITE_INDEX_TTL_MS;
    siteImageIndexCache.loading = null;
    return index;
  })().catch((err) => {
    siteImageIndexCache.loading = null;
    throw err;
  });

  return siteImageIndexCache.loading;
}

export function resolveSiteImageUrl(url, index) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("/api/drive/") || /^https?:\/\//i.test(url)) return url;
  const basename = decodeURIComponent(url.split("/").pop() || "").toLowerCase();
  return index.get(basename) || null;
}

const HOME_DEFAULT_FILES = {
  heroBackground: "coberturas.jpg",
  aboutImage: "sobre.webp",
  processBackground: "producao-grafica.webp",
  teamBanner: "coberturas.jpg",
  slides: ["mmec40-scaled.jpg", "paineis5-scaled.jpg", "coberturas.jpg", "comunidade.jpg"],
  team: [
    "designer-gráfico-africano-criativo-no-flipchart-com-gráficos-e-notas-adesivas-187855551.webp",
    "designer-gráfico-africano-web-usando-software-de-edição-design-212684276.webp",
    "comunidade.jpg",
    "coberturas.jpg",
  ],
};

function pickImage(url, fallbackFile, index) {
  return resolveSiteImageUrl(url, index) || index.get(fallbackFile.toLowerCase()) || url || null;
}

/** True quando ainda existem caminhos /INICIO/ ou URLs por resolver. */
export function homeContentNeedsDriveResolve(content) {
  if (!content || typeof content !== "object") return true;

  const urls = [
    content.hero?.backgroundImage,
    content.aboutImage,
    content.processBackground,
    content.teamBanner,
    ...(content.slides || []).map((slide) => slide?.image),
    ...(content.teamMembers || []).map((member) => member?.image),
  ];

  return urls.some((url) => {
    if (!url || typeof url !== "string") return false;
    if (url.startsWith("/api/drive/") || /^https?:\/\//i.test(url)) return false;
    return true;
  });
}

/** Substitui caminhos /INICIO/ por URLs do Drive na homepage. */
export async function resolveHomeContentImages(drive, supabase, content) {
  const base = content && typeof content === "object" ? content : {};

  if (!homeContentNeedsDriveResolve(base)) {
    return base;
  }

  const index = await buildSiteImageIndex(drive, supabase);

  const hero = { ...(base.hero || {}) };
  hero.backgroundImage = pickImage(
    hero.backgroundImage,
    HOME_DEFAULT_FILES.heroBackground,
    index,
  );

  const slides = (base.slides?.length ? base.slides : HOME_DEFAULT_FILES.slides.map(() => ({}))).map(
    (slide, i) => ({
      ...slide,
      image: pickImage(slide.image, HOME_DEFAULT_FILES.slides[i] || "", index),
    }),
  );

  const teamMembers = (
    base.teamMembers?.length ? base.teamMembers : HOME_DEFAULT_FILES.team.map(() => ({}))
  ).map((member, i) => ({
    ...member,
    image: pickImage(member.image, HOME_DEFAULT_FILES.team[i] || "", index),
  }));

  return {
    ...base,
    hero,
    slides,
    aboutImage: pickImage(base.aboutImage, HOME_DEFAULT_FILES.aboutImage, index),
    processBackground: pickImage(
      base.processBackground,
      HOME_DEFAULT_FILES.processBackground,
      index,
    ),
    teamBanner: pickImage(base.teamBanner, HOME_DEFAULT_FILES.teamBanner, index),
    teamMembers,
  };
}

export async function listSiteGalleryAlbumPhotos(drive, supabase, slug) {
  const siteId = await getSiteContentFolderId(drive, supabase);

  if (slug === "biblioteca") {
    const photos = await listSiteLibraryPhotos(drive, supabase);
    return { slug, folderId: siteId, photos };
  }

  const galeriaFolder = await findOrCreateFolder(drive, siteId, "galeria");
  const albumFolders = (await listFolderChildren(drive, galeriaFolder.id)).filter(isDriveFolder);
  const albumFolder =
    albumFolders.find((f) => slugifyName(f.name) === slug) ||
    albumFolders.find((f) => f.name?.toLowerCase() === slug.toLowerCase());

  if (!albumFolder) {
    return { slug, folderId: null, photos: [] };
  }

  const photos = (await listFolderChildren(drive, albumFolder.id))
    .filter(isDriveImage)
    .map(mapDrivePhoto);

  return { slug, folderId: albumFolder.id, photos };
}

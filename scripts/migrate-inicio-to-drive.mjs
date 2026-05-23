/**
 * Migra imagens locais de INICIO/ para Google Drive (pasta site/) e actualiza home no Supabase.
 * Uso: node scripts/migrate-inicio-to-drive.mjs
 */
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import {
  uploadFileToSiteFolder,
} from "../lib/siteDriveHelpers.js";

const ROOT = process.cwd();
const SUPABASE_URL = "https://gwankhxcbkrtgxopbxwd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YW5raHhjYmtydGd4b3BieHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjY2NzUsImV4cCI6MjA4NTgwMjY3NX0.Wmx16vE2PQBuuyCT0wWrLQTDemMufo2VJeM5NF9IfcY";
const HOME_CONTENT_KEY = "home_page_content";

const GALLERY_ALBUMS = [
  { slug: "autoridade-tributaria", dir: "autoridade-tributaria", cover: "autoridade-tributaria.jpg" },
  { slug: "construcao-obras", dir: "construcao-obras", cover: "construcao-quitunda.jpg" },
  { slug: "mmec", dir: "mmec", cover: "mmec.jpg" },
  { slug: "gmt", dir: "gmt", cover: "gmt.jpg" },
  { slug: "agricultura", dir: "agricultura", cover: "agricultura-machambas.jpg" },
];

const SERVICE_IMAGES = [
  { slug: "publicidade-marketing", file: "PAINEIS5-scaled.jpg" },
  { slug: "branding-design", file: "designer-gráfico-africano-criativo-no-flipchart-com-gráficos-e-notas-adesivas-187855551.webp" },
  { slug: "fotografia-videografia", file: "MMEC40-scaled.jpg" },
  { slug: "servicos-informaticos", file: "designer-gráfico-africano-web-usando-software-de-edição-design-212684276.webp" },
  { slug: "consultorias", file: "Coberturas.jpg" },
  { slug: "outros-servicos", file: "COmunidade.jpg" },
];

function guessMime(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
}

function resolveLocal(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (fs.existsSync(full)) return full;
  const dir = path.dirname(full);
  const base = path.basename(full);
  if (!fs.existsSync(dir)) return null;
  const match = fs.readdirSync(dir).find((f) => f === base || decodeURIComponent(f) === base);
  return match ? path.join(dir, match) : null;
}

async function uploadLocal(drive, supabase, localRelative, subpath, remoteName) {
  const localPath = resolveLocal(localRelative);
  if (!localPath) {
    console.warn(`  missing: ${localRelative}`);
    return null;
  }
  const buffer = fs.readFileSync(localPath);
  const name = remoteName || path.basename(localPath);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const result = await uploadFileToSiteFolder(
        drive,
        supabase,
        subpath,
        name,
        buffer,
        guessMime(name),
      );
      console.log(`  ${result.skipped ? "exists" : "uploaded"}: site/${subpath}/${name}`);
      await new Promise((r) => setTimeout(r, 300));
      return result.url;
    } catch (err) {
      if (attempt === 4) throw err;
      console.warn(`  retry ${attempt}/4: ${subpath}/${name}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
}

async function uploadDirectory(drive, supabase, localDir, subpath) {
  const dirPath = path.join(ROOT, localDir);
  if (!fs.existsSync(dirPath)) {
    console.warn(`  dir missing: ${localDir}`);
    return;
  }
  const files = fs.readdirSync(dirPath).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(dirPath, file));
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await uploadFileToSiteFolder(drive, supabase, subpath, file, buffer, guessMime(file));
        console.log(`  uploaded: site/${subpath}/${file}`);
        await new Promise((r) => setTimeout(r, 300));
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        console.warn(`  retry ${attempt}/4: ${subpath}/${file}`);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
}

async function getGoogleAuth() {
  const oauthKeys = JSON.parse(fs.readFileSync(path.join(ROOT, "google-oauth.json"), "utf-8"));
  const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "google-tokens.json"), "utf-8"));
  const oauth2Client = new google.auth.OAuth2(
    oauthKeys.client_id,
    oauthKeys.client_secret,
    "http://localhost:3333/api/drive/auth/callback",
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

async function main() {
  console.log("A migrar imagens INICIO/ → Google Drive (site/)...\n");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const auth = await getGoogleAuth();
  const drive = google.drive({ version: "v3", auth });

  console.log("— Galeria —");
  for (const album of GALLERY_ALBUMS) {
    await uploadLocal(
      drive,
      supabase,
      `INICIO/galeria/${album.cover}`,
      `galeria/${album.slug}`,
      "cover.jpg",
    );
    await uploadDirectory(drive, supabase, `INICIO/galeria/${album.dir}`, `galeria/${album.slug}`);
  }

  console.log("\n— Serviços —");
  for (const svc of SERVICE_IMAGES) {
    await uploadLocal(drive, supabase, `INICIO/${svc.file}`, `servicos/${svc.slug}`, "cover.jpg");
  }

  console.log("\n— Homepage —");
  const aboutImage = await uploadLocal(drive, supabase, "INICIO/sobre.webp", "home", "sobre.webp");
  const processBackground = await uploadLocal(
    drive,
    supabase,
    "INICIO/producao-grafica.webp",
    "home",
    "producao-grafica.webp",
  );
  const teamBanner = await uploadLocal(drive, supabase, "INICIO/Coberturas.jpg", "home", "coberturas.jpg");
  const heroBg = await uploadLocal(drive, supabase, "INICIO/Coberturas.jpg", "hero", "coberturas.jpg");

  const slideFiles = [
    "MMEC40-scaled.jpg",
    "PAINEIS5-scaled.jpg",
    "Coberturas.jpg",
    "COmunidade.jpg",
  ];
  const slideUrls = [];
  for (const file of slideFiles) {
    const url = await uploadLocal(drive, supabase, `INICIO/${file}`, "hero", file);
    if (url) slideUrls.push(url);
  }

  const teamFiles = [
    "designer-gráfico-africano-criativo-no-flipchart-com-gráficos-e-notas-adesivas-187855551.webp",
    "designer-gráfico-africano-web-usando-software-de-edição-design-212684276.webp",
    "COmunidade.jpg",
    "Coberturas.jpg",
  ];
  const teamUrls = [];
  for (const file of teamFiles) {
    const url = await uploadLocal(drive, supabase, `INICIO/${file}`, "home/equipa", file);
    if (url) teamUrls.push(url);
  }

  const { data: existing } = await supabase
    .from("settings")
    .select("value")
    .eq("key", HOME_CONTENT_KEY)
    .single();

  const base = existing?.value || {};

  const defaultSlides = [
    {
      category: "FOTOS CORPORATIVAS",
      title: "Presença, Estilo e Identidade",
      subtitle: "Gestão visual que reforça a imagem da sua organização.",
      image: slideUrls[0],
    },
    {
      category: "VÍDEOS PUBLICITÁRIOS",
      title: "Marca, Visibilidade e Confiança",
      subtitle: "Comunicação estratégica para destacar-se no mercado.",
      image: slideUrls[1],
    },
    {
      category: "VÍDEOS INSTITUCIONAIS",
      title: "Informação, Promoção e Vida",
      subtitle: "Conteúdos que conectam a sua marca ao público certo.",
      image: slideUrls[2],
    },
    {
      category: "DOCUMENTÁRIOS",
      title: "Factos, histórias e arte",
      subtitle: "Produção criativa com impacto e narrativa autêntica.",
      image: slideUrls[3],
    },
  ];

  const defaultTeam = [
    {
      name: "Ana Mabunda",
      role: "Directora Criativa",
      image: teamUrls[0],
      social: {
        facebook: "https://www.facebook.com/profile.php?id=61577619669570",
        linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
        instagram: "https://www.instagram.com/",
      },
    },
    {
      name: "Carlos Nhaca",
      role: "Director de Produção",
      image: teamUrls[1],
      social: {
        facebook: "https://www.facebook.com/profile.php?id=61577619669570",
        linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
        instagram: "https://www.instagram.com/",
      },
    },
    {
      name: "Sofia Matola",
      role: "Gestora de Projectos",
      image: teamUrls[2],
      social: {
        facebook: "https://www.facebook.com/profile.php?id=61577619669570",
        linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
        instagram: "https://www.instagram.com/",
      },
    },
    {
      name: "Miguel Tembe",
      role: "Especialista Audiovisual",
      image: teamUrls[3],
      social: {
        facebook: "https://www.facebook.com/profile.php?id=61577619669570",
        linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
        instagram: "https://www.instagram.com/",
      },
    },
  ];

  const homeContent = {
    ...base,
    hero: {
      ...(base.hero || {}),
      backgroundImage: heroBg || base.hero?.backgroundImage,
    },
    slides: base.slides?.length
      ? base.slides.map((slide, i) => ({ ...slide, image: slideUrls[i] || slide.image }))
      : defaultSlides,
    aboutImage: aboutImage || base.aboutImage,
    processBackground: processBackground || base.processBackground,
    teamBanner: teamBanner || base.teamBanner,
    teamMembers: base.teamMembers?.length
      ? base.teamMembers.map((m, i) => ({ ...m, image: teamUrls[i] || m.image }))
      : defaultTeam,
  };

  await supabase.from("settings").upsert({ key: HOME_CONTENT_KEY, value: homeContent });
  console.log("\n✓ Conteúdo da homepage actualizado no Supabase com URLs do Drive.");
  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

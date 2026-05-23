import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { Readable } from "stream";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import {
  getSiteContentFolderId,
  listSiteGalleryAlbums,
  listSiteGalleryAlbumPhotos,
  listSiteLibraryPhotos,
  listSiteServiceImages,
  resolveSiteSubfolderId,
  driveMediaUrl,
  resolveHomeContentImages,
} from "../lib/siteDriveHelpers.js";

function loadOAuthKeys() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  const candidates = [
    path.join(process.cwd(), "google-oauth.json"),
    path.join(process.cwd(), "..", "google-oauth.json"),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (_) {}
  }
  return null;
}

function loadServiceKeys() {
  if (process.env.GOOGLE_KEYS) {
    try {
      return JSON.parse(process.env.GOOGLE_KEYS);
    } catch (_) {}
  }
  const candidates = [
    path.join(process.cwd(), "provisual-corporate-a16cee3d2250.json"),
    path.join(process.cwd(), "..", "provisual-corporate-a16cee3d2250.json"),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (_) {}
  }
  return null;
}

const oauthKeys = loadOAuthKeys();
const serviceKeys = loadServiceKeys();

const app = express();
app.use(express.json());

// Inicializar Supabase para sincronização resiliente de tokens do Google Drive (Vercel Resiliência)
const SUPABASE_URL = "https://gwankhxcbkrtgxopbxwd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YW5raHhjYmtydGd4b3BieHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjY2NzUsImV4cCI6MjA4NTgwMjY3NX0.Wmx16vE2PQBuuyCT0wWrLQTDemMufo2VJeM5NF9IfcY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase inicializado no backend (Vercel API)!");

// Google Drive Integration
const upload = multer({ storage: multer.memoryStorage() });

// Utilitário para inicializar o cliente Google Auth (Híbrido)
async function getGoogleAuth() {
  
  const localTokensPath = path.join(process.cwd(), "google-tokens.json");

  // Se tivermos as credenciais OAuth do Silva
  if (oauthKeys && oauthKeys.client_id && oauthKeys.client_secret && !String(oauthKeys.client_id).includes("COLE_AQUI")) {
    try {
      let tokens = null;
      
      // Se existir localmente no disco (cache temporário da Vercel)
      if (fs.existsSync(localTokensPath)) {
        try {
          tokens = JSON.parse(fs.readFileSync(localTokensPath, "utf-8"));
        } catch (e) {}
      }
      
      // Se não estiver no disco local, recuperamos do Supabase (resiliência no Vercel)
      if (!tokens) {
        try {
          const { data, error } = await supabase.from('settings').select('value').eq('key', 'google_drive_tokens').single();
          if (!error && data && data.value) {
            tokens = data.value;
            // Salva localmente em cache temporário de arquivo na Vercel se possível
            try {
              fs.writeFileSync(localTokensPath, JSON.stringify(tokens, null, 2));
            } catch (e) {}
            console.log("Tokens do Google Drive recuperados com sucesso do Supabase (Vercel).");
          }
        } catch (dbErr) {
          console.warn("Erro ao buscar tokens do Supabase no Vercel:", dbErr);
        }
      }

      if (tokens) {
        const oauth2Client = new google.auth.OAuth2(
          oauthKeys.client_id,
          oauthKeys.client_secret,
          "http://localhost:3333/api/drive/auth/callback"
        );
        oauth2Client.setCredentials(tokens);
        
        // Listener para atualizar tokens automaticamente se expirarem
        oauth2Client.on('tokens', async (newTokens) => {
          try {
            let currentTokens = {};
            if (fs.existsSync(localTokensPath)) {
              try {
                currentTokens = JSON.parse(fs.readFileSync(localTokensPath, "utf-8"));
              } catch (e) {}
            }
            const mergedTokens = { ...currentTokens, ...newTokens };
            
            try {
              fs.writeFileSync(localTokensPath, JSON.stringify(mergedTokens, null, 2));
            } catch (e) {}

            try {
              await supabase.from('settings').upsert({ key: 'google_drive_tokens', value: mergedTokens });
              console.log("Tokens atualizados e salvos no Supabase do Vercel.");
            } catch (dbErr) {
              console.error("Erro ao atualizar tokens no Supabase do Vercel:", dbErr);
            }
            console.log("Tokens atualizados e salvos no Firestore do Vercel.");
          } catch (e) {
            console.error("Erro ao salvar tokens atualizados:", e);
          }
        });

        return { auth: oauth2Client, type: "oauth2" };
      }
    } catch (err) {
      console.warn("Erro ao configurar cliente OAuth2 pessoal no Vercel, fazendo fallback para Conta de Serviço:", err);
    }
  }

  // 2. Fallback: Usar a Conta de Serviço padrão que agora está 100% bundled estaticamente
  if (serviceKeys && serviceKeys.client_email && serviceKeys.private_key) {
    const auth = new google.auth.JWT({
      email: serviceKeys.client_email,
      key: serviceKeys.private_key,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    return { auth, type: "service_account" };
  }

  throw new Error("Credenciais do Google Drive não configuradas. Por favor conecte o Drive na interface do console.");
}

// ----------------- ROTAS DA API -----------------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: "vercel-serverless", timestamp: new Date().toISOString() });
});

const HOME_CONTENT_KEY = "home_page_content";

app.get("/api/site/home", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", HOME_CONTENT_KEY)
      .single();
    if (error && error.code !== "PGRST116") throw error;

    let content = data?.value ?? null;
    try {
      const { auth } = await getGoogleAuth();
      const drive = google.drive({ version: "v3", auth });
      content = await resolveHomeContentImages(drive, supabase, content);
    } catch (driveErr) {
      console.warn("Home Drive image resolve skipped:", driveErr);
    }

    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao carregar conteúdo da home." });
  }
});

app.put("/api/site/home", async (req, res) => {
  try {
    const content = req.body?.content;
    if (!content || typeof content !== "object") {
      return res.status(400).json({ error: "Conteúdo inválido." });
    }
    const { error } = await supabase
      .from("settings")
      .upsert({ key: HOME_CONTENT_KEY, value: content });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao guardar conteúdo da home." });
  }
});

app.get("/api/site/gallery", async (_req, res) => {
  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const data = await listSiteGalleryAlbums(drive, supabase);
    res.json(data);
  } catch (err) {
    console.error("Site gallery list error:", err);
    res.status(500).json({ error: err.message || "Erro ao listar galeria do site." });
  }
});

app.get("/api/site/gallery/:slug/photos", async (req, res) => {
  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const data = await listSiteGalleryAlbumPhotos(drive, supabase, req.params.slug);
    res.json(data);
  } catch (err) {
    console.error("Site gallery photos error:", err);
    res.status(500).json({ error: err.message || "Erro ao listar fotos do álbum." });
  }
});

app.get("/api/site/library", async (_req, res) => {
  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const siteFolderId = await getSiteContentFolderId(drive, supabase);
    const photos = await listSiteLibraryPhotos(drive, supabase);
    res.json({ siteFolderId, photos });
  } catch (err) {
    console.error("Site library error:", err);
    res.status(500).json({ error: err.message || "Erro ao listar biblioteca do site." });
  }
});

app.post("/api/site/media/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const subpath = typeof req.body?.subpath === "string" ? req.body.subpath : "";

  if (!file) return res.status(400).json({ error: "Ficheiro é obrigatório." });

  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const folderId = await resolveSiteSubfolderId(drive, supabase, subpath);

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const response = await drive.files.create({
      requestBody: { name: file.originalname, parents: [folderId] },
      media: { mimeType: file.mimetype, body: bufferStream },
      supportsAllDrives: true,
      fields: "id, name, mimeType, webViewLink, thumbnailLink, createdTime",
    });

    res.json({
      ...response.data,
      folderId,
      subpath,
      url: driveMediaUrl(response.data.id),
      thumbnailUrl: `/api/drive/thumbnail?id=${response.data.id}`,
    });
  } catch (err) {
    console.error("Site media upload error:", err);
    res.status(500).json({ error: err.message || "Erro ao carregar imagem para o site." });
  }
});

app.get("/api/site/services", async (_req, res) => {
  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const images = await listSiteServiceImages(drive, supabase);
    res.json({ images });
  } catch (err) {
    console.error("Site services images error:", err);
    res.status(500).json({ error: err.message || "Erro ao listar imagens de serviços." });
  }
});

app.post("/api/drive/list", async (req, res) => {
  const { folderId, filterType } = req.body;

  try {
    const { auth, type } = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    let queryStr = (!folderId || folderId === 'root')
      ? `('root' in parents or sharedWithMe = true) and trashed = false`
      : `'${folderId}' in parents and trashed = false`;
    let orderByStr = 'folder,name,createdTime';

    if (filterType === 'sharedWithMe') {
      queryStr = `sharedWithMe = true and trashed = false`;
    } else if (filterType === 'starred') {
      queryStr = `starred = true and trashed = false`;
    } else if (filterType === 'recent') {
      queryStr = `trashed = false`;
      orderByStr = 'modifiedTime desc';
    } else if (filterType === 'trashed') {
      queryStr = `trashed = true`;
    }

    const allFiles = [];
    let pageToken;

    do {
      const response = await drive.files.list({
        q: queryStr,
        orderBy: orderByStr,
        fields: 'nextPageToken, files(id, name, mimeType, webViewLink, size, thumbnailLink, createdTime, shortcutDetails, starred, trashed, permissions)',
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (response.data.files?.length) {
        allFiles.push(...response.data.files);
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    res.json(allFiles);
  } catch (error) {
    console.error("List Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drive/storage", async (req, res) => {
  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.about.get({
      fields: 'storageQuota'
    });
    res.json(response.data.storageQuota);
  } catch (error) {
    console.error("Storage Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drive/upload", upload.single("file"), async (req, res) => {
  const { folderId } = req.body;
  const file = req.file;

  if (!file || !folderId) return res.status(400).json({ error: "File and Folder ID are required" });

  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    let response;
    try {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      response = await drive.files.create({
        requestBody: { 
          name: file.originalname, 
          parents: [folderId] 
        },
        media: { 
          mimeType: file.mimetype, 
          body: bufferStream 
        },
        supportsAllDrives: true,
        fields: 'id, name, webViewLink, size, mimeType, createdTime',
      });
    } catch (uploadError) {
      console.warn("Upload to specific folder failed on Vercel, falling back to root:", uploadError.message);
      const fallbackStream = new Readable();
      fallbackStream.push(file.buffer);
      fallbackStream.push(null);

      response = await drive.files.create({
        requestBody: { 
          name: file.originalname, 
          parents: ['root'] 
        },
        media: { 
          mimeType: file.mimetype, 
          body: fallbackStream 
        },
        supportsAllDrives: true,
        fields: 'id, name, webViewLink, size, mimeType, createdTime',
      });
    }
    res.json(response.data);
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drive/create-folder", async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) return res.status(400).json({ error: "Nome da pasta é obrigatório" });

  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Normalizar nome para NFC
    const normalizedName = name.normalize("NFC");

    const fileMetadata = {
      name: normalizedName,
      mimeType: "application/vnd.google-apps.folder",
      parents: (parentId && parentId !== "root") ? [parentId] : []
    };

    console.log("Vercel: Criando pasta com metadados:", fileMetadata);

    let file;
    try {
      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id, name",
        supportsAllDrives: true
      });
      file = response.data;
    } catch (createError) {
      console.warn("Vercel: Falha ao criar pasta com parentId, tentando sem parents:", createError.message);
      
      const fallbackMetadata = {
        name: normalizedName,
        mimeType: "application/vnd.google-apps.folder"
      };

      const response = await drive.files.create({
        requestBody: fallbackMetadata,
        fields: "id, name",
        supportsAllDrives: true
      });
      file = response.data;
    }

    res.json(file);
  } catch (error) {
    console.error("Vercel Create Folder Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drive/delete", async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: "ID do arquivo é obrigatório" });

  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Em vez de excluir permanentemente, movemos para a lixeira (trashed = true)
    await drive.files.update({
      fileId: fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true
    });

    res.json({ success: true, message: "Item movido para a lixeira com sucesso." });
  } catch (error) {
    console.error("Vercel Delete Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drive/thumbnail", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("ID do arquivo é obrigatório");

  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    const fileResponse = await drive.files.get({
      fileId: id,
      fields: "thumbnailLink, mimeType",
      supportsAllDrives: true,
    });

    const thumbnailLink = fileResponse.data.thumbnailLink;
    if (!thumbnailLink) return res.status(404).send("Thumbnail não disponível");

    const sizeLink = thumbnailLink.replace(/=s\d+/, "=s800");
    const tokenResponse = await auth.getAccessToken();
    const imageResponse = await fetch(sizeLink, {
      headers: { Authorization: `Bearer ${tokenResponse.token}` },
    });

    if (!imageResponse.ok) {
      throw new Error(`Erro ao baixar thumbnail: ${imageResponse.statusText}`);
    }

    res.setHeader("Content-Type", imageResponse.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    console.error("Erro ao obter thumbnail do Drive:", error);
    res.status(500).send(error.message);
  }
});

app.get("/api/drive/media", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("ID do arquivo é obrigatório");

  try {
    const { auth } = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    const fileResponse = await drive.files.get({
      fileId: id,
      fields: "mimeType, name",
      supportsAllDrives: true,
    });

    const mediaResponse = await drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "stream" },
    );

    res.setHeader("Content-Type", fileResponse.data.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    mediaResponse.data
      .on("error", (streamErr) => {
        console.error("Stream media error:", streamErr);
        if (!res.headersSent) res.status(500).end(streamErr.message);
      })
      .pipe(res);
  } catch (error) {
    console.error("Erro ao obter media do Drive:", error);
    res.status(500).send(error.message);
  }
});

// ----------------- ROTAS DE AUTENTICAÇÃO OAUTH 2.0 -----------------

app.get("/api/drive/auth/url", async (req, res) => {
  try {
    if (!oauthKeys || !oauthKeys.client_id || oauthKeys.client_id.includes("COLE_AQUI") || !oauthKeys.client_secret || oauthKeys.client_secret.includes("COLE_AQUI")) {
      return res.status(400).json({ error: "Por favor, configure o seu client_id e client_secret do Google Cloud no arquivo google-oauth.json na raiz do projeto." });
    }

    const oauth2Client = new google.auth.OAuth2(
      oauthKeys.client_id,
      oauthKeys.client_secret,
      "http://localhost:3333/api/drive/auth/callback"
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"]
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drive/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Código de autorização não fornecido pelo Google.");

  const localTokensPath = path.join(process.cwd(), "google-tokens.json");

  try {
    if (!oauthKeys || !oauthKeys.client_id) {
      return res.status(400).send("Configuração google-oauth.json ausente.");
    }
    
    const oauth2Client = new google.auth.OAuth2(
      oauthKeys.client_id,
      oauthKeys.client_secret,
      "http://localhost:3333/api/drive/auth/callback"
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    try {
      fs.writeFileSync(localTokensPath, JSON.stringify(tokens, null, 2));
    } catch (e) {}

    // Persistir também no Supabase para resiliência na Vercel
    try {
      await supabase.from('settings').upsert({ key: 'google_drive_tokens', value: tokens });
      console.log("Tokens de acesso persistidos com sucesso no Supabase.");
    } catch (dbErr) {
      console.error("Erro ao salvar tokens no Supabase:", dbErr);
    }

    res.send(`
      <html>
        <head>
          <title>Conectado com Sucesso</title>
          <style>
            body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; color: #333; text-align: center; padding-top: 100px; }
            .card { background: white; border: 1px solid #eaeaea; border-radius: 12px; max-width: 500px; margin: 0 auto; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h1 { color: #a21b7e; margin-bottom: 20px; font-size: 24px; }
            p { color: #666; font-size: 15px; line-height: 1.6; }
            .badge { background: #faf0f8; color: #a21b7e; padding: 6px 16px; border-radius: 20px; font-weight: 600; display: inline-block; margin-top: 15px; font-size: 13px; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✨ Google Drive Conectado!</h1>
            <p>O painel <strong>ProVisual Corporate</strong> se conectou com absoluto sucesso à sua conta corporativa.</p>
            <div class="badge">uploads e cota pessoal habilitados!</div>
            <p style="margin-top: 30px; font-size: 13px; color: #999;">Esta janela fechará automaticamente...</p>
          </div>
          <script>
            setTimeout(() => { window.close(); }, 3500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Auth Callback Error:", error);
    res.status(500).send(`Erro ao obter tokens do Google Drive: ${error.message}`);
  }
});

app.post("/api/drive/auth/disconnect", async (req, res) => {
  const localTokensPath = path.join(process.cwd(), "google-tokens.json");
  try {
    if (fs.existsSync(localTokensPath)) {
      fs.unlinkSync(localTokensPath);
    }

    // Remover também do Supabase para manter sincronização
    try {
      await supabase.from('settings').delete().eq('key', 'google_drive_tokens');
      console.log("Tokens removidos com sucesso do Supabase.");
    } catch (dbErr) {
      console.error("Erro ao deletar tokens do Supabase:", dbErr);
    }
    res.json({ success: true, message: "Google Drive desconectado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;

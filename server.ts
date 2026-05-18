import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  // Ajudar o servidor compilado a encontrar os módulos
  if (typeof require !== 'undefined') {
    const module = require('module');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!module.globalPaths.includes(nodeModulesPath)) {
      module.globalPaths.push(nodeModulesPath);
    }
  }

  const app = express();
  const PORT = process.env.PORT || 3333;

  // Body parser
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google Drive Integration
  const multer = require("multer");
  const upload = multer({ storage: multer.memoryStorage() });
  const fs = require("fs");
  const { Readable } = require("stream");

  // Utilitário para inicializar o cliente Google Auth (Híbrido)
  async function getGoogleAuth() {
    const { google } = require("googleapis");
    
    // 1. Tentar ler as credenciais OAuth 2.0 pessoais do Silva
    let oauthKeys;
    try {
      if (fs.existsSync("./google-oauth.json")) {
        oauthKeys = JSON.parse(fs.readFileSync("./google-oauth.json", "utf-8"));
      }
    } catch (err) {
      // Ignorar erro
    }

    // Se tivermos as credenciais OAuth do Silva e o token salvo
    if (oauthKeys && oauthKeys.client_id && oauthKeys.client_secret && fs.existsSync("./google-tokens.json")) {
      try {
        const tokens = JSON.parse(fs.readFileSync("./google-tokens.json", "utf-8"));
        const oauth2Client = new google.auth.OAuth2(
          oauthKeys.client_id,
          oauthKeys.client_secret,
          "http://localhost:3333/api/drive/auth/callback"
        );
        oauth2Client.setCredentials(tokens);
        
        // Listener para atualizar tokens automaticamente se expirarem
        oauth2Client.on('tokens', (newTokens: any) => {
          try {
            const currentTokens = JSON.parse(fs.readFileSync("./google-tokens.json", "utf-8"));
            const mergedTokens = { ...currentTokens, ...newTokens };
            fs.writeFileSync("./google-tokens.json", JSON.stringify(mergedTokens, null, 2));
            console.log("Tokens pessoais do Google Drive atualizados e salvos com sucesso.");
          } catch (e) {
            console.error("Erro ao salvar tokens atualizados:", e);
          }
        });

        return { auth: oauth2Client, type: "oauth2" };
      } catch (err) {
        console.warn("Erro ao configurar cliente OAuth2 pessoal, fazendo fallback para Conta de Serviço:", err);
      }
    }

    // 2. Fallback: Usar a Conta de Serviço padrão (Google API v3)
    let serviceKeys;
    if (process.env.GOOGLE_KEYS) {
      serviceKeys = JSON.parse(process.env.GOOGLE_KEYS);
    } else {
      serviceKeys = require("./provisual-corporate-a16cee3d2250.json");
    }

    const auth = new google.auth.JWT(
      serviceKeys.client_email,
      null,
      serviceKeys.private_key,
      ['https://www.googleapis.com/auth/drive']
    );

    return { auth, type: "service_account" };
  }

  app.post("/api/drive/list", async (req, res) => {
    const { folderId, filterType } = req.body;

    try {
      console.log('--- Listando Pasta do Drive ---');
      console.log('ID Solicitado:', folderId, 'Filtro:', filterType);
      const { google } = require("googleapis");
      const { auth, type } = await getGoogleAuth();
      console.log('Tipo de Autenticação Ativa:', type);

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

      const response = await drive.files.list({
        q: queryStr,
        orderBy: orderByStr,
        fields: 'files(id, name, mimeType, webViewLink, size, thumbnailLink, createdTime, shortcutDetails)',
        pageSize: 100,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
      });

      res.json(response.data.files);
    } catch (error: any) {
      console.error("Google Drive Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive/storage", async (req, res) => {
    try {
      const { google } = require("googleapis");
      const { auth } = await getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });
      const response = await drive.about.get({
        fields: 'storageQuota'
      });
      res.json(response.data.storageQuota);
    } catch (error: any) {
      console.error("Storage Info Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/drive/upload", upload.single("file"), async (req: any, res) => {
    const { folderId } = req.body;
    const file = req.file;

    if (!file || !folderId) return res.status(400).json({ error: "File and Folder ID are required" });

    try {
      const { google } = require("googleapis");
      const { auth, type } = await getGoogleAuth();
      console.log('Autenticação Ativa para Upload:', type);

      const drive = google.drive({ version: 'v3', auth });
      
      let response;
      try {
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        response = await drive.files.create({
          requestBody: {
            name: file.originalname,
            parents: [folderId],
          },
          media: {
            mimeType: file.mimetype,
            body: bufferStream,
          },
          supportsAllDrives: true,
          fields: 'id, name, webViewLink, size, mimeType, createdTime',
        });
      } catch (uploadError: any) {
        console.warn("Upload to specific folder failed, falling back to root:", uploadError.message);
        const fallbackStream = new Readable();
        fallbackStream.push(file.buffer);
        fallbackStream.push(null);

        response = await drive.files.create({
          requestBody: {
            name: file.originalname,
            parents: ['root'],
          },
          media: {
            mimeType: file.mimetype,
            body: fallbackStream,
          },
          supportsAllDrives: true,
          fields: 'id, name, webViewLink, size, mimeType, createdTime',
        });
      }

      res.json(response.data);
    } catch (error: any) {
      console.error("Upload Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Copiar arquivo fisicamente no Google Drive
  app.post("/api/drive/copy", async (req, res) => {
    const { fileId, destinationFolderId, newName } = req.body;
    if (!fileId) return res.status(400).json({ error: "File ID é obrigatório" });

    try {
      console.log('--- Copiando Arquivo no Drive ---');
      console.log('File ID Origem:', fileId, 'Pasta Destino:', destinationFolderId, 'Novo Nome:', newName);
      
      const { google } = require("googleapis");
      const { auth } = await getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });

      const requestBody: any = {};
      if (newName) requestBody.name = newName;
      if (destinationFolderId) {
        // Se for a raiz geral ou subpasta, mapear 'root' se vazio
        requestBody.parents = [destinationFolderId === "" ? "root" : destinationFolderId];
      }

      const response = await drive.files.copy({
        fileId: fileId,
        requestBody: requestBody,
        fields: 'id, name, mimeType, webViewLink, size, thumbnailLink, createdTime',
        supportsAllDrives: true
      });

      console.log('Cópia concluída no Drive. Novo ID:', response.data.id);
      res.json(response.data);
    } catch (error: any) {
      console.error("Erro ao copiar no Google Drive:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar (Renomear, Mover de pasta ou mover para a Lixeira) no Google Drive
  app.post("/api/drive/update", async (req, res) => {
    const { fileId, newName, addParents, removeParents, trashed, starred } = req.body;
    if (!fileId) return res.status(400).json({ error: "File ID é obrigatório" });

    try {
      console.log('--- Atualizando Arquivo no Drive ---');
      console.log('File ID:', fileId, { newName, addParents, removeParents, trashed, starred });

      const { google } = require("googleapis");
      const { auth } = await getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });

      const requestBody: any = {};
      if (newName) requestBody.name = newName;
      if (trashed !== undefined) requestBody.trashed = trashed;
      if (starred !== undefined) requestBody.starred = starred;

      const updateParams: any = {
        fileId: fileId,
        requestBody: requestBody,
        fields: 'id, name, mimeType, webViewLink, parents, starred, trashed',
        supportsAllDrives: true
      };

      if (addParents) {
        updateParams.addParents = addParents === "" ? "root" : addParents;
      }
      if (removeParents) {
        updateParams.removeParents = removeParents === "" ? "root" : removeParents;
      }

      const response = await drive.files.update(updateParams);
      console.log('Atualização concluída no Drive.');
      res.json(response.data);
    } catch (error: any) {
      console.error("Erro ao atualizar no Google Drive:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Excluir arquivo permanentemente do Google Drive
  app.post("/api/drive/delete", async (req, res) => {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: "File ID é obrigatório" });

    try {
      console.log('--- Excluindo Arquivo no Drive ---');
      console.log('File ID:', fileId);

      const { google } = require("googleapis");
      const { auth } = await getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });

      await drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true
      });

      console.log('Exclusão física concluída no Drive.');
      res.json({ success: true, message: "Arquivo excluído permanentemente do Google Drive" });
    } catch (error: any) {
      console.error("Erro ao excluir no Google Drive:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Rotas de Autorização Pessoal OAuth 2.0 do Silva (provisualcorporate@gmail.com)
  app.get("/api/drive/auth/status", async (req, res) => {
    const oauthConfigured = fs.existsSync("./google-oauth.json");
    const tokensExist = fs.existsSync("./google-tokens.json");
    
    let email = "Conta de Serviço (Gravação Limitada)";
    if (tokensExist && oauthConfigured) {
      try {
        const tokens = JSON.parse(fs.readFileSync("./google-tokens.json", "utf-8"));
        email = "provisualcorporate@gmail.com (Cota Pessoal Ativa)";
      } catch (e) {}
    }

    res.json({
      connected: tokensExist && oauthConfigured,
      type: tokensExist && oauthConfigured ? "oauth2" : "service_account",
      email,
      configNeeded: !oauthConfigured
    });
  });

  app.get("/api/drive/auth/url", async (req, res) => {
    try {
      const { google } = require("googleapis");
      if (!fs.existsSync("./google-oauth.json")) {
        return res.status(400).json({ error: "O arquivo google-oauth.json não foi configurado na raiz." });
      }
      const oauthKeys = JSON.parse(fs.readFileSync("./google-oauth.json", "utf-8"));
      
      if (!oauthKeys.client_id || oauthKeys.client_id.includes("COLE_AQUI") || !oauthKeys.client_secret || oauthKeys.client_secret.includes("COLE_AQUI")) {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Código de autorização não fornecido pelo Google.");

    try {
      const { google } = require("googleapis");
      if (!fs.existsSync("./google-oauth.json")) {
        return res.status(400).send("Configuração google-oauth.json ausente.");
      }
      const oauthKeys = JSON.parse(fs.readFileSync("./google-oauth.json", "utf-8"));
      
      const oauth2Client = new google.auth.OAuth2(
        oauthKeys.client_id,
        oauthKeys.client_secret,
        "http://localhost:3333/api/drive/auth/callback"
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      fs.writeFileSync("./google-tokens.json", JSON.stringify(tokens, null, 2));

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
              <p>O painel <strong>ProVisual Corporate</strong> se conectou com absoluto sucesso à sua conta <strong>provisualcorporate@gmail.com</strong>.</p>
              <div class="badge">uploads e cota pessoal habilitados!</div>
              <p style="margin-top: 30px; font-size: 13px; color: #999;">Esta janela fechará automaticamente...</p>
            </div>
            <script>
              setTimeout(() => { window.close(); }, 3500);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Auth Callback Error:", error);
      res.status(500).send(`Erro ao obter tokens do Google Drive: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true, 
        port: 4000,
        host: "127.0.0.1",
        hmr: {
          host: "127.0.0.1"
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "127.0.0.1", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

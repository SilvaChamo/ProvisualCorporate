import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const _filename = typeof import.meta !== 'undefined' && import.meta.url 
  ? fileURLToPath(import.meta.url) 
  : (typeof __filename !== 'undefined' ? __filename : '');
const _dirname = typeof import.meta !== 'undefined' && import.meta.url 
  ? path.dirname(_filename) 
  : (typeof __dirname !== 'undefined' ? __dirname : '');

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

  app.post("/api/drive/list", async (req, res) => {
    const { folderId, filterType } = req.body;

    try {
      console.log('--- Listando Pasta do Drive ---');
      console.log('ID Solicitado:', folderId, 'Filtro:', filterType);
      const { google } = require("googleapis");
      let keys;
      if (process.env.GOOGLE_KEYS) {
        keys = JSON.parse(process.env.GOOGLE_KEYS);
      } else {
        keys = require("./provisual-corporate-a16cee3d2250.json");
      }

      const auth = google.auth.fromJSON(keys);
      auth.scopes = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'];

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
        fields: 'files(id, name, mimeType, webViewLink, size, thumbnailLink, createdTime)',
        pageSize: 100
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
      let keys;
      if (process.env.GOOGLE_KEYS) {
        keys = JSON.parse(process.env.GOOGLE_KEYS);
      } else {
        keys = require("./provisual-corporate-a16cee3d2250.json");
      }
      const auth = google.auth.fromJSON(keys);
      auth.scopes = ['https://www.googleapis.com/auth/drive.readonly'];
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
      let keys;
      if (process.env.GOOGLE_KEYS) {
        keys = JSON.parse(process.env.GOOGLE_KEYS);
      } else {
        keys = require("./provisual-corporate-a16cee3d2250.json");
      }
      const auth = google.auth.fromJSON(keys);
      auth.scopes = ['https://www.googleapis.com/auth/drive.file'];

      const drive = google.drive({ version: 'v3', auth });
      
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        fields: 'id, name, webViewLink, size, mimeType, createdTime',
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Upload Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 4000 },
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

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

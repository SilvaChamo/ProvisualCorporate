import express from "express";
import { google } from "googleapis";
import multer from "multer";
import { Readable } from "stream";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// Helper para as chaves do Google
const getGoogleAuth = () => {
  let keys;
  if (process.env.GOOGLE_KEYS) {
    keys = JSON.parse(process.env.GOOGLE_KEYS);
  } else {
    // Fallback local se necessário
    try {
      const keyPath = path.join(process.cwd(), 'provisual-corporate-a16cee3d2250.json');
      keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch (e) {
      throw new Error("Google Keys not found");
    }
  }
  const auth = google.auth.fromJSON(keys);
  auth.scopes = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'];
  return auth;
};

// Rotas da API
app.post("/api/drive/list", async (req, res) => {
  const { folderId } = req.body;
  if (!folderId) return res.status(400).json({ error: "Folder ID is required" });

  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, size, thumbnailLink, createdTime)',
    });
    res.json(response.data.files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const upload = multer({ storage: multer.memoryStorage() });
app.post("/api/drive/upload", upload.single("file"), async (req, res) => {
  const { folderId } = req.body;
  const file = req.file;

  if (!file || !folderId) return res.status(400).json({ error: "File and Folder ID are required" });

  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const response = await drive.files.create({
      requestBody: { name: file.originalname, parents: [folderId] },
      media: { mimeType: file.mimetype, body: bufferStream },
      fields: 'id, name, webViewLink, size, mimeType, createdTime',
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;

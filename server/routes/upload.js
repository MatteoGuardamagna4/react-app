import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { embedTexts } from '../services/openai.js';
import { ensureCollection, upsertChunks } from '../services/qdrant.js';
import { isOpenAIAvailable } from '../services/openai.js';
import { isQdrantAvailable } from '../services/qdrant.js';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../scripts/pdfs');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

const router = Router();

// Sentence-level chunking for uploaded PDFs
function chunkText(text, maxChars = 1500, overlap = 200) {
  const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // keep overlap from the end of the previous chunk
      const words = current.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(' ') + ' ' + sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim().length > 50) {
    chunks.push(current.trim());
  }

  return chunks;
}

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    if (!isOpenAIAvailable() || !isQdrantAvailable()) {
      return res.status(503).json({ error: 'RAG services not configured. Set OPENAI_API_KEY, QDRANT_URL, and QDRANT_API_KEY.' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Extract text from PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text || text.trim().length < 100) {
      return res.status(400).json({ error: 'PDF contains too little extractable text' });
    }

    // Chunk the text
    const textChunks = chunkText(text);

    // Build chunk objects with IDs
    const chunks = textChunks.map((content, i) => {
      const id = crypto.createHash('md5')
        .update(`${fileName}:${i}:${content.slice(0, 100)}`)
        .digest('hex');

      // Convert hex hash to a UUID-like format for Qdrant
      const uuid = [
        id.slice(0, 8),
        id.slice(8, 12),
        id.slice(12, 16),
        id.slice(16, 20),
        id.slice(20, 32),
      ].join('-');

      return {
        id: uuid,
        content,
        source: path.parse(fileName).name,
        section: `chunk_${i}`,
      };
    });

    // Ensure Qdrant collection
    await ensureCollection();

    // Embed all chunks
    const embeddings = await embedTexts(textChunks);
    if (!embeddings) {
      return res.status(500).json({ error: 'Embedding failed' });
    }

    // Store in Qdrant
    await upsertChunks(chunks, embeddings);

    res.json({
      message: `Uploaded and indexed "${fileName}"`,
      chunks: chunks.length,
      filename: fileName,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// List uploaded PDFs
router.get('/files', (_req, res) => {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(f => f.endsWith('.pdf'))
      .map(f => ({
        name: f,
        size: fs.statSync(path.join(UPLOAD_DIR, f)).size,
      }));
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

export default router;

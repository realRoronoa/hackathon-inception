import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

import { conductSpatialResearch } from './services/researchAgent';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration allowing local development and production deployments
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Spatial Intelligence Research Endpoint (LLM-to-World Synthesis)
app.post('/api/research', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.body?.query || req.body?.prompt || 'Autonomous spatial exploration';
    console.log(`[RESEARCH ENDPOINT] Synthesizing blueprint for: "${query}"...`);

    const result = await conductSpatialResearch(query);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[RESEARCH ENDPOINT ERROR]:', error.message);
    res.status(500).json({ error: error.message || 'Failed to conduct spatial research' });
  }
});

// Reactor Token Exchange Proxy Route
app.post('/api/reactor-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = req.body?.apiKey || process.env.REACTOR_API_KEY || process.env.VITE_REACTOR_API_KEY;

    if (!apiKey) {
      res.status(400).json({ error: 'Reactor API Key is required.' });
      return;
    }

    const response = await axios.post(
      'https://api.reactor.inc/tokens',
      {
        authorization_details: [
          {
            type: 'session',
            resources: { models: { match: ['reactor/lingbot', 'lingbot'] } },
          },
        ],
      },
      {
        headers: {
          'Reactor-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[REACTOR TOKEN PROXY ERROR]:', error?.response?.data || error.message);
    const statusCode = error?.response?.status || 500;
    res.status(statusCode).json(error?.response?.data || { error: error.message });
  }
});

// Fish Audio TTS Proxy Route
app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Field "text" is required and must be a string.' });
      return;
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (!apiKey || apiKey === 'your_fish_audio_key_here') {
      res.status(500).json({
        error: 'FISH_AUDIO_API_KEY is not configured. Please set your API key in backend/.env',
      });
      return;
    }

    // Call Fish Audio TTS API
    const response = await axios.post(
      'https://api.fish.audio/v1/tts',
      {
        text: text,
        format: 'mp3',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    // Forward audio stream back to client
    const rawContentType = response.headers['content-type'];
    const contentType = typeof rawContentType === 'string' ? rawContentType : 'audio/mpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', response.data.length);
    res.status(200).send(Buffer.from(response.data));
  } catch (error: any) {
    console.error('[TTS PROXY ERROR]:', error?.response?.data || error.message);

    const statusCode = error?.response?.status || 500;
    let errorMessage = 'Failed to generate TTS audio';

    if (error?.response?.data) {
      try {
        const decoded = Buffer.from(error.response.data).toString('utf-8');
        const parsed = JSON.parse(decoded);
        errorMessage = parsed.message || parsed.error || errorMessage;
      } catch {
        // Leave default error message if unparseable
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[BACKEND] Server running on http://localhost:${PORT}`);
  console.log(`[BACKEND] Health check available at http://localhost:${PORT}/api/health`);
});

import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { wsMessageSchema, type WSMessage } from "@shared/schema";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Get all available videos
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Get video metadata
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  // Stream video with range support
  app.get("/api/videos/:id/stream", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const videoPath = path.join(process.cwd(), "videos", video.filename);
      
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ message: "Video file not found" });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const file = fs.createReadStream(videoPath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': video.mimeType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });
        
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': video.mimeType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });
        
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error("Error streaming video:", error);
      res.status(500).json({ message: "Failed to stream video" });
    }
  });

  // Create streaming session
  app.post("/api/sessions", async (req, res) => {
    try {
      const { videoId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ message: "Video ID is required" });
      }

      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const sessionId = nanoid();
      const session = await storage.createStreamSession({
        videoId,
        sessionId,
        currentPosition: 0,
        isPlaying: false,
      });

      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // WebSocket server for real-time stream control
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        const validatedMessage = wsMessageSchema.parse(message);
        
        console.log('Received message:', validatedMessage);
        
        switch (validatedMessage.type) {
          case 'play':
            await storage.updateStreamSession(validatedMessage.sessionId, { isPlaying: true });
            broadcastToSession(validatedMessage.sessionId, {
              type: 'status',
              sessionId: validatedMessage.sessionId,
              isPlaying: true,
              currentPosition: 0,
              duration: 0,
            });
            break;
            
          case 'pause':
            await storage.updateStreamSession(validatedMessage.sessionId, { isPlaying: false });
            broadcastToSession(validatedMessage.sessionId, {
              type: 'status',
              sessionId: validatedMessage.sessionId,
              isPlaying: false,
              currentPosition: 0,
              duration: 0,
            });
            break;
            
          case 'seek':
            await storage.updateStreamSession(validatedMessage.sessionId, { 
              currentPosition: validatedMessage.position 
            });
            broadcastToSession(validatedMessage.sessionId, {
              type: 'status',
              sessionId: validatedMessage.sessionId,
              isPlaying: true,
              currentPosition: validatedMessage.position,
              duration: 0,
            });
            break;
            
          case 'stop':
            await storage.updateStreamSession(validatedMessage.sessionId, { 
              isPlaying: false,
              currentPosition: 0,
            });
            broadcastToSession(validatedMessage.sessionId, {
              type: 'status',
              sessionId: validatedMessage.sessionId,
              isPlaying: false,
              currentPosition: 0,
              duration: 0,
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function broadcastToSession(sessionId: string, message: WSMessage) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}

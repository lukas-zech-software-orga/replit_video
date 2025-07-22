import { videos, streamSessions, type Video, type InsertVideo, type StreamSession, type InsertStreamSession } from "@shared/schema";
import fs from "fs";
import path from "path";

export interface IStorage {
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByFilename(filename: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  getAllVideos(): Promise<Video[]>;
  createStreamSession(session: InsertStreamSession): Promise<StreamSession>;
  getStreamSession(sessionId: string): Promise<StreamSession | undefined>;
  updateStreamSession(sessionId: string, updates: Partial<StreamSession>): Promise<StreamSession | undefined>;
  deleteStreamSession(sessionId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private videos: Map<number, Video>;
  private sessions: Map<string, StreamSession>;
  private currentVideoId: number;
  private currentSessionId: number;

  constructor() {
    this.videos = new Map();
    this.sessions = new Map();
    this.currentVideoId = 1;
    this.currentSessionId = 1;
    this.initializeDefaultVideos();
  }

  private async initializeDefaultVideos() {
    // Check if sample video exists and create entry
    const videoPath = path.join(process.cwd(), "videos", "sample-video.mp4");
    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath);
      const video: Video = {
        id: this.currentVideoId++,
        filename: "sample-video.mp4",
        title: "Sample Video",
        duration: 120, // 2 minutes - in real app this would be parsed from video metadata
        fileSize: stats.size,
        mimeType: "video/mp4",
        createdAt: new Date(),
      };
      this.videos.set(video.id, video);
    }
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideoByFilename(filename: string): Promise<Video | undefined> {
    return Array.from(this.videos.values()).find(
      (video) => video.filename === filename,
    );
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video: Video = { 
      ...insertVideo, 
      id,
      createdAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values());
  }

  async createStreamSession(insertSession: InsertStreamSession): Promise<StreamSession> {
    const id = this.currentSessionId++;
    const session: StreamSession = { 
      ...insertSession, 
      id,
      createdAt: new Date(),
    };
    this.sessions.set(insertSession.sessionId, session);
    return session;
  }

  async getStreamSession(sessionId: string): Promise<StreamSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateStreamSession(sessionId: string, updates: Partial<StreamSession>): Promise<StreamSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async deleteStreamSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

export const storage = new MemStorage();

import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  title: text("title").notNull(),
  duration: integer("duration").notNull(), // in seconds
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const streamSessions = pgTable("stream_sessions", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id).notNull(),
  sessionId: text("session_id").notNull(),
  currentPosition: integer("current_position").default(0), // in seconds
  isPlaying: boolean("is_playing").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export const insertStreamSessionSchema = createInsertSchema(streamSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertStreamSession = z.infer<typeof insertStreamSessionSchema>;
export type StreamSession = typeof streamSessions.$inferSelect;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("play"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("pause"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("seek"),
    sessionId: z.string(),
    position: z.number(), // in seconds
  }),
  z.object({
    type: z.literal("stop"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("status"),
    sessionId: z.string(),
    isPlaying: z.boolean(),
    currentPosition: z.number(),
    duration: z.number(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;

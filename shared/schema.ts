import { z } from "zod";

// Simple video metadata type
export type Video = {
  id: string;
  filename: string;
  title: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  mimeType: string;
};

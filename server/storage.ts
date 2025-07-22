import { type Video } from "@shared/schema";
import fs from "fs";
import path from "path";

// Simple video discovery from filesystem
export function discoverVideos(): Video[] {
  const videosDir = path.join(process.cwd(), "videos");
  const videos: Video[] = [];

  if (!fs.existsSync(videosDir)) {
    return videos;
  }

  const files = fs.readdirSync(videosDir);
  
  files.forEach((filename, index) => {
    const filePath = path.join(videosDir, filename);
    const ext = path.extname(filename).toLowerCase();
    
    // Only process video files
    if (['.mp4', '.webm', '.avi', '.mov'].includes(ext)) {
      const stats = fs.statSync(filePath);
      
      videos.push({
        id: (index + 1).toString(),
        filename,
        title: path.basename(filename, ext),
        duration: 120, // Placeholder - in real app would parse video metadata
        fileSize: stats.size,
        mimeType: ext === '.mp4' ? 'video/mp4' : `video/${ext.substring(1)}`,
      });
    }
  });

  return videos;
}

export function getVideoByFilename(filename: string): Video | undefined {
  const videos = discoverVideos();
  return videos.find(video => video.filename === filename);
}

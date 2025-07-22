This is a placeholder for the video file. In a real deployment, you would place actual MP4 video files in this directory. The application will automatically detect and serve any video files placed here.

For testing purposes, you can:
1. Add any MP4 video file to the "videos" directory
2. Name it "sample-video.mp4" to match the default configuration
3. The server will automatically serve it and the client will be able to stream it

The video streaming supports:
- HTTP range requests for seeking
- Real-time playback control via WebSockets
- Standard video formats (MP4, WebM)
- No client-side caching for true streaming experience

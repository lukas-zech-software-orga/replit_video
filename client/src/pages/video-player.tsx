import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import type { Video } from "@shared/schema";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  Maximize, 
  Info
} from "lucide-react";

export default function VideoPlayer() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fetch available videos
  const { data: videos, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  // Initialize with first video
  useEffect(() => {
    if (videos && videos.length > 0 && !currentVideo) {
      const video = videos[0];
      setCurrentVideo(video);
      if (videoRef.current) {
        const videoUrl = `/api/videos/${video.filename}/stream`;
        console.log('Setting video URL:', videoUrl);
        videoRef.current.src = videoUrl;
      }
    }
  }, [videos, currentVideo]);

  // Update video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    const updatePlayState = () => {
      setIsPlaying(!video.paused);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      console.error('Video error:', e, video.error);
      setIsLoading(false);
      setHasError(true);
      toast({
        title: "Stream Error",
        description: `Unable to load video stream. Error code: ${video.error?.code}`,
        variant: "destructive",
      });
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('play', updatePlayState);
      video.removeEventListener('pause', updatePlayState);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [toast]);

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    videoRef.current.currentTime = newTime;
  };

  if (videosLoading) {
    return (
      <div className="min-h-screen bg-video-dark flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium text-white">Loading videos...</p>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-video-dark text-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-video-gray border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Play className="text-video-accent text-2xl" />
            <h1 className="text-xl font-semibold">Video Stream Player</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${currentVideo ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {currentVideo ? 'Video Ready' : 'No Video'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Video Player */}
        <Card className="bg-video-gray rounded-xl overflow-hidden shadow-2xl">
          <div className="video-container aspect-video relative group">
            {/* Status Indicator */}
            <div className={`status-indicator ${isPlaying ? 'streaming' : hasError ? 'error' : 'buffering'}`}>
              <span>{isPlaying ? 'Playing' : hasError ? 'Error' : 'Paused'}</span>
            </div>

            {/* Video Element */}
            <video 
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              playsInline
              preload="metadata"
              controls={false}
            />

            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center">
                  <div className="loading-spinner w-12 h-12 rounded-full mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Loading video...</p>
                  <p className="text-sm text-gray-400 mt-1">Please wait while we load the stream</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-center error-pulse">
                  <h3 className="text-xl font-semibold mb-2">Video Unavailable</h3>
                  <p className="text-gray-400 mb-4">Unable to load video stream</p>
                  <Button 
                    onClick={() => setHasError(false)}
                    className="bg-video-accent hover:bg-blue-600"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Control Overlay */}
            <div className="control-overlay absolute bottom-0 left-0 right-0 p-6 group-hover:opacity-100">
              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={togglePlayPause}
                    className="btn-control bg-black bg-opacity-40 hover:bg-opacity-60 p-3 rounded-full"
                    size="sm"
                  >
                    {isPlaying ? <Pause className="text-xl text-white" /> : <Play className="text-xl text-white" />}
                  </Button>

                  <Button 
                    onClick={() => seekRelative(-15)}
                    className="btn-control bg-black bg-opacity-40 hover:bg-opacity-60 p-3 rounded-full"
                    size="sm"
                  >
                    <RotateCcw className="text-lg text-white" />
                    <span className="text-xs text-white ml-1">15</span>
                  </Button>

                  <Button 
                    onClick={() => seekRelative(15)}
                    className="btn-control bg-black bg-opacity-40 hover:bg-opacity-60 p-3 rounded-full"
                    size="sm"
                  >
                    <RotateCw className="text-lg text-white" />
                    <span className="text-xs text-white ml-1">15</span>
                  </Button>
                </div>

                {/* Center - Time Display */}
                <div className="flex items-center space-x-2 text-white font-mono text-sm">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Right Controls */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button className="btn-control bg-black bg-opacity-40 hover:bg-opacity-60 p-2 rounded" size="sm">
                      <Volume2 className="text-white" />
                    </Button>
                    <Slider
                      value={[volume]}
                      onValueChange={(value) => setVolume(value[0])}
                      max={100}
                      step={1}
                      className="w-20"
                    />
                  </div>

                  <Button 
                    onClick={toggleFullscreen}
                    className="btn-control bg-black bg-opacity-40 hover:bg-opacity-60 p-2 rounded"
                    size="sm"
                  >
                    <Maximize className="text-white" />
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div 
                  className="w-full bg-gray-600 rounded-full h-1 cursor-pointer" 
                  onClick={handleProgressClick}
                >
                  <div 
                    className="bg-video-accent h-1 rounded-full relative" 
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-video-accent rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stream Information Panel */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stream Details */}
          <div className="bg-video-gray rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Info className="text-video-accent mr-2" />
              Video Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Video File</label>
                <p className="font-medium">{currentVideo?.filename || 'No video'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Title</label>
                <p className="font-medium">{currentVideo?.title || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Duration</label>
                <p className="font-medium">{formatTime(duration)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">File Size</label>
                <p className="font-medium">{currentVideo ? `${(currentVideo.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Available Videos */}
          <div className="bg-video-gray rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Available Videos</h2>
            <div className="space-y-2">
              {videos?.length ? videos.map((video) => (
                <Button
                  key={video.id}
                  onClick={() => {
                    console.log('Switching to video:', video);
                    setCurrentVideo(video);
                    if (videoRef.current) {
                      const videoUrl = `/api/videos/${video.filename}/stream`;
                      console.log('Setting new video URL:', videoUrl);
                      videoRef.current.src = videoUrl;
                      videoRef.current.load(); // Force reload of the video element
                    }
                  }}
                  variant={currentVideo?.id === video.id ? "default" : "outline"}
                  className="w-full justify-start"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {video.title}
                </Button>
              )) : (
                <p className="text-gray-400">No videos available</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
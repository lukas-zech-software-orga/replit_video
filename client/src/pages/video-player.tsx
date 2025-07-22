import { useQuery, useMutation } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Video, StreamSession } from "@shared/schema";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  Maximize, 
  RefreshCw, 
  Square,
  Info,
  Settings,
  TrendingUp
} from "lucide-react";

export default function VideoPlayer() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [currentSession, setCurrentSession] = useState<StreamSession | null>(null);
  const [seekTime, setSeekTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  // Fetch available videos
  const { data: videos, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  // Create streaming session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await apiRequest("POST", "/api/sessions", { videoId });
      return response.json() as Promise<StreamSession>;
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      if (videoRef.current && videos) {
        const video = videos.find(v => v.id === session.videoId);
        if (video) {
          videoRef.current.src = `/api/videos/${video.id}/stream`;
          setDuration(video.duration);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create streaming session",
        variant: "destructive",
      });
      setHasError(true);
    },
  });

  // Initialize session with first video
  useEffect(() => {
    if (videos && videos.length > 0 && !currentSession) {
      createSessionMutation.mutate(videos[0].id);
    }
  }, [videos]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'status') {
      setIsPlaying(lastMessage.isPlaying);
      setCurrentTime(lastMessage.currentPosition);
    }
  }, [lastMessage]);

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

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      toast({
        title: "Stream Error",
        description: "Unable to load video stream",
        variant: "destructive",
      });
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
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
    if (!currentSession) return;

    if (isPlaying) {
      sendMessage({ type: 'pause', sessionId: currentSession.sessionId });
      videoRef.current?.pause();
    } else {
      sendMessage({ type: 'play', sessionId: currentSession.sessionId });
      videoRef.current?.play();
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current || !currentSession) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
    sendMessage({ 
      type: 'seek', 
      sessionId: currentSession.sessionId, 
      position: newTime 
    });
  };

  const seekToTime = () => {
    if (!seekTime || !videoRef.current || !currentSession) return;
    
    const [hours, minutes, seconds] = seekTime.split(':').map(Number);
    const totalSeconds = (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
    
    if (totalSeconds <= duration) {
      videoRef.current.currentTime = totalSeconds;
      sendMessage({ 
        type: 'seek', 
        sessionId: currentSession.sessionId, 
        position: totalSeconds 
      });
    }
  };

  const restartStream = () => {
    if (!videoRef.current || !currentSession) return;
    
    videoRef.current.currentTime = 0;
    sendMessage({ 
      type: 'seek', 
      sessionId: currentSession.sessionId, 
      position: 0 
    });
  };

  const stopStream = () => {
    if (!currentSession) return;
    
    sendMessage({ type: 'stop', sessionId: currentSession.sessionId });
    videoRef.current?.pause();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !currentSession) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    videoRef.current.currentTime = newTime;
    sendMessage({ 
      type: 'seek', 
      sessionId: currentSession.sessionId, 
      position: newTime 
    });
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

  const currentVideo = videos?.find(v => v.id === currentSession?.videoId);
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
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isConnected ? 'Connected to Server' : 'Disconnected'}
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
              <i className="fas fa-satellite-dish mr-2"></i>
              <span>{isPlaying ? 'Live Stream' : hasError ? 'Error' : 'Buffering'}</span>
            </div>

            {/* Video Element */}
            <video 
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              playsInline
              preload="none"
            />

            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center">
                  <div className="loading-spinner w-12 h-12 rounded-full mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Connecting to stream...</p>
                  <p className="text-sm text-gray-400 mt-1">Please wait while we establish connection</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-center error-pulse">
                  <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                  <h3 className="text-xl font-semibold mb-2">Stream Unavailable</h3>
                  <p className="text-gray-400 mb-4">Unable to connect to video stream</p>
                  <Button 
                    onClick={() => setHasError(false)}
                    className="bg-video-accent hover:bg-blue-600"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Connection
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
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stream Details */}
          <div className="lg:col-span-2 bg-video-gray rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Info className="text-video-accent mr-2" />
              Stream Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Video File</label>
                <p className="font-medium">{currentVideo?.filename || 'No video'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Stream Quality</label>
                <p className="font-medium">1080p @ 30fps</p>
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

          {/* Stream Controls */}
          <div className="bg-video-gray rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="text-video-accent mr-2" />
              Stream Controls
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Seek to Time</label>
                <div className="flex space-x-2">
                  <Input 
                    type="time" 
                    step="1"
                    value={seekTime}
                    onChange={(e) => setSeekTime(e.target.value)}
                    className="bg-video-control border-gray-600 flex-1"
                  />
                  <Button 
                    onClick={seekToTime}
                    className="bg-video-accent hover:bg-blue-600"
                  >
                    Seek
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={restartStream}
                  className="w-full bg-video-control hover:bg-gray-600"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restart Stream
                </Button>
                <Button 
                  onClick={stopStream}
                  className="w-full bg-red-600 hover:bg-red-700"
                  variant="destructive"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Stream
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Information */}
        <div className="mt-8 bg-video-gray rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="text-video-accent mr-2" />
            Technical Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-video-accent">45ms</div>
              <div className="text-sm text-gray-400">Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">3.2 Mbps</div>
              <div className="text-sm text-gray-400">Bandwidth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">0</div>
              <div className="text-sm text-gray-400">Dropped Frames</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{Math.floor(currentTime)}</div>
              <div className="text-sm text-gray-400">Seconds Streamed</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

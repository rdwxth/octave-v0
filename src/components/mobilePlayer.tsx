/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, SVGProps } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Heart, Play, Pause, SkipBack, SkipForward, ChevronDown,
  Music, Download, Share2, Radio, Plus, Library,
  Shuffle, Repeat, Repeat1, Mic2, ListMusic,
  ArrowLeft, MoreHorizontal, Cast, Airplay,
  Ban, Crown, Settings,
  Share, Star, RefreshCw, Flag, AlertCircle, Lock, UserPlus
} from 'lucide-react';

// Original interfaces
interface Artist {
  name: string;
}

interface Album {
  title: string;
  cover_medium: string;
}

interface Track {
  id: string;
  title: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium: string;
  };
}
let backClickTimeout: NodeJS.Timeout | null = null;
let forwardClickTimeout: NodeJS.Timeout | null = null;


interface Lyric {
  time: number;
  text: string;
}

type AudioQuality = 'MAX' | 'HIGH' | 'NORMAL' | 'DATA_SAVER';
type RepeatMode = 'off' | 'all' | 'one';

interface MobilePlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  togglePlay: () => void;
  skipTrack: () => void | Promise<void>;
  previousTrack: () => void;
  seekPosition: number;
  duration: number;
  handleSeek: (time: number) => void; 
  isLiked: boolean;
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleLike: () => void;
  lyrics: Lyric[];
  currentLyricIndex: number;
  showLyrics: boolean;
  toggleLyricsView: () => void;
  shuffleOn: boolean;
  shuffleQueue: () => void;
  queue: Track[];
  currentTrackIndex: number;
  onQueueItemClick: (track: Track, index: number) => void;
  setIsPlayerOpen: (isOpen: boolean) => void;
}


interface SeekbarProps {
  progress: number;
  handleSeek: (time: number) => void;
  isMiniplayer?: boolean;
  duration: number;
  buffered?: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};


const Seekbar: React.FC<SeekbarProps> = ({
  progress,
  handleSeek,
  isMiniplayer = false,
  duration,
}) => {
  // State to track if the user is dragging the thumb
  const [isDragging, setIsDragging] = useState(false);
  
  // State to manage local progress value
  const [localProgress, setLocalProgress] = useState(progress);
  
  // State to manage thumb visibility
  const [isThumbVisible, setIsThumbVisible] = useState(false);
  
  // Ref to the slider track for calculating positions
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  // Function to calculate progress based on clientX
  const calculateProgress = (clientX: number): number | null => {
    if (!progressRef.current) return null;
    const rect = progressRef.current.getBoundingClientRect();
    const newProgress = (clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, newProgress));
  };

  // Handle mouse move event during dragging
  const handleMouseMove = (e: MouseEvent) => {
    // e.preventDefault();
    if (isDragging) {
      const newProgress = calculateProgress(e.clientX);
      if (newProgress !== null) {
        setLocalProgress(newProgress);
      }
    }
  };

  // Handle mouse up event to end dragging
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      handleSeek(localProgress * duration);
      setIsThumbVisible(false); // Hide the thumb after seeking
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  };

  // Handle touch move event during dragging
  const handleTouchMove = (e: TouchEvent) => {
    // e.preventDefault();
    if (isDragging) {
      const touch = e.touches[0];
      const newProgress = calculateProgress(touch.clientX);
      if (newProgress !== null) {
        setLocalProgress(newProgress);
      }
    }
  };

  // Handle touch end event to end dragging
  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      handleSeek(localProgress * duration);
      setIsThumbVisible(false); // Hide the thumb after seeking
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }
  };

  // Handle interaction start (mouse down or touch start)
  const handleInteractionStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    setIsDragging(true);
    setIsThumbVisible(true); // Show the thumb when interaction starts
    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      clientX = e.clientX;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    const newProgress = calculateProgress(clientX);
    if (newProgress !== null) {
      setLocalProgress(newProgress);
    }
  };

  // Handle clicks outside the slider to hide the thumb
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        progressRef.current &&
        !progressRef.current.contains(e.target as Node)
      ) {
        setIsThumbVisible(false);
      }
    };

    // Add event listener when thumb is visible
    if (isThumbVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThumbVisible]);

  return (
    <div className="flex flex-col items-center">
      {/* Seekbar Container */}
      <div
        ref={progressRef}
        className={`relative w-full ${isMiniplayer ? 'h-1' : 'h-2'} cursor-pointer`}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
      >
        {/* Background Bar */}
        <div className="absolute inset-0 bg-gray-700 rounded-full">
          {/* Progress Indicator */}
          <motion.div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${localProgress * 100}%` }}
          />
        </div>

        {/* Thumb - Visible Only When isThumbVisible is True */}
        {isThumbVisible && (
          <motion.div
            className="absolute top-1/2 transform -translate-y-1/2 w-2 h-5 bg-blue-500 rounded-sm border border-gray-300 cursor-pointer shadow-lg"
            style={{ left: `${localProgress * 100}%` }}
            whileHover={{ scale: 1.2, boxShadow: "0px 0px 12px rgba(0, 0, 0, 0.2)" }}
            transition={{ type: "spring", stiffness: 300 }}
            onMouseDown={(e) => {
              // Prevent slider from losing focus when clicking the thumb
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              // Prevent slider from losing focus when touching the thumb
              e.stopPropagation();
            }}
          />
        )}
      </div>
    </div>
  );
};



// Enhanced QualityBadge with perfectly centered icons
const QualityBadge: React.FC<{
  quality: AudioQuality;
  onClick: () => void;
}> = ({ quality, onClick }) => {
  const icons = {
    MAX: Crown,
    HIGH: Star,
    NORMAL: Settings,
    DATA_SAVER: RefreshCw,
  };

  const qualityColors = {
    MAX: 'bg-gradient-to-r from-yellow-600 to-yellow-800',
    HIGH: 'bg-gradient-to-r from-purple-500 to-purple-700',
    NORMAL: 'bg-gradient-to-r from-blue-500 to-blue-700',
    DATA_SAVER: 'bg-gradient-to-r from-green-500 to-green-700',
  };

  const Icon = icons[quality];

  return (
    <motion.button
      className={`px-4 py-1 rounded-full text-xs font-medium ${qualityColors[quality]} text-white inline-flex items-center justify-center space-x-1.5`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <Icon className="w-3 h-3" />
      <span>{quality}</span>
    </motion.button>
  );
};

// Enhanced ActionButton with smooth animations
const ActionButton: React.FC<{
  icon: React.FC<SVGProps<SVGSVGElement>>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <motion.button
    className="flex flex-col items-center space-y-1"
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center
        ${active ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white/60'}
        transition-all duration-200 hover:bg-white/20`}
    >
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-xs text-white/60">{label}</span>
  </motion.button>
);


const MobilePlayer: React.FC<MobilePlayerProps> = ({
  currentTrack,
  isPlaying,
  togglePlay,
  skipTrack,
  previousTrack,
  seekPosition,
  repeatMode,        
  setRepeatMode,
  duration,
  handleSeek,
  isLiked,
  toggleLike,
  lyrics,
  currentLyricIndex,
  showLyrics,
  toggleLyricsView,
  shuffleOn,
  shuffleQueue,
  queue,
  currentTrackIndex,
  onQueueItemClick,
  setIsPlayerOpen
}) => {
  // State management
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('MAX');
  // const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connectedDevice] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [miniPlayerTouchStartY, setMiniPlayerTouchStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [textOverflow, setTextOverflow] = useState(false);
  const [isSmallDevice, setIsSmallDevice] = useState(false);

  const togglePlayer = () => {
    setIsExpanded(!isExpanded);
    setIsPlayerOpen(!isExpanded);
  };

  // Add this somewhere near the top of the component body
useEffect(() => {
  console.log("MobilePlayer repeatMode state:", repeatMode);
}, [repeatMode]);

// In MobilePlayer.tsx, where you handle repeat mode changes
  


  // Refs
  const playerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const miniPlayerRef = useRef<HTMLDivElement>(null);

  const handleMiniPlayerTouchStart = (e: React.TouchEvent) => {
    setMiniPlayerTouchStartY(e.touches[0].clientY);
  };

  
  
  const handleMiniPlayerTouchMove = (e: React.TouchEvent) => {
    if (miniPlayerTouchStartY !== null) {
      const deltaY = miniPlayerTouchStartY - e.touches[0].clientY;
      if (deltaY > 50) {
        setIsExpanded(true);
        setMiniPlayerTouchStartY(null);
      }
    }
  };
  
  const handleMiniPlayerTouchEnd = () => {
    setMiniPlayerTouchStartY(null);
  };

  // Motion controls
  const controls = useAnimation();

  const handleBackClick = () => {
    if (backClickTimeout) {
      clearTimeout(backClickTimeout);
      backClickTimeout = null;
      previousTrack();
    } else {
      backClickTimeout = setTimeout(() => {
        handleSeek(0);
        backClickTimeout = null;
      }, 300);
    }
  };

  const handleForwardClick = () => {
    if (forwardClickTimeout) {
      clearTimeout(forwardClickTimeout);
      forwardClickTimeout = null;
      // Double click: Skip to the next track
      skipTrack();
    } else {
      forwardClickTimeout = setTimeout(() => {
        // Single click: Restart current track if near the end, or go to the next track
        if (seekPosition > duration - 5) {
          skipTrack();
        } else {
          handleSeek(duration); // Jump to the end of the current track
        }
        forwardClickTimeout = null;
      }, 300);
    }
  };

  // Effect for viewport size detection
  useEffect(() => {
    const checkViewportSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsSmallDevice(width <= 375 || height <= 667);
    };

    checkViewportSize();
    window.addEventListener('resize', checkViewportSize);
    return () => window.removeEventListener('resize', checkViewportSize);
  }, []);

  // Effect for text overflow detection
  useEffect(() => {
    if (titleRef.current) {
      setTextOverflow(titleRef.current.scrollWidth > titleRef.current.clientWidth);
    }
  }, [currentTrack, isSmallDevice]);

  // Touch handlers with gesture detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const xDiff = touchStart.x - e.touches[0].clientX;
    const yDiff = touchStart.y - e.touches[0].clientY;
    const isHorizontalSwipe = Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 50;

    if (isHorizontalSwipe && !isDragging) {
      if (xDiff > 0) {
        controls.start({ x: '-100%', opacity: 0, transition: { duration: 0.3 } })
          .then(() => {
            skipTrack();
            controls.set({ x: '100%', opacity: 0 });
            controls.start({ x: 0, opacity: 1, transition: { duration: 0.3 } });
          });
      } else {
        controls.start({ x: '100%', opacity: 0, transition: { duration: 0.3 } })
          .then(() => {
            previousTrack();
            controls.set({ x: '-100%', opacity: 0 });
            controls.start({ x: 0, opacity: 1, transition: { duration: 0.3 } });
          });
      }
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStart(null);
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Action items
  const moreOptionsItems = [
    { icon: Ban, label: "Don't play", action: () => console.log('Blocked') },
    { icon: UserPlus, label: 'Follow', action: () => console.log('Following') },
    { icon: Library, label: 'Add to Playlist', action: () => console.log('Added to playlist') },
    { icon: Radio, label: 'Start Radio', action: () => console.log('Started radio') },
    { icon: Share, label: 'Share', action: () => console.log('Shared') },
    { icon: Flag, label: 'Report', action: () => console.log('Reported') },
    { icon: Lock, label: 'Download Quality', action: () => setShowAudioMenu(true) },
    { icon: AlertCircle, label: 'Song Info', action: () => console.log('Info') },
  ];

  const actionButtons = [
    { icon: Heart, label: 'Like', active: isLiked, onClick: toggleLike },
    { icon: Plus, label: 'Add to', onClick: () => setShowAddToPlaylistModal(true) },
    { icon: Download, label: 'Download', onClick: () => console.log('Download') },
    { icon: Music, label: 'Lyrics', active: showLyrics, onClick: toggleLyricsView },
    { icon: Radio, label: 'Radio', onClick: () => console.log('Start radio') },
    { icon: Mic2, label: 'Sing', onClick: () => console.log('Start karaoke') },
    { icon: ListMusic, label: 'Queue', onClick: () => setShowQueue(true) },
  ];

  // Get visible action buttons based on screen size
  const getVisibleActionButtons = () => {
    // Get the first 4 buttons to display
    const visibleButtons = actionButtons.slice(0, 4);
  
    // Add the 'More' button if there are additional action buttons
    if (actionButtons.length > 4) {
      visibleButtons.push({
        icon: MoreHorizontal,
        label: 'More',
        onClick: () => setShowMoreOptions(true), // Opens the modal or menu
      });
    }
  
    return visibleButtons;
  };
  
  

  return (
    <div className="px-6 flex flex-col items-center">
      <div className="fixed bottom-16 left-0 right-0 z-50">
      {/* Mini Player */}
      {!isExpanded && (
        <motion.div
          ref={miniPlayerRef}
          className="mx-2 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={togglePlayer}
          onTouchStart={handleMiniPlayerTouchStart}
          onTouchMove={handleMiniPlayerTouchMove}
          onTouchEnd={handleMiniPlayerTouchEnd}
          // onTouchStart={handleTouchStart}
          // onTouchMove={handleTouchMove}
          // onTouchEnd={handleTouchEnd}
          animate={controls}
        >
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <motion.div
                  className="relative w-12 h-12 rounded-lg overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                >
                  <img
                    src={currentTrack.album.cover_medium}
                    alt={currentTrack.title}
                  />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div
                    ref={titleRef}
                    className="text-white font-medium truncate"
                  >
                    {currentTrack.title}
                  </div>
                  <p className="text-white/60 text-sm truncate">{currentTrack.artist.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
              <button
                className="p-3 hover:bg-white/10 rounded-full transition-colors"
                onClick={handleBackClick}
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>

                <button
                  className="p-3 hover:bg-white/10 rounded-full transition-colors"
                  onClick={handleForwardClick}
                >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>


                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike();
                  }}
                >
                  <Heart
                    className={`w-5 h-5 ${isLiked ? 'fill-green-500 text-green-500' : 'text-white/60'}`}
                  />
                </button>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="mt-2">
              <Seekbar
                progress={seekPosition / duration}
                handleSeek={handleSeek}
                duration={duration}
                isMiniplayer
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={playerRef}
            className="fixed inset-0 z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <button
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={togglePlayer}
              >
                <ChevronDown className="w-6 h-6 text-white" />
              </button>

              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Cast className="w-5 h-5 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Airplay className="w-5 h-5 text-white/60" />
                </button>
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowQueue(true)}
                >
                  <ListMusic className="w-5 h-5 text-white/60" />
                </button>
                {isSmallDevice && (
                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => setShowMoreOptions(true)}
                  >
                    <MoreHorizontal className="w-5 h-5 text-white/60" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="px-4 flex flex-col items-center">
              {showLyrics ? (
                <div className="h-[calc(100vh-32vh)] w-full overflow-y-auto overflow-hidden ">
                  <div className="flex items-center mb-6">
                    <button
                      onClick={toggleLyricsView}
                      className="hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="text-lg font-semibold text-white ml-4">Lyrics</h2>
                  </div>
                  <div className="space-y-6">
                  {lyrics.map((lyric, index) => (
                    <motion.p
                      key={index}
                      className={`text-lg text-center ${
                        index === currentLyricIndex ? 'text-white scale-105' : 'text-white/40'
                      }`}
                      onClick={() => handleSeek(lyric.time)}
                    >
                      {lyric.text}
                    </motion.p>
                  ))}
                  </div>
                </div>
              ) : showQueue ? (
                <div className="h-[calc(100vh-32vh)] w-full overflow-y-auto overflow-hidden">
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => setShowQueue(false)}
                      className="hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="text-lg font-semibold text-white ml-4">Up Next</h2>
                  </div>
                  <div className="space-y-4">
                    {queue.map((track, index) => (
                      <motion.div
                      key={index}
                      className={`flex items-center space-x-4 p-2 rounded-lg ${
                        track.id === currentTrack.id ? 'bg-white/10' : 'hover:bg-white/10'
                      } ${index < currentTrackIndex ? 'opacity-50' : ''}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onQueueItemClick(track, index)}
                    >
                        <div className="w-12 h-12 relative rounded-lg overflow-hidden">
                          <img
                            src={track.album.cover_medium}
                            alt={track.title}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{track.title}</p>
                          <p className="text-white/60 text-sm truncate">{track.artist.name}</p>
                        </div>
                        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-white/60" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Album Art with Blur Background */}
                  <div className="relative w-full flex justify-center items-center mb-8">
                    <div
                      className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-80"
                      style={{ backgroundImage: `url(${currentTrack.album.cover_medium})` }}
                    />
                    <motion.div
                      className={`relative z-10 ${
                        isSmallDevice ? 'w-48 h-48' : 'w-64 h-64'
                      } rounded-2xl overflow-hidden shadow-2xl`}
                      layoutId="album-art"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <img
                        src={currentTrack.album.cover_medium}
                        alt={currentTrack.title}
                      />
                    </motion.div>
                  </div>

                  {/* Track Info */}
                  <div className="w-full text-center mb-8">
                    <h2 className={`${isSmallDevice ? 'text-xl' : 'text-2xl'} font-bold text-white mb-2`}>
                      {currentTrack.title}
                    </h2>
                    <p className="text-white/60">{currentTrack.artist.name}</p>
                  </div>

                  {/* Quality Badge */}
                  <QualityBadge quality={audioQuality} onClick={() => setShowAudioMenu(true)} />

                  {/* Seekbar and Time */}
                  <div className="w-full mb-8 mt-6">
                  <Seekbar
                    progress={seekPosition / duration}
                    handleSeek={handleSeek}
                    duration={duration}
                  />

                  <div className="flex justify-between text-sm text-white/60 mt-2">
                      <span>{formatTime(seekPosition)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="w-full flex items-center justify-between mb-8">
                    <button
                      onClick={shuffleQueue}
                      className={`p-3 rounded-full transition-colors ${
                        shuffleOn ? 'text-green-500' : 'text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Shuffle className="w-6 h-6" />
                    </button>

                    <div className="flex items-center space-x-8">
                    <button
                      className="p-3 hover:bg-white/10 rounded-full transition-colors"
                      onClick={handleBackClick}
                    >
                      <SkipBack className="w-6 h-6 text-white" />
                    </button>

                      <motion.button
                        className="w-16 h-16 rounded-full bg-white flex items-center justify-center
                                hover:bg-white/90 transition-colors"
                        whileTap={{ scale: 0.95 }}
                        onClick={togglePlay}
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8 text-black" />
                        ) : (
                          <Play className="w-8 h-8 text-black ml-1" />
                        )}
                      </motion.button>

                      <button
                        className="p-3 hover:bg-white/10 rounded-full transition-colors"
                        onClick={handleForwardClick}
                      >
                        <SkipForward className="w-6 h-6 text-white" />
                      </button>

                    </div>

                    <button
                      onClick={() => {
                        const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
                        setRepeatMode(nextMode);
                      }}
                      className="p-3 rounded-full transition-colors"
                    >
                      {repeatMode === 'one' ? (
                        <Repeat1 className="w-6 h-6 text-green-500" />
                      ) : (
                        <Repeat
                          className={`w-6 h-6 ${repeatMode === 'all' ? 'text-green-500' : 'text-white/60'}`}
                        />
                      )}
                    </button>
                  </div>

                  {/* Responsive Action Buttons Grid */}
                  <div className={`w-full grid grid-cols-4 gap-4 mb-6`}>
                    {getVisibleActionButtons().map((btn, index) => (
                      <ActionButton
                        key={index}
                        icon={btn.icon}
                        label={btn.label}
                        active={btn.active}
                        onClick={btn.onClick}
                      />
                    ))}
                  </div>

                </>
              )}
            </div>

            {/* Audio Quality Menu Modal */}
            <AnimatePresence>
              {showAudioMenu && (
                <motion.div
                  className="fixed inset-0 bg-black/80 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAudioMenu(false)}
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4">
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                      <h3 className="text-lg font-bold text-white mb-4">Audio Quality</h3>

                      {(['MAX', 'HIGH', 'NORMAL', 'DATA_SAVER'] as AudioQuality[]).map((quality) => (
                        <button
                          key={quality}
                          className={`w-full flex items-center justify-between p-4 rounded-lg mb-2
                            ${audioQuality === quality ? 'bg-white/10' : 'hover:bg-white/5'}`}
                          onClick={() => {
                            setAudioQuality(quality);
                            setShowAudioMenu(false);
                          }}
                        >
                          <div>
                            <p className="text-white font-medium">{quality}</p>
                            <p className="text-sm text-white/60">
                              {quality === 'MAX' && 'HiFi Plus Quality (24-bit, up to 192kHz)'}
                              {quality === 'HIGH' && 'HiFi Quality (16-bit, 44.1kHz)'}
                              {quality === 'NORMAL' && 'High Quality (320kbps AAC)'}
                              {quality === 'DATA_SAVER' && 'Data Saver (128kbps AAC)'}
                            </p>
                          </div>
                          {quality === audioQuality && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <motion.div
                                className="w-3 h-3 bg-white rounded-full"
                                layoutId="quality-indicator"
                              />
                            </div>
                          )}
                        </button>
                      ))}

                      <button
                        className="w-full py-4 text-white/60 hover:text-white transition-colors mt-4"
                        onClick={() => setShowAudioMenu(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* More Options Modal */}
            <AnimatePresence>
              {showMoreOptions && (
                <motion.div
                  className="fixed inset-0 bg-black/80 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMoreOptions(false)}
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl max-h-[80%] overflow-y-auto"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4">
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

                      <div className={`grid ${isSmallDevice ? 'grid-cols-3' : 'grid-cols-4'} gap-4 mb-8`}>
                        {moreOptionsItems.map((item, index) => (
                          <ActionButton
                            key={index}
                            icon={item.icon}
                            label={item.label}
                            onClick={() => {
                              item.action();
                              setShowMoreOptions(false);
                            }}
                          />
                        ))}
                        {/* Additional buttons for small devices */}
                        {isSmallDevice &&
                          actionButtons.slice(3).map((btn, index) => (
                            <ActionButton
                              key={`additional-${index}`}
                              icon={btn.icon}
                              label={btn.label}
                              active={btn.active}
                              onClick={() => {
                                btn.onClick?.();
                                setShowMoreOptions(false);
                              }}
                            />
                          ))}
                      </div>

                      <button
                        className="w-full py-4 text-white/60 hover:text-white transition-colors"
                        onClick={() => setShowMoreOptions(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
          display: inline-block;
          padding-right: 2rem;
        }

        /* Enhanced seekbar thumb styling */
        input[type="range"] {
          appearance: none;
          background: transparent;
          cursor: pointer;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 4px;
          background: white;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        /* Additional styles for Firefox */
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 4px;
          background: white;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }

      .overflow-hidden {
        overflow-x: hidden;
      }


        /* Media queries for responsive layout */
        @media (max-width: 375px) {
          .grid-cols-4 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 375px) {
          /* Adjust sizes for small screens */
          .text-2xl {
            font-size: 1.5rem;
          }
          .w-64 {
            width: 16rem;
          }
          .h-64 {
            height: 16rem;
          }
        }


        /* Enhanced touch area for better mobile interaction */
        @media (max-width: 640px) {
          button {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Scale adjustments for smaller devices */
        @media (max-height: 667px) {
          .w-64 {
            width: 12rem;
          }
          .h-64 {
            height: 12rem;
          }
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
    </div>
  );
};

export default MobilePlayer;

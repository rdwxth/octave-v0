/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, SVGProps, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
import {
  Heart, Play, Pause, SkipBack, SkipForward, ChevronDown,
  Music, Download, Share2, Radio, Plus, Library,
  Shuffle, Repeat, Repeat1, Mic2, ListMusic,
  ArrowLeft, MoreHorizontal, Cast, Airplay,
  Ban, Crown, Settings, 
  Share, Star, RefreshCw, Flag, AlertCircle, Lock, UserPlus, Trash2,
} from 'lucide-react';

import Vibrant from 'node-vibrant'; // Import library

// Original interfaces
// interface Artist {
//   name: string;
// }

// interface Album {
//   title: string;
//   cover_medium: string;
// }

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


interface Lyric {
  time: number;
  text: string;
}

interface ActionButtonProps {
  icon: React.FC<SVGProps<SVGSVGElement>>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

type AudioQuality = 'MAX' | 'HIGH' | 'NORMAL' | 'DATA_SAVER';
type RepeatMode = 'off' | 'all' | 'one';

interface MobilePlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  previousTracks: Track[]; // Add this
  togglePlay: () => void;
  skipTrack: () => void | Promise<void>;
  previousTrack: () => void;
  seekPosition: number;
  visibleActionButtons?: ActionButtonProps[];
  moreOptionsButtons?: ActionButtonProps[];
  duration: number;
  handleSeek: (time: number) => void; 
  isLiked: boolean;
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleLike: () => void;
  removeFromQueue: (index: number) => void;
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
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const [isHovering, setIsHovering] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const calculateProgress = useCallback((clientX: number): number | null => {
    if (!progressRef.current) return null;
    const rect = progressRef.current.getBoundingClientRect();
    const newProgress = (clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, newProgress));
  }, []);

  const handleInteractionStart = useCallback((clientX: number) => {
    setIsDragging(true);
    const newProgress = calculateProgress(clientX);
    if (newProgress !== null) {
      setLocalProgress(newProgress);
    }
  }, [calculateProgress]);

  useEffect(() => {
    const handleInteractionMove = (clientX: number) => {
      if (isDragging) {
        const newProgress = calculateProgress(clientX);
        if (newProgress !== null) {
          setLocalProgress(newProgress);
        }
      }
    };

    const handleInteractionEnd = () => {
      if (isDragging) {
        handleSeek(localProgress * duration);
        setIsDragging(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleInteractionMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleInteractionMove(e.touches[0].clientX);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleInteractionEnd);
      document.addEventListener('touchend', handleInteractionEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, calculateProgress, handleSeek, duration, localProgress]);

  return (
    <div 
      className="mx-4 relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        ref={progressRef}
        className={`relative w-full ${isMiniplayer ? 'h-0.5' : 'h-1'} cursor-pointer rounded-full bg-white/20`}
        onMouseDown={(e) => handleInteractionStart(e.clientX)}
        onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX)}
      >
        <motion.div
          className="absolute left-0 top-0 h-full bg-white rounded-full"
          style={{ width: `${localProgress * 100}%` }}
          animate={{ width: `${localProgress * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <div
  className={`absolute w-3 h-3 bg-white rounded-full shadow-lg cursor-grab transition-opacity duration-200 ${
    isHovering || isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
  }`}
  style={{
    top: '50%',
    transform: 'translateY(-50%)',
    left: `${localProgress * 100}%`,
  }}
/>

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
  previousTracks,
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
  removeFromQueue,
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
  const [dragValue, setDragValue] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connectedDevice] = useState<string | null>(null);
  // Add this near the top of the MobilePlayer component where other state/refs are defined
    const audioRef = useRef<HTMLAudioElement>(new Audio());
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [miniPlayerTouchStartY, setMiniPlayerTouchStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [textOverflow, setTextOverflow] = useState(false);
  const [isSmallDevice, setIsSmallDevice] = useState(false);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoScrollingRef = useRef(false);

// Modify the handleUserScroll function
const handleUserScroll = (e: React.UIEvent<HTMLDivElement>) => {
  console.log('isAutoScrolling:', isAutoScrollingRef.current);
  
  if (isAutoScrollingRef.current) {
    return;
  }

  setUserScrolling(true);
  
  if (userScrollTimeoutRef.current) {
    clearTimeout(userScrollTimeoutRef.current);
  }

  userScrollTimeoutRef.current = setTimeout(() => {
    setUserScrolling(false);
  }, 3000);
};

  const togglePlayer = () => {
    setIsExpanded(!isExpanded);
    setIsPlayerOpen(!isExpanded);
  };

  // Update the color extraction function
  useEffect(() => {
    const extractColor = async () => {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = currentTrack.album.cover_medium;
        
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
  
          // Set canvas size to 1x1 as we just want the average color
          canvas.width = 1;
          canvas.height = 1;
  
          // Draw image and scale it down to 1x1 pixels
          ctx.drawImage(img, 0, 0, 1, 1);
          
          // Get pixel data
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          
          // Create color string
          const color = `rgb(${r}, ${g}, ${b})`;
          setDominantColor(color);
        };
  
        img.onerror = () => {
          console.error('Error loading image');
          setDominantColor('#000000');
        };
      } catch (error) {
        console.error('Error extracting color:', error);
        setDominantColor('#000000');
      }
    };
  
    if (currentTrack.album.cover_medium) {
      extractColor();
    }
  }, [currentTrack.album.cover_medium]);

  


  // Add new state to track if lyrics view is active
  useEffect(() => {
    // Only proceed if lyrics view is active
    if (!showLyrics) {
      return;
    }
      
    const lyricsContainer = lyricsRef.current;
    if (!lyricsContainer || currentLyricIndex === -1 || userScrolling) {
      return;
    }
  
    const scrollToLyric = () => {
      const currentLyricElement = lyricsContainer.children[currentLyricIndex] as HTMLElement;
      if (currentLyricElement) {
        isAutoScrollingRef.current = true;
        
        // Get the element's position within the container
        const elementOffset = currentLyricElement.offsetTop;
        const elementHeight = currentLyricElement.offsetHeight;
        const containerHeight = lyricsContainer.clientHeight;
        
        // Calculate center position
        const scrollPosition = elementOffset - (containerHeight / 2) + (elementHeight / 2);
        
        if (scrollPosition >= 0) {
          lyricsContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
  
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 1000);
      }
    };
  
    // Add a small delay to ensure the container is properly rendered
    setTimeout(scrollToLyric, 100);
  
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [currentLyricIndex, userScrolling, showLyrics]);

  // Add this cleanup effect
  useEffect(() => {
    const currentAudioRef = audioRef.current;
    
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      localStorage.setItem('queue', JSON.stringify(queue));
      localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
      localStorage.setItem('savedPosition', currentAudioRef.currentTime.toString());
      localStorage.setItem('wasPlaying', isPlaying.toString());
    };
  }, [queue, currentTrack, isPlaying]); // Add these dependencies
  

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

  let backClickCount = 0;

const handleBackClick = () => {
  backClickCount++;

  if (backClickCount === 1) {
    // First click: decide whether to seek or skip
    setTimeout(() => {
      if (backClickCount === 1) {
        // If the seek position is greater than 5 seconds, seek to the beginning
        if (seekPosition > 5) {
          handleSeek(0); // Seek to the start of the current track
        } else {
          // If within the first 5 seconds, skip to the previous track
          previousTrack();
        }
      }

      // Reset the click count after handling single-click
      backClickCount = 0;
    }, 300); // Allow 300ms for a possible second click
  } else if (backClickCount === 2) {
    // On double-click, skip to the previous track
    previousTrack();

    // Reset click count immediately
    backClickCount = 0;
  }
};


  let forwardClickCount = 0;

const handleForwardClick = () => {
  forwardClickCount++;

  if (forwardClickCount === 1) {
    // First click: decide whether to seek or skip
    setTimeout(() => {
      if (forwardClickCount === 1) {
        const timeRemaining = duration - seekPosition;

        if (timeRemaining <= 5) {
          // Skip to the next track if near the end
          skipTrack();
        } else {
          // Seek to the end of the current track
          handleSeek(duration);
        }
      }

      // Reset the click count after handling single-click
      forwardClickCount = 0;
    }, 300); // Allow 300ms for a possible second click
  } else if (forwardClickCount === 2) {
    // On double-click, skip to the next track
    skipTrack();

    // Reset click count immediately
    forwardClickCount = 0;
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
      setIsDragging(true); // Prevent multiple triggers
  
      if (xDiff > 0) {
        // Swipe left for next track
        controls.start({ x: '-100%', transition: { duration: 0.3 } }).then(() => {
          skipTrack();
          controls.set({ x: '100%' });
          controls.start({ x: 0, transition: { duration: 0.3 } });
        });
      } else {
        // Swipe right for previous track
        controls.start({ x: '100%', transition: { duration: 0.3 } }).then(() => {
          previousTrack();
          controls.set({ x: '-100%' });
          controls.start({ x: 0, transition: { duration: 0.3 } });
        });
      }
  
      setTouchStart(null);
    }
  };


  const handleMiniPlayerDragEnd = (info: PanInfo) => {
    const threshold = 100; // Minimum drag distance to switch songs
  
    if (info.offset.x > threshold) {
      // Swiped right -> Previous track
      controls.start({ x: '100%', transition: { duration: 0.3 } }).then(() => {
        previousTrack();
        controls.set({ x: '-100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else if (info.offset.x < -threshold) {
      // Swiped left -> Next track
      controls.start({ x: '-100%', transition: { duration: 0.3 } }).then(() => {
        skipTrack();
        controls.set({ x: '100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else {
      // Not enough swipe distance -> Snap back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300 } });
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
    const actionButtons = [
      { icon: Heart, label: 'Like', active: isLiked, onClick: toggleLike },
      { icon: Plus, label: 'Add to', onClick: () => setShowAddToPlaylistModal(true) },
      { icon: Download, label: 'Download', onClick: () => console.log('Download') },
    ];

    // Update the moreOptionsItems array
    const moreOptionsItems = [
      { icon: Heart, label: 'Like', active: isLiked, onClick: toggleLike },
      { icon: Ban, label: "Dislike", action: () => console.log('Blocked') },
      { icon: Share2, label: 'Share', action: () => console.log('Karoke Time to Sing!!') },
      { icon: UserPlus, label: 'Follow', action: () => console.log('Following') },
      { icon: Radio, label: 'Start Radio', action: () => console.log('Started radio') },
      { icon: Library, label: 'Add to', onClick: () => setShowAddToPlaylistModal(true) },
      { icon: Share, label: 'Upload / Copy', action: () => console.log('Shared') },
      { icon: Music, label: 'Lyrics', active: showLyrics, onClick: toggleLyricsView },
      { icon: Flag, label: 'Report', action: () => console.log('Reported') },
      { icon: Download, label: 'Download', onClick: () => console.log('Download') },
      { icon: Lock, label: 'Audio Quality', onClick: () => console.log('Download') },
      { icon: AlertCircle, label: 'Song Info', action: () => console.log('Info') },
      { icon: Mic2, label: 'Karoke', action: () => console.log('Karoke Time to Sing!!') },
      { icon: Library, label: 'N/A for Now', action: () => console.log('Karoke Time to Sing!!') },
    ];

  // Get visible action buttons based on screen size
  // Get visible action buttons based on screen size and viewport space

  const [windowDimensions, setWindowDimensions] = useState<{width: number; height: number}>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const getVisibleActionButtons = () => {
    const isSmallScreen = windowDimensions.height <= 667 || windowDimensions.width <= 375;
    const shouldMoveToMoreMenu = isSmallScreen;

    if (shouldMoveToMoreMenu) {
      return [{
        icon: MoreHorizontal,
        label: 'More',
        onClick: () => setShowMoreOptions(true)
      }];
    }

    return [...actionButtons, {
      icon: MoreHorizontal,
      label: 'More',
      onClick: () => setShowMoreOptions(true)
    }];
  };

  const handleDragEnd = (info: PanInfo) => {
    const threshold = 100; // Minimum distance to trigger a track change
  
    if (info.offset.x > threshold) {
      // Dragged to the right -> Go to previous track
      controls.start({ x: '100%', transition: { duration: 0.3 } }).then(() => {
        previousTrack();
        controls.set({ x: '-100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else if (info.offset.x < -threshold) {
      // Dragged to the left -> Go to next track
      controls.start({ x: '-100%', transition: { duration: 0.3 } }).then(() => {
        skipTrack();
        controls.set({ x: '100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else {
      // Not far enough -> Snap back to the center
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300 } });
    }
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
          background: dominantColor
            ? `linear-gradient(to bottom, ${dominantColor}CC, rgba(0, 0, 0, 0.95))`
            : 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        drag="x" // Allow horizontal dragging
        dragConstraints={{ left: 0, right: 0 }} // Limit drag to horizontal axis
        dragElastic={0.2} // Add a slight bounce for a better UX
        onDragEnd={(event, info) => handleMiniPlayerDragEnd(info)} // Handle drag end
        animate={controls} // Animate changes smoothly
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering nested click handlers
          setIsExpanded(true); // Expand the player
          setIsPlayerOpen(true); // Ensure the expanded state is synced with parent
        }}
        onTouchStart={handleMiniPlayerTouchStart}
        onTouchMove={handleMiniPlayerTouchMove}
        onTouchEnd={handleMiniPlayerTouchEnd}
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
                onClick={(e) => {
                  e.stopPropagation(); // Prevents triggering the parent click handler
                  handleBackClick(); // Perform back skip logic
                }}
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
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents triggering the parent click handler
                    handleForwardClick(); // Perform forward skip logic
                  }}
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
          className={`fixed inset-0 z-50 flex flex-col ${isSmallDevice ? '' : 'justify-center'}`}
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
            <div className={`px-4 flex-grow flex flex-col items-center ${isSmallDevice ? '' : 'justify-center min-h-0'}`}>
              {showLyrics ? (
                <div 
                className="h-[calc(100vh-10vh)] w-full overflow-y-auto overflow-hidden"
              >
                <div className="flex items-center mb-6">
                  <button
                    onClick={toggleLyricsView}
                    className="hover:bg-white/10 p-2 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <h2 className="text-lg font-semibold text-white ml-4">Lyrics</h2>
                </div>
                <div 
                  className="space-y-6 overflow-y-auto" 
                  ref={lyricsRef}
                  style={{ height: 'calc(100% - 4rem)' }}  // Ensure fixed height
                  onScroll={handleUserScroll}
                >
                  {lyrics.map((lyric, index) => (
                    <motion.p
                      key={index}
                      className={`text-lg text-center transition-all duration-300 ${
                        index === currentLyricIndex 
                          ? 'text-white scale-105 font-bold'
                          : 'text-white/40'
                      }`}
                      onClick={() => handleSeek(lyric.time)}
                    >
                      {lyric.text}
                    </motion.p>
                  ))}
                </div>
              </div>
              ) : showQueue ? (
                <div className="h-[calc(100vh-10vh)] w-full overflow-y-auto overflow-hidden">
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
                    {/* Previous tracks - greyed out */}
                    {previousTracks.map((track, index) => (
                      <motion.div
                        key={`prev-${track.id}-${index}`}
                        className="flex items-center space-x-4 p-2 rounded-lg hover:bg-white/10 opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onQueueItemClick(track, -1 * (index + 1))}
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

                    {/* Current and upcoming tracks */}
                    {queue.map((track, index) => (
                    <AnimatePresence key={`queue-${track.id}-${index}`}>
                      <motion.div className="relative">
                        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4">
                          <Trash2 className="w-6 h-6 text-white" />
                        </div>
                        
                        <motion.div
                          className="relative bg-black"
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.2}
                          onDragEnd={(event, info: PanInfo) => {
                            if (info.offset.x < -100) {
                              removeFromQueue(index);
                            }
                          }}
                        >
                          <div 
                            className={`flex items-center space-x-4 p-2 rounded-lg ${
                              track.id === currentTrack.id ? 'bg-white/10' : 'hover:bg-white/10'
                            }`}
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

                            <div className="flex items-center space-x-2">
                              <button 
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMoreOptions(true);  
                                }}
                              >
                                <MoreHorizontal className="w-5 h-5 text-white/60" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                    ))}
                  </div>
                  {/* Mini Player */}
<div className="fixed bottom-0 left-0 right-0 z-50 bg-black py-4">
  <div 
    className="mx-2 rounded-xl overflow-hidden"
    style={{
      background: dominantColor
        ? `linear-gradient(to bottom, ${dominantColor}CC, rgba(0, 0, 0, 0.95))`
        : 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
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
            onClick={(e) => {
              e.stopPropagation(); // Prevents triggering the parent click handler
              handleBackClick(); // Perform back skip logic
            }}
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
            onClick={(e) => {
              e.stopPropagation(); // Prevents triggering the parent click handler
              handleForwardClick(); // Perform forward skip logic
            }}
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
  </div>
</div>
                </div>

                
                
              ) : (
                <>
                  {/* Album Art with Blur Background */}
                  {/* Album Art with Blur Background */}
<div className="relative w-full flex justify-center items-center mb-8">
  {/* Background Blur */}
  <div
  className="absolute inset-0"
  style={{
    backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url(${currentTrack.album.cover_medium})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(20px)',
    transform: 'scale(1.2)',
    zIndex: -1,
  }}
></div>


  {/* Foreground Album Art */}
  <motion.div
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.2}
    onDrag={(event, info) => setDragValue(info.offset.x)}
    onDragEnd={(event, info) => {
      setDragValue(0); // Reset dragValue on drag end
      handleDragEnd(info);
    }}
    className="relative z-10"
  >
    <img
      src={currentTrack.album.cover_medium}
      alt={currentTrack.title}
      className="rounded-lg shadow-xl"
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
    active={item.active}
    onClick={() => {
      if (item.onClick) {
        item.onClick();
      } else if (item.action) {
        item.action();
      }
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

        .mini-player {
  background: rgba(0, 0, 0, 0.85); /* Fallback background */
  backdrop-filter: blur(12px); /* Blur effect */
  -webkit-backdrop-filter: blur(12px); /* For Safari */
  border-radius: 16px; /* Rounded edges for better UX */
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

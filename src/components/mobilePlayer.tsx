// mobilePlayer.tsx (mobile)
import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  TouchEvent,
} from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import {
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Volume2,
  Shuffle,
  Music,
  Mic2,
  Share2,
  MoreHorizontal,
  Repeat,
  Repeat1,
  Radio,
  Download,
  ListMusic,
  ArrowLeft,
  Clock,
  Filter,
} from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';

// Interfaces for data structures
interface Artist {
  name: string;
}

interface Album {
  cover_medium: string;
}

interface Track {
  title: string;
  artist: Artist;
  album: Album;
}

interface Lyric {
  time: number;
  text: string;
}

// Enhanced Mobile Header with Search
interface MobileHeaderProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  toggleFilters: () => void;
  showFilters: boolean;
  onBackClick: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  toggleFilters,
  showFilters,
  onBackClick,
}) => (
  <motion.div
    className="sticky top-0 z-30 bg-black/90 backdrop-blur-lg px-4 py-3"
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
  >
    <div className="flex items-center gap-3">
      {showFilters && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onBackClick}
          className="p-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
      )}
      <div className="relative flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearchQuery(e.target.value)
          }
          placeholder="Search tracks, artists, or albums..."
          className="w-full bg-white/10 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300"
        />
        <Filter
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60"
          onClick={toggleFilters}
        />
      </div>
      <button className="p-2">
        <Clock className="w-6 h-6" />
      </button>
    </div>

    {/* Filter Pills */}
    <AnimatePresence>
      {showFilters && (
        <motion.div
          className="flex gap-2 overflow-x-auto py-3 no-scrollbar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          {['Songs', 'Artists', 'Albums', 'Playlists', 'Podcasts'].map(
            (filter) => (
              <button
                key={filter}
                className="flex-shrink-0 px-4 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {filter}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

// Enhanced Lyrics View
interface EnhancedLyricsViewProps {
  lyrics: Lyric[];
  currentLyricIndex: number;
  currentTrack: Track;
  onClose: () => void;
  isPlaying: boolean;
  togglePlay: () => void;
  formatTime: (seconds: number) => string;
  seekPosition: number;
  duration: number;
}

const EnhancedLyricsView: React.FC<EnhancedLyricsViewProps> = ({
  lyrics,
  currentLyricIndex,
  currentTrack,
  onClose,
  isPlaying,
  togglePlay,
  formatTime,
  seekPosition,
  duration,
}) => {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const progressValue = useMotionValue(0);
  const progressColor = useTransform(
    progressValue,
    [0, 100],
    ['rgb(59, 130, 246)', 'rgb(16, 185, 129)']
  );

  useEffect(() => {
    if (duration > 0) {
      progressValue.set((seekPosition / duration) * 100);
    }
  }, [seekPosition, duration, progressValue]);

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md p-4">
        <div className="flex justify-between items-center">
          <button onClick={onClose}>
            <ChevronDown className="w-6 h-6" />
          </button>
          <span className="text-sm font-medium">LYRICS</span>
          <button>
            <Share2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Album Art and Title */}
      <div className="px-4 py-6 text-center">
        <motion.img
          src={currentTrack?.album?.cover_medium}
          alt={currentTrack?.title}
          className="w-32 h-32 rounded-lg mx-auto mb-4 shadow-2xl"
          layoutId="lyrics-cover"
        />
        <h2 className="text-xl font-bold">{currentTrack?.title}</h2>
        <p className="text-white/60">{currentTrack?.artist?.name}</p>
      </div>

      {/* Lyrics Scroll View */}
      <div
        ref={lyricsRef}
        className="flex-1 overflow-y-auto px-4 pb-32 pt-4"
        style={{
          height: 'calc(100vh - 350px)',
          scrollBehavior: 'smooth',
        }}
      >
        {lyrics.map((lyric: Lyric, index: number) => (
          <motion.p
            key={index}
            className={`text-center text-lg mb-8 transition-all duration-300 ${
              index === currentLyricIndex
                ? 'text-white scale-105 font-bold'
                : 'text-white/40'
            }`}
            animate={{
              opacity: index === currentLyricIndex ? 1 : 0.4,
            }}
          >
            {lyric.text}
          </motion.p>
        ))}
      </div>

      {/* Player Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <motion.div
            className="h-1 bg-white/10 rounded-full overflow-hidden"
            style={{ width: `${(seekPosition / duration) * 100}%` }}
          >
            <motion.div
              className="h-full w-full"
              style={{ backgroundColor: progressColor }}
            />
          </motion.div>
          <div className="flex justify-between mt-1 text-xs text-white/60">
            <span>{formatTime(seekPosition)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button className="p-2">
            <Mic2 className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-8">
            <SkipBack className="w-6 h-6" />
            <button
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-black" />
              ) : (
                <Play className="w-6 h-6 text-black" />
              )}
            </button>
            <SkipForward className="w-6 h-6" />
          </div>
          <button className="p-2">
            <ListMusic className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface MobilePlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  togglePlay: () => void;
  skipTrack: () => void;
  previousTrack: () => void;
  seekPosition: number;
  duration: number;
  handleSeek: (e: ChangeEvent<HTMLInputElement>) => void;
  isLiked: boolean;
  toggleLike: () => void;
  lyrics: Lyric[];
  currentLyricIndex: number;
  queue: Track[]; 
  shuffleOn: boolean;
  shuffleQueue: () => void;
  showLyrics: boolean;
  toggleLyricsView: () => void;
}

const MobilePlayer: React.FC<MobilePlayerProps> = ({
  currentTrack,
  isPlaying,
  togglePlay,
  skipTrack,
  previousTrack,
  seekPosition,
  duration,
  handleSeek,
  isLiked,
  toggleLike,
  shuffleOn,
  shuffleQueue,
  showLyrics,
  toggleLyricsView,
  lyrics,
  currentLyricIndex,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dominantColor, setDominantColor] = useState('rgb(0,0,0)');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [showQueue, setShowQueue] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showAudioOptions, setShowAudioOptions] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);

  // Gesture handling with improved calculations
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStart === null) return;
    setTouchEnd(e.touches[0].clientY);

    const distance = touchStart - e.touches[0].clientY;
    const threshold = window.innerHeight * 0.2; // 20% of screen height

    if (Math.abs(distance) > threshold) {
      setIsExpanded(distance > 0);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;

    const distance = touchStart - touchEnd;
    const threshold = window.innerHeight * 0.2;

    if (Math.abs(distance) > threshold) {
      setIsExpanded(distance > 0);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Cycle through repeat modes
  const toggleRepeat = () => {
    setRepeatMode((current) => {
      switch (current) {
        case 'off':
          return 'all';
        case 'all':
          return 'one';
        default:
          return 'off';
      }
    });
  };

  // Color extraction effect
  useEffect(() => {
    if (currentTrack?.album?.cover_medium) {
      const fac = new FastAverageColor();
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentTrack.album.cover_medium;

      img.onload = () => {
        const color = fac.getColor(img, {
          algorithm: 'dominant',
          ignoredColor: [
            [0, 0, 0, 255],
            [255, 255, 255, 255],
          ], // Ignore pure black/white
        });
        if (color) {
          setDominantColor(
            `rgb(${color.value[0]},${color.value[1]},${color.value[2]})`
          );
        }
      };
    }
  }, [currentTrack]);

  // Variants for animations
  const slideVariants = {
    collapsed: {
      height: '64px',
      borderRadius: '16px 16px 0 0',
    },
    expanded: {
      height: '100vh',
      borderRadius: '0',
    },
  };

  return (
    <motion.div
    ref={playerRef}
    className="fixed bottom-16 left-0 right-0 z-50"
    variants={slideVariants}
    animate={isExpanded ? 'expanded' : 'collapsed'}
    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
    {/* Dynamic Background */}
    <div
      className="absolute inset-0 backdrop-blur-2xl"
      style={{
        background: isExpanded
          ? `linear-gradient(180deg, ${dominantColor}99 0%, rgba(0,0,0,0.98) 100%)`
          : `linear-gradient(180deg, ${dominantColor}66 0%, rgba(0,0,0,0.95) 100%)`,
      }}
    />

      {/* Mini Player */}
      {!isExpanded && (
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg"
                layoutId="cover"
              >
                <motion.img
                  src={currentTrack?.album?.cover_medium}
                  alt={currentTrack?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.p
                  className="font-medium text-white truncate"
                  layoutId="title"
                >
                  {currentTrack?.title}
                </motion.p>
                <motion.p
                  className="text-sm text-white/70 truncate"
                  layoutId="artist"
                >
                  {currentTrack?.artist?.name}
                </motion.p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={togglePlay}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Player */}
      <AnimatePresence>
        {isExpanded && !showLyrics && (
          <motion.div
            className="relative h-full p-6 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Add MobileHeader at the top of expanded view */}
            <MobileHeader
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              toggleFilters={() => setShowFilters(!showFilters)}
              showFilters={showFilters}
              onBackClick={() => setIsExpanded(false)}
            />
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <motion.button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-lg flex items-center justify-center"
                whileTap={{ scale: 0.95 }}
              >
                <ChevronDown className="w-6 h-6 text-white" />
              </motion.button>

              <div className="flex items-center space-x-4">
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowAudioOptions(true)}
                >
                  <Volume2 className="w-5 h-5 text-white" />
                </button>
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowQueue(true)}
                >
                  <ListMusic className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Album Art & Track Info */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <motion.div
                className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-2xl"
                layoutId="cover"
                animate={{ scale: 1, rotateZ: isPlaying ? 360 : 0 }}
                transition={{
                  rotateZ: {
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                }}
              >
                <motion.img
                  src={currentTrack?.album?.cover_medium}
                  alt={currentTrack?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40" />
              </motion.div>

              {/* Track Info */}
              <div className="text-center space-y-2 w-full max-w-xs">
                <motion.h2
                  className="text-2xl font-bold text-white truncate"
                  layoutId="title"
                >
                  {currentTrack?.title}
                </motion.h2>
                <motion.p
                  className="text-lg text-white/70 truncate"
                  layoutId="artist"
                >
                  {currentTrack?.artist?.name}
                </motion.p>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-2">
                <div className="relative">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      style={{
                        width: `${(seekPosition / duration) * 100}%`,
                      }}
                      layoutId="progress"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={seekPosition}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: '20px', marginTop: '-10px' }}
                  />
                </div>
                <div className="flex justify-between text-sm text-white/50">
                  <span>{formatTime(seekPosition)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="w-full">
                {/* Additional Controls */}
                <div className="flex justify-between items-center mb-6">
                  <button
                    className={`p-2 ${
                      shuffleOn ? 'text-green-500' : 'text-white/70'
                    }`}
                    onClick={shuffleQueue}
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button
                    className="p-2 text-white/70"
                    onClick={toggleRepeat}
                  >
                    {repeatMode === 'one' ? (
                      <Repeat1 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Repeat
                        className={`w-5 h-5 ${
                          repeatMode === 'all' ? 'text-green-500' : ''
                        }`}
                      />
                    )}
                  </button>
                  <button
                    className={`p-2 ${
                      showEqualizer ? 'text-green-500' : 'text-white/70'
                    }`}
                    onClick={() => setShowEqualizer(!showEqualizer)}
                  >
                    <Radio className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/70">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/70">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center space-x-8">
                  <motion.button
                    className="p-2 text-white"
                    whileTap={{ scale: 0.95 }}
                    onClick={previousTrack}
                  >
                    <SkipBack className="w-8 h-8" />
                  </motion.button>

                  <motion.button
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-black" />
                    ) : (
                      <Play className="w-8 h-8 text-black ml-1" />
                    )}
                  </motion.button>

                  <motion.button
                    className="p-2 text-white"
                    whileTap={{ scale: 0.95 }}
                    onClick={skipTrack}
                  >
                    <SkipForward className="w-8 h-8" />
                  </motion.button>
                </div>

                {/* Bottom Controls */}
                <div className="flex justify-between items-center mt-6">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleLike}
                    className={`p-2 ${
                      isLiked ? 'text-green-500' : 'text-white/70'
                    }`}
                  >
                    <Heart className={isLiked ? 'fill-current' : ''} />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleLyricsView}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                      showLyrics
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    <Music className="w-5 h-5" />
                    <span className="text-sm font-medium">Lyrics</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-white/70"
                  >
                    <Download className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Swipe Indicator */}
            <motion.div
              className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics View */}
      <AnimatePresence>
        {isExpanded && showLyrics && (
          <EnhancedLyricsView
            lyrics={lyrics}
            currentLyricIndex={currentLyricIndex}
            currentTrack={currentTrack}
            onClose={() => {
              toggleLyricsView();
              setIsExpanded(false);
            }}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            formatTime={formatTime}
            seekPosition={seekPosition}
            duration={duration}
          />
        )}
      </AnimatePresence>

      {/* Audio Options Sheet */}
      <AnimatePresence>
        {showAudioOptions && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          >
            {/* Add audio options content here */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Sheet */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          >
            {/* Add queue content here */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equalizer */}
      <AnimatePresence>
        {showEqualizer && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          >
            {/* Add equalizer content here */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default MobilePlayer;


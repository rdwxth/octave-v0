/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Play, Pause, SkipBack, SkipForward, ChevronDown,
  Music, Download, Share2, Radio, Plus, Library,
  Shuffle, Repeat, Repeat1, Mic2, ListMusic,
  ArrowLeft, MoreHorizontal,
  Ban, Bluetooth, Cast, Crown, Settings,
  Share, Star,
  RefreshCw, Flag, AlertCircle, Lock, UserPlus
} from 'lucide-react';

// Types and Interfaces
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
  artist: Artist;
  album: Album;
}

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
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLiked: boolean;
  toggleLike: () => void;
  lyrics: Lyric[];
  currentLyricIndex: number;
  showLyrics: boolean;
  toggleLyricsView: () => void;
  shuffleOn: boolean;
  shuffleQueue: () => void;
  queue: Track[];
}

// Helper Components
const WaveSeekbar: React.FC<{ progress: number; handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ progress, handleSeek }) => (
  <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden group">
    <motion.div
      className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/60 to-white/80"
      style={{ width: `${progress * 100}%` }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </motion.div>
    <div className="absolute -top-2 -bottom-2 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={progress}
        onChange={handleSeek}
        className="w-full h-full appearance-none bg-transparent cursor-pointer"
        style={{
          WebkitAppearance: 'none',
          background: 'transparent',
        }}
      />
    </div>
  </div>
);

const QualityBadge: React.FC<{ quality: AudioQuality; onClick: () => void }> = ({ quality, onClick }) => {
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
      className={`px-4 py-1 rounded-full text-xs font-medium ${qualityColors[quality]} text-white`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <Icon className="w-3 h-3 inline mr-1" />
      <span>{quality}</span>
    </motion.button>
  );
};

const ActionButton: React.FC<{
  icon: React.FC<any>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button className="flex flex-col items-center space-y-1" onClick={onClick}>
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center
        ${active ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white/60'}
        transition-all duration-200 hover:bg-white/20`}
    >
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-xs text-white/60">{label}</span>
  </button>
);

const DeviceIndicator: React.FC<{ deviceName: string }> = ({ deviceName }) => (
  <div className="flex items-center px-3 py-1 rounded-full bg-blue-500/20">
    <Bluetooth className="w-4 h-4 text-blue-400 mr-2" />
    <span className="text-sm text-blue-400">{deviceName}</span>
  </div>
);

// Main Component
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
  lyrics,
  currentLyricIndex,
  showLyrics,
  toggleLyricsView,
  shuffleOn,
  shuffleQueue,
  queue,
}) => {
  // State variables
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('MAX');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  // Refs
  const playerRef = useRef<HTMLDivElement>(null);
  const albumRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist.name,
        album: currentTrack.album.title,
        artwork: [{ src: currentTrack.album.cover_medium, sizes: '512x512', type: 'image/jpeg' }],
      });
    }
  }, [currentTrack]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (showMoreOptions || showAudioMenu || showQueue) &&
        playerRef.current &&
        !playerRef.current.contains(event.target as Node)
      ) {
        setShowMoreOptions(false);
        setShowAudioMenu(false);
        setShowQueue(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreOptions, showAudioMenu, showQueue]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const xDiff = touchStart.x - e.touches[0].clientX;
    const yDiff = touchStart.y - e.touches[0].clientY;

    if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 50) {
      if (xDiff > 0) {
        skipTrack();
      } else {
        previousTrack();
      }
      setTouchStart(null);
    }
  };

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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // More options items
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

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50">
      {/* Collapsed Player */}
      {!isExpanded && (
        <motion.div
          className="mx-2 rounded-t-xl"
          style={{
            background: 'rgba(23, 23, 23, 0.6)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setIsExpanded(true)}
        >
          {/* Mini Player Content */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <motion.div
                  ref={albumRef}
                  className="relative w-12 h-12 rounded-lg overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                >
                  <img
                    src={currentTrack.album.cover_medium}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{currentTrack.title}</p>
                  <p className="text-white/60 text-sm truncate">{currentTrack.artist.name}</p>
                </div>
              </div>

              {/* Updated controls in mini player */}
              <div className="flex items-center space-x-2">
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    previousTrack();
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
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                </button>

                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipTrack();
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
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-green-500 text-green-500' : 'text-white/60'}`} />
                </button>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <WaveSeekbar progress={seekPosition / duration} handleSeek={handleSeek} />

            {/* Removed Quality Badge from mini player */}
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
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <button
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronDown className="w-6 h-6 text-white" />
              </button>

              <div className="flex items-center space-x-3">
                {connectedDevice && <DeviceIndicator deviceName={connectedDevice} />}

                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Cast className="w-5 h-5 text-white/60" />
                </button>

                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowMoreOptions(true)}
                >
                  <MoreHorizontal className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>

            {showLyrics ? (
              <div className="px-4 h-[calc(100%-200px)] overflow-y-auto">
                <div className="flex items-center mb-6">
                  <button
                    onClick={toggleLyricsView}
                    className="hover:bg-white/10 p-2 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <h2 className="text-lg font-semibold text-white ml-4">Lyrics</h2>
                </div>
                {lyrics.map((lyric, index) => (
                  <motion.p
                    key={index}
                    className={`text-lg mb-6 text-center ${
                      index === currentLyricIndex ? 'text-white scale-105' : 'text-white/40'
                    }`}
                    animate={{
                      opacity: index === currentLyricIndex ? 1 : 0.4,
                    }}
                  >
                    {lyric.text}
                  </motion.p>
                ))}
              </div>
            ) : (
              <div className="px-4 flex flex-col items-center">
                {/* Album Art */}
                <motion.div
                  className="w-64 h-64 relative rounded-2xl overflow-hidden shadow-2xl mb-8"
                  layoutId="album-art"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                >
                  <img
                    src={currentTrack.album.cover_medium}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/20" />
                </motion.div>

                {/* Track Info */}
                <div className="w-full text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">{currentTrack.title}</h2>
                  <p className="text-white/60">{currentTrack.artist.name}</p>
                </div>

                {/* Quality Badge */}
                <QualityBadge quality={audioQuality} onClick={() => setShowAudioMenu(true)} />

                {/* Seekbar and Time */}
                <div className="w-full mb-8 mt-6">
                  <WaveSeekbar progress={seekPosition / duration} handleSeek={handleSeek} />
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
                      onClick={previousTrack}
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

                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors" onClick={skipTrack}>
                      <SkipForward className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <button onClick={toggleRepeat} className="p-3 rounded-full transition-colors">
                    {repeatMode === 'one' ? (
                      <Repeat1 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Repeat
                        className={`w-6 h-6 ${repeatMode === 'all' ? 'text-green-500' : 'text-white/60'}`}
                      />
                    )}
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="w-full grid grid-cols-4 gap-4 mb-6">
                  <ActionButton icon={Heart} label="Like" active={isLiked} onClick={toggleLike} />
                  <ActionButton
                    icon={Plus}
                    label="Add to"
                    onClick={() => console.log('Add to playlist')}
                  />
                  <ActionButton
                    icon={Download}
                    label="Download"
                    onClick={() => console.log('Download')}
                  />
                  <ActionButton icon={Share2} label="Share" onClick={() => console.log('Share')} />
                </div>

                {/* Additional Actions */}
                <div className="w-full grid grid-cols-4 gap-4">
                  <ActionButton
                    icon={Music}
                    label="Lyrics"
                    active={showLyrics}
                    onClick={toggleLyricsView}
                  />
                  <ActionButton
                    icon={Radio}
                    label="Radio"
                    onClick={() => console.log('Start radio')}
                  />
                  <ActionButton
                    icon={Mic2}
                    label="Sing"
                    onClick={() => console.log('Start karaoke')}
                  />
                  <ActionButton
                    icon={ListMusic}
                    label="Queue"
                    onClick={() => setShowQueue(true)}
                  />
                </div>
              </div>
            )}

            {/* More Options Modal */}
            <AnimatePresence>
              {showMoreOptions && (
                <motion.div
                  className="fixed inset-0 bg-black/80 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMoreOptions(false)} // Close modal on background click
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
                  >
                    <div className="p-4">
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

                      <div className="grid grid-cols-4 gap-4 mb-8">
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

            {/* Audio Quality Menu */}
            <AnimatePresence>
              {showAudioMenu && (
                <motion.div
                  className="fixed inset-0 bg-black/80 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAudioMenu(false)} // Close modal on background click
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
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

            {/* Queue Modal */}
            <AnimatePresence>
              {showQueue && (
                <motion.div
                  className="fixed inset-0 bg-black/80 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowQueue(false)} // Close modal on background click
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl max-h-[80%]"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
                  >
                    <div className="p-4">
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                      <h3 className="text-lg font-bold text-white mb-4">Up Next</h3>
                      <div className="overflow-y-auto max-h-[60vh]">
                        {queue.map((track, index) => (
                          <div key={index} className="flex items-center space-x-4 p-2 hover:bg-white/10 rounded-lg">
                            <img
                              src={track.album.cover_medium}
                              alt={track.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{track.title}</p>
                              <p className="text-white/60 text-sm truncate">{track.artist.name}</p>
                            </div>
                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                              <MoreHorizontal className="w-5 h-5 text-white/60" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        className="w-full py-4 text-white/60 hover:text-white transition-colors mt-4"
                        onClick={() => setShowQueue(false)}
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobilePlayer;

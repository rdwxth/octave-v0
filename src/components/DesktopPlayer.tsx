/* eslint-disable @next/next/no-img-element */
// DesktopPlayer.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, MoreHorizontal, ListMusic, Cast, Airplay,
  Plus, Download, Share2, Library, Radio, UserPlus, Ban, Share, Music,
  Star, RefreshCw, Flag, AlertCircle, Lock, Mic2, Crown, Settings, ListX, Volume2, Monitor
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium: string;
    cover_small: string;
    cover_big: string;
    cover_xl: string;
  };
}

interface Lyric {
  time: number;
  text: string;
}

type AudioQuality = 'MAX' | 'HIGH' | 'NORMAL' | 'DATA_SAVER';
type RepeatMode = 'off' | 'all' | 'one';

interface DesktopPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  previousTracks: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
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
  removeFromQueue: (_index: number) => void; // Unused argument prefixed to avoid lint errors
  onQueueItemClick: (_track: Track, _index: number) => void; // Unused argument prefixed
  setIsPlayerOpen: (_isOpen: boolean) => void; // Unused argument prefixed
}

const formatTimeDesktop = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const DesktopSeekbar: React.FC<{
  progress: number;
  handleSeek: (time: number) => void;
  duration: number;
}> = ({ progress, handleSeek, duration }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const calculateProgress = useCallback((clientX: number): number => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const startDrag = useCallback((x: number) => {
    setIsDragging(true);
    setLocalProgress(calculateProgress(x));
  }, [calculateProgress]);

  const moveDrag = useCallback((x: number) => {
    if (!isDragging) return;
    setLocalProgress(calculateProgress(x));
  }, [isDragging, calculateProgress]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    handleSeek(localProgress * duration);
    setIsDragging(false);
  }, [isDragging, localProgress, duration, handleSeek]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX);
    const onTouchMove = (e: TouchEvent) => moveDrag(e.touches[0].clientX);
    const onEnd = () => endDrag();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, moveDrag, endDrag]);

  return (
    <div className="flex items-center w-full space-x-2 px-4 max-w-lg mx-auto text-sm">
      <span className="text-neutral-400 min-w-[40px]">{formatTimeDesktop(localProgress * duration)}</span>
      <div
        ref={progressRef}
        className="relative flex-1 h-2 rounded-full bg-neutral-700 cursor-pointer"
        style={{ height: '6px' }}
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      >
        <motion.div
          className="absolute left-0 top-0 h-full bg-white rounded-full"
          style={{ width: `${localProgress * 100}%` }}
          animate={{ width: `${localProgress * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
      <span className="text-neutral-400 min-w-[40px]">{formatTimeDesktop(duration)}</span>
    </div>
  );
};

const DesktopPlayer: React.FC<DesktopPlayerProps> = ({
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
  repeatMode,
  setRepeatMode,
  shuffleOn,
  shuffleQueue,
  queue,
  setQueue
}) => {
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('MAX');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showHoverDetails, setShowHoverDetails] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showDevices, setShowDevices] = useState(false);
  const [showQueueDesktop, setShowQueueDesktop] = useState(false);
  const [showTabs, setShowTabs] = useState<'album' | 'artist' | 'lyrics' | 'details'>('album');

  const actionIconsColor = 'text-neutral-400 hover:text-white hover:bg-neutral-700 p-2 rounded-full transition-colors';
  const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';

  const qualityIcons = {
    MAX: Crown,
    HIGH: Star,
    NORMAL: Settings,
    DATA_SAVER: RefreshCw,
  } as const;

  const QualityIcon = qualityIcons[audioQuality];

  const moreOptionsItems = [
    { icon: Heart, label: 'Like', active: isLiked, onClick: toggleLike },
    { icon: Ban, label: 'Dislike', onClick: () => {} },
    { icon: Share2, label: 'Share', onClick: () => {} },
    { icon: UserPlus, label: 'Follow Artist', onClick: () => {} },
    { icon: Radio, label: 'Start Radio', onClick: () => {} },
    { icon: Library, label: 'Add to Playlist', onClick: () => {} },
    { icon: Share, label: 'Copy Link', onClick: () => {} },
    { icon: Music, label: 'View Lyrics', active: showLyrics, onClick: toggleLyricsView },
    { icon: Flag, label: 'Report', onClick: () => {} },
    { icon: Download, label: 'Download', onClick: () => {} },
    { icon: Lock, label: 'Audio Quality', onClick: () => setShowAudioMenu(true) },
    { icon: AlertCircle, label: 'Song Info', onClick: () => {} },
    { icon: Mic2, label: 'Karaoke Mode', onClick: () => {} },
  ];

  return (
    <div className="w-full h-24 bg-gradient-to-t from-black to-neutral-900 border-t border-neutral-700 flex items-center justify-between px-4 relative">
      {/* LEFT SECTION */}
      <div className="flex items-center space-x-3 relative">
        {currentTrack && (
          <div
            className="relative w-14 h-14 rounded-md overflow-hidden cursor-pointer"
            onMouseEnter={() => setShowHoverDetails(true)}
            onMouseLeave={() => setShowHoverDetails(false)}
          >
            <img
              src={currentTrack.album.cover_medium}
              alt={currentTrack.title}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
            <AnimatePresence>
              {showHoverDetails && (
                <motion.div
                  className="absolute top-0 left-full transform -translate-x-2 bg-neutral-900/90 backdrop-blur-lg border border-neutral-700 rounded-xl shadow-2xl p-6 w-72 max-h-96 overflow-y-auto z-50"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div className="text-white font-semibold mb-3 text-sm">{currentTrack.album.title}</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['album','artist','lyrics','details'].map((tab) => (
                      <button
                        key={tab}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          showTabs === tab ? 'bg-white/20 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                        onClick={() => setShowTabs(tab as typeof showTabs)}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="text-neutral-300 text-sm space-y-2 leading-relaxed">
                    {showTabs === 'album' && (
                      <p>A captivating album that blends genres and showcases a unique artistic vision. (Placeholder)</p>
                    )}
                    {showTabs === 'artist' && (
                      <p>An artist celebrated worldwide, known for innovation and musical excellence. (Placeholder)</p>
                    )}
                    {showTabs === 'lyrics' && (
                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                        {lyrics.map((lyric, index) => (
                          <p
                            key={index}
                            className={`cursor-pointer ${
                              index === currentLyricIndex ? 'text-white font-bold' : 'text-neutral-400'
                            }`}
                            onClick={() => handleSeek(lyric.time)}
                          >
                            {lyric.text}
                          </p>
                        ))}
                      </div>
                    )}
                    {showTabs === 'details' && (
                      <p>Additional details: Genre, BPM, release year, and more background info. (Placeholder)</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {currentTrack && (
          <div className="flex flex-col min-w-0">
            <p className="font-semibold text-white truncate max-w-[150px]">{currentTrack.title}</p>
            <p className="text-sm text-neutral-400 truncate max-w-[150px]">{currentTrack.artist.name}</p>
          </div>
        )}
        {currentTrack && (
          <div className="flex items-center space-x-2">
            <button className={actionIconsColor} onClick={toggleLike}>
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
            </button>
            <button className={actionIconsColor}>
              <Share2 className="w-5 h-5" />
            </button>
            <button className={actionIconsColor}>
              <Plus className="w-5 h-5" />
            </button>
            <button className={actionIconsColor}>
              <Download className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* CENTER SECTION */}
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="flex items-center space-x-4">
          <button
            className={`p-2 rounded-full transition-colors ${shuffleOn ? 'text-green-500 bg-neutral-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
            onClick={shuffleQueue}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors" onClick={() => previousTrack()}>
            <SkipBack className="w-5 h-5 text-white" />
          </button>
          <motion.button
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-neutral-100 transition-colors"
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-black ml-0.5" />
            )}
          </motion.button>
          <button className="p-2 hover:bg-neutral-700 rounded-full transition-colors" onClick={() => skipTrack()}>
            <SkipForward className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setRepeatMode(nextMode)}
            className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5 text-green-500" />
            ) : (
              <Repeat className={`w-5 h-5 ${repeatMode === 'all' ? 'text-green-500' : 'text-neutral-400'}`} />
            )}
          </button>
        </div>
        <DesktopSeekbar
          progress={duration > 0 ? seekPosition / duration : 0}
          handleSeek={handleSeek}
          duration={duration}
        />
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center space-x-2">
        <button className={actionIconsColor} onClick={() => setShowMoreOptions(true)}>
          <MoreHorizontal className="w-5 h-5" />
        </button>
        <button className={actionIconsColor} onClick={() => setShowQueueDesktop(!showQueueDesktop)}>
          <ListMusic className="w-5 h-5" />
        </button>
        <button className={actionIconsColor}>
          <Airplay className="w-5 h-5" />
        </button>
        <button className={actionIconsColor}>
          <Cast className="w-5 h-5" />
        </button>
        <button
          className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center justify-center space-x-1.5 bg-neutral-700 text-neutral-200 hover:bg-neutral-600 transition-colors"
          onClick={() => setShowAudioMenu(true)}
        >
          <QualityIcon className="w-4 h-4" />
          <span>{audioQuality}</span>
        </button>
        <div className="relative">
          <button
            className={actionIconsColor}
            onClick={() => setShowDevices(!showDevices)}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showDevices && (
              <motion.div
                className="absolute right-0 bottom-10 bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl p-6 w-64"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <p className="text-white font-bold mb-3 text-sm">Devices</p>
                <div className="flex items-center justify-between text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 p-2 rounded-md cursor-pointer mb-2">
                  <span>Desktop Speaker</span>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 p-2 rounded-md cursor-pointer mb-2">
                  <span>Living Room TV</span>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 p-2 rounded-md cursor-pointer">
                  <span>Phone</span>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="mt-4">
                  <p className="text-neutral-400 text-xs mb-2">Volume</p>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-neutral-300" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-1 bg-neutral-600 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* More Options Modal */}
      <AnimatePresence>
        {showMoreOptions && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMoreOptions(false)}
          >
            <motion.div
              className="bg-neutral-900/95 rounded-xl p-6 w-[340px] max-h-[80vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">More Options</h3>
              <div className="space-y-3 text-sm">
                {moreOptionsItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-2 hover:bg-neutral-700 p-2 rounded cursor-pointer"
                    onClick={() => {
                      item.onClick?.();
                      setShowMoreOptions(false);
                    }}
                  >
                    <item.icon className={`w-5 h-5 ${item.active ? 'fill-pink-500 text-pink-500' : 'text-neutral-400'}`} />
                    <span className="text-neutral-300">{item.label}</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2 mt-6 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                onClick={() => setShowMoreOptions(false)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Quality Menu */}
      <AnimatePresence>
        {showAudioMenu && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAudioMenu(false)}
          >
            <motion.div
              className="bg-neutral-900/95 rounded-xl p-6 w-[340px] shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Audio Quality</h3>
              {(['MAX', 'HIGH', 'NORMAL', 'DATA_SAVER'] as AudioQuality[]).map((quality) => {
                const QIcon = qualityIcons[quality];
                return (
                  <button
                    key={quality}
                    className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 ${
                      audioQuality === quality ? 'bg-neutral-700' : 'hover:bg-neutral-700/50'
                    }`}
                    onClick={() => {
                      setAudioQuality(quality);
                      setShowAudioMenu(false);
                    }}
                  >
                    <div className="flex flex-col text-left">
                      <p className="text-white font-medium">{quality}</p>
                      <p className="text-sm text-neutral-400">
                        {quality === 'MAX' && 'HiFi Plus (24-bit, up to 192kHz)'}
                        {quality === 'HIGH' && 'HiFi (16-bit, 44.1kHz)'}
                        {quality === 'NORMAL' && 'High Quality (320kbps AAC)'}
                        {quality === 'DATA_SAVER' && 'Data Saver (128kbps AAC)'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-300">
                      <QIcon className="w-4 h-4" />
                      {audioQuality === quality && (
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      )}
                    </div>
                  </button>
                );
              })}
              <button
                className="w-full py-2 mt-4 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                onClick={() => setShowAudioMenu(false)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Panel */}
      <AnimatePresence>
        {showQueueDesktop && (
          <motion.div
            className="fixed bottom-24 right-4 w-80 bg-neutral-900/90 backdrop-blur-lg border border-neutral-700 rounded-xl p-4 z-50 max-h-[50vh] overflow-y-auto custom-scrollbar"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Up Next</h2>
              <button
                onClick={() => setQueue([])}
                className="text-neutral-300 hover:text-white text-xs flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-neutral-700 transition-colors"
              >
                <ListX className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {queue.map((track, index) => (
                <div
                  key={`queue-${track.id}-${index}`}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    currentTrack && track.id === currentTrack.id ? 'bg-neutral-700' : 'hover:bg-neutral-700'
                  } cursor-pointer`}
                >
                  <img
                    src={track.album.cover_small}
                    alt={track.title}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{track.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DesktopPlayer;
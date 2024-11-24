import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, Pause, SkipBack, SkipForward, ChevronDown, Volume2, Shuffle, Music } from 'lucide-react';

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

interface MobilePlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  togglePlay: () => void;
  skipTrack: () => void;
  previousTrack: () => void;
  seekPosition: number;
  duration: number;
  handleSeek: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  lyrics,
  currentLyricIndex,
//   queue: _queue,
  shuffleOn,
  shuffleQueue,
  showLyrics,
  toggleLyricsView,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dominantColor, setDominantColor] = useState('rgb(0,0,0)');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTrack?.album?.cover_medium) {
      // In a real app, you'd want to calculate the dominant color from the album art
      // For demo, we'll generate a random color
      const randomColor = () => Math.floor(Math.random() * 255);
      setDominantColor(`rgb(${randomColor()},${randomColor()},${randomColor()})`);
    }
  }, [currentTrack]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTouchStart = (e: React.TouchEvent): void => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (!touchStart) return;
    setTouchEnd(e.touches[0].clientY);
  };

  const handleTouchEnd = (): void => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isSwipeUp = distance > 50;
    const isSwipeDown = distance < -50;

    if (isSwipeUp) {
      setIsExpanded(true);
    } else if (isSwipeDown && isExpanded) {
      setIsExpanded(false);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <motion.div
      ref={playerRef}
      className="fixed bottom-16 left-0 right-0 z-50"
      animate={{
        height: isExpanded ? '100vh' : '64px',
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute inset-0 backdrop-blur-xl"
        style={{
          background: isExpanded 
            ? `linear-gradient(180deg, ${dominantColor}99 0%, rgba(0,0,0,0.95) 100%)`
            : `linear-gradient(180deg, ${dominantColor}66 0%, rgba(0,0,0,0.8) 100%)`
        }}
      />

      {/* Collapsed Player */}
      <div className={`relative p-2 ${isExpanded ? 'hidden' : 'block'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.img
              src={currentTrack?.album?.cover_medium}
              alt={currentTrack?.title}
              className="w-12 h-12 rounded-md"
              layoutId="cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{currentTrack?.title}</p>
              <p className="text-gray-300 text-sm truncate">{currentTrack?.artist?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={togglePlay} className="p-2">
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Player */}
      <AnimatePresence>
        {isExpanded && (
          <div className="relative h-full p-6 flex flex-col">
            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 left-4 text-white"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 mt-8">
              <motion.img
                layoutId="cover"
                src={currentTrack?.album?.cover_medium}
                alt={currentTrack?.title}
                className="w-64 h-64 rounded-lg shadow-2xl"
              />
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">{currentTrack?.title}</h2>
                <p className="text-gray-300">{currentTrack?.artist?.name}</p>
              </div>

              {showLyrics ? (
                <div className="w-full flex-1 overflow-y-auto px-4">
                  {lyrics.map((lyric: Lyric, index: number) => (
                    <p
                      key={index}
                      className={`text-center text-lg mb-6 transition-all ${
                        index === currentLyricIndex
                          ? 'text-white font-bold scale-110'
                          : 'text-gray-400'
                      }`}
                    >
                      {lyric.text}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={seekPosition}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{formatTime(seekPosition)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center justify-center space-x-8">
                    <button 
                      className={`p-2 ${shuffleOn ? 'text-green-500' : 'text-white'}`}
                      onClick={shuffleQueue}
                    >
                      <Shuffle className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-white" onClick={previousTrack}>
                      <SkipBack className="w-8 h-8" />
                    </button>
                    <button 
                      className="p-4 bg-white rounded-full text-black"
                      onClick={togglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8" />
                      ) : (
                        <Play className="w-8 h-8" />
                      )}
                    </button>
                    <button className="p-2 text-white" onClick={skipTrack}>
                      <SkipForward className="w-8 h-8" />
                    </button>
                    <button 
                      className={`p-2 ${showLyrics ? 'text-green-500' : 'text-white'}`}
                      onClick={toggleLyricsView}
                    >
                      <Music className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-4">
                    <button onClick={toggleLike}>
                      <Heart
                        className={`w-6 h-6 ${
                          isLiked ? 'text-green-500 fill-current' : 'text-white'
                        }`}
                      />
                    </button>
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MobilePlayer;
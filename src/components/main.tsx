/* eslint-disable @next/next/no-img-element */
// Desktop (main.tsx)
'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
  ChangeEvent,
  MouseEvent,
  useMemo
} from 'react';

import MobilePlayer from './mobilePlayer';


declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deferredPrompt: any;
  }

}

import {
  Home,
  Search,
  Library,
  Bell,
  Clock,
  Cog,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ChevronUp,
  ChevronDown,
  Shuffle,
  Plus,
  User,
  Download,
  Heart,
  Music,
  LogOut,
} from 'lucide-react';
import debounce from 'lodash/debounce';

const API_BASE_URL = 'https://walt-brazil-galleries-robert.trycloudflare.com';

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

interface Playlist {
  name: string;
  image: string;
  tracks: Track[];
  pinned?: boolean;
  downloaded?: boolean;
}

interface Lyric {
  time: number;
  text: string;
}

interface ContextMenuOption {
  label: string;
  action: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface CustomContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  options: ContextMenuOption[];
}

interface TrackItemProps {
  track: Track;
  showArtist?: boolean;
  inPlaylistCreation?: boolean;
}

interface ExtendedTrack extends Track {
  genre?: string;
  year?: number;
  trackNumber?: number;
  totalTracks?: number;
  albumArtist?: string;
  composer?: string;
  discNumber?: number;
  totalDiscs?: number;
  bpm?: number;
  isrc?: string;
}

interface BluetoothDevice {
  gatt?: {
    connected: boolean;
    getPrimaryService(name: string): Promise<BluetoothRemoteGATTService>;
  };
}

interface BluetoothRemoteGATTService {
  getCharacteristic(name: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>;
}

interface Artist {
  id: number;
  name: string;
  picture_medium: string;
}

declare global {
  interface Navigator {
    setAppBadge(n: number): Promise<void>;
    clearAppBadge(): Promise<void>;
  }

  interface MediaSession {
    setPositionState(state: MediaPositionState): void;
  }


  interface ExtendedNotificationOptions extends NotificationOptions {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
    silent?: boolean | null;
  }

  interface NotificationOptions {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
  }

  interface Bluetooth {
    availableDevices?: BluetoothDevice[];
  }
}

type ExtendedMediaSessionAction = MediaSessionAction | 'skipad';



export function SpotifyClone() {
  const [view, setView] = useState<'home' | 'search' | 'playlist' | 'settings' | 'library'>('home');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [jumpBackIn, setJumpBackIn] = useState<Track[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showLibrary, setShowLibrary] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [shows, setShows] = useState<{ name: string; image: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [previousTracks, setPreviousTracks] = useState<Track[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showMobileLibrary, setShowMobileLibrary] = useState<boolean>(false);
  const [shuffleOn, setShuffleOn] = useState<boolean>(false);
  const [savedPosition, setSavedPosition] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [seekPosition, setSeekPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const [contextMenuTrack, setContextMenuTrack] = useState<Track | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [newPlaylistImage, setNewPlaylistImage] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState<boolean>(false);
  const [selectedPlaylistForAdd, setSelectedPlaylistForAdd] = useState<string | null>(null);
  const [showSearchInPlaylistCreation, setShowSearchInPlaylistCreation] = useState<boolean>(false);
  const [selectedTracksForNewPlaylist, setSelectedTracksForNewPlaylist] = useState<Track[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [contextMenuOptions, setContextMenuOptions] = useState<ContextMenuOption[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const preloadedAudios = useRef<HTMLAudioElement[]>([new Audio(), new Audio(), new Audio()]);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const onQueueItemClick = (track: Track, index: number) => {
    if (index < 0) {
      // Handle previous track logic
      const actualIndex = Math.abs(index + 1);
      setPreviousTracks((prev) => prev.slice(0, actualIndex));
    }
    updateQueue(track);
    setCurrentTrack(track);
  };
  
  const updateQueue = (track: Track) => {
    setQueue((prevQueue) => {
      // Remove all instances of this track from the queue first
      const filteredQueue = prevQueue.filter((t) => t.id !== track.id);
      // Add the track only once at the beginning
      return [track, ...filteredQueue];
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue((prevQueue) => prevQueue.filter((_, i) => i !== index));
  };


  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (savedPosition && audioRef.current.currentTime === 0) {
        console.log(`Resuming playback from saved position: ${savedPosition}`);
        audioRef.current.currentTime = savedPosition;
      }
      void audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, savedPosition]);
  
  
  
  const previousTrack = useCallback(() => {
    if (previousTracks.length > 0) {
      const [prevTrack, ...restPreviousTracks] = previousTracks;
      setCurrentTrack(prevTrack);
      updateQueue(currentTrack!); // Ensure queue stays consistent
      setPreviousTracks(restPreviousTracks);
      setIsPlaying(true); // Keep playing the previous track
    }
  }, [currentTrack, previousTracks]);

  
const skipTrack = useCallback(async () => {
  if (currentTrack) {
    // Add current track to previous tracks before moving to next
    setPreviousTracks((prev) => [currentTrack, ...prev.slice(0, 49)]); // Keep last 50 tracks
  }
  
  if (queue.length > 1) {
    const [, ...newQueue] = queue;
    setCurrentTrack(newQueue[0]);
    setQueue(newQueue);
    setIsPlaying(true); // Keep playing the next track
  } else {
    const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]') as Track[];
    if (savedQueue.length > 1) {
      const [, ...newQueue] = savedQueue;
      setCurrentTrack(newQueue[0]);
      console.log('Setting new queue:', newQueue);
      setQueue(newQueue);
      localStorage.setItem('queue', JSON.stringify(newQueue));
      setIsPlaying(true); // Keep playing the next track
    } else {
      const mostPlayedArtists = getMostPlayedArtists();
      const randomSongs = await fetchRandomSongs(mostPlayedArtists);
      setQueue(randomSongs);
      setCurrentTrack(randomSongs[0]);
      localStorage.setItem('queue', JSON.stringify(randomSongs));
      setIsPlaying(true); // Keep playing the next track
    }
  }
}, [currentTrack, queue]);



  const fetchSearchResults = async (query: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/tracks?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };
  

  useEffect(() => {
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume) setVolume(parseFloat(savedVolume));

    const savedShuffleOn = localStorage.getItem('shuffleOn');
    if (savedShuffleOn) setShuffleOn(JSON.parse(savedShuffleOn));

    const savedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]') as Playlist[];
    if (!savedPlaylists.some((playlist) => playlist.name === 'Liked Songs')) {
      savedPlaylists.push({ name: 'Liked Songs', image: '/images/liked-songs.webp', tracks: [] });
    }
    setPlaylists(savedPlaylists);
    setJumpBackIn(JSON.parse(localStorage.getItem('recentlyPlayed') || '[]') as Track[]);


     // Add these lines
    const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]') as Track[];
    const savedPosition = parseFloat(localStorage.getItem('savedPosition') || '0');
    const wasPlaying = localStorage.getItem('wasPlaying') === 'true';
    console.log('Saved queue:', savedQueue);
    setQueue(savedQueue);
    setSavedPosition(savedPosition);
    
    if (savedQueue.length > 0) {
      const savedTrack = JSON.parse(localStorage.getItem('currentTrack') || 'null') as Track;
      if (savedTrack) {
        setCurrentTrack(savedTrack);
        setSeekPosition(savedPosition);
        setIsPlaying(wasPlaying);
      }
    }
    setQueue(savedQueue);
    const savedCurrentTrack = JSON.parse(localStorage.getItem('currentTrack') || 'null') as Track | null;
    if (savedCurrentTrack) {
      setCurrentTrack(savedCurrentTrack);
      setSeekPosition(parseFloat(localStorage.getItem('seekPosition') || '0'));
      setIsLiked(isTrackLiked(savedCurrentTrack));
    }

    setShows([
      { name: 'Spotify Original', image: '/placeholder.svg?height=150&width=150' },
      { name: 'After School Radio', image: '/placeholder.svg?height=150&width=150' },
    ]);

    preloadQueueTracks(savedQueue);

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

    const favoriteArtists = JSON.parse(localStorage.getItem('favoriteArtists') || '[]') as Artist[];
    if (favoriteArtists.length > 0) {
      const randomArtist = favoriteArtists[Math.floor(Math.random() * favoriteArtists.length)];
      fetchSearchResults(randomArtist.name);
    }

    return () => {
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('queue', JSON.stringify(queue));
    preloadQueueTracks(queue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  useEffect(() => {
    if (currentTrack) {
      playTrackFromSource(currentTrack);
      setIsPlaying(true);
      updateRecentlyPlayed(currentTrack);
      localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
      setIsLiked(isTrackLiked(currentTrack));
      fetchLyrics(currentTrack);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('shuffleOn', JSON.stringify(shuffleOn));
  }, [shuffleOn]);

  useEffect(() => {
    const updateCurrentLyric = () => {
      if (lyrics.length === 0) return;
  
      const currentTime = parseFloat(audioRef.current.currentTime.toFixed(1));
      const index = lyrics.findIndex((lyric) => lyric.time > currentTime);
  
      setCurrentLyricIndex(index > 0 ? index - 1 : lyrics.length - 1);
    };
  
    const interval = setInterval(updateCurrentLyric, 500); // Check every 500ms
    return () => clearInterval(interval);
  }, [lyrics]);
  

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      const searchTracks = async (searchQuery: string) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/search/tracks?query=${encodeURIComponent(searchQuery)}`
          );
          const data = await response.json();
          setSearchResults(data.results);
        } catch (error) {
          console.error('Error fetching search results:', error);
        }
      };
      searchTracks(query);
    }, 300),
    [] // Empty dependency array since we don't want to recreate the debounced function
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  // const updateBluetoothMetadata = async (
  //   device: BluetoothDevice,
  //   metadata: Record<string, Uint8Array | undefined>
  // ): Promise<void> => {
  //   try {
  //     const service = await device.gatt?.getPrimaryService('audio_remote_control');
  //     if (!service) return;
      
  //     const characteristic = await service.getCharacteristic('track_metadata');
  //     const filteredMetadata = Object.fromEntries(
  //       Object.entries(metadata).filter(([, value]) => value !== undefined)
  //     );
      
  //     const metadataString = JSON.stringify(filteredMetadata);
  //     await characteristic.writeValue(new TextEncoder().encode(metadataString));
  //   } catch (error) {
  //     console.error('Bluetooth metadata update failed:', error);
  //   }
  // };

  const showNotification = useCallback((action: string, detail: string): void => {
    if ('setAppBadge' in navigator) {
      void navigator.setAppBadge(1);
      setTimeout(() => void navigator.clearAppBadge(), 2000);
    }
  
    if ('Notification' in window && Notification.permission === 'granted' && currentTrack) {
      new Notification('Now Playing', {
        body: `${action}: ${detail}`,
        icon: currentTrack.album.cover_medium,
        badge: currentTrack.album.cover_medium,
        tag: 'media-playback',
        renotify: true,
        silent: null
      } as ExtendedNotificationOptions);
    }
  }, [currentTrack]);


  // MEDIA API

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const track = currentTrack as ExtendedTrack;

      const updateBluetoothMetadata = async (
        device: BluetoothDevice,
        metadata: Record<string, Uint8Array | undefined>
      ): Promise<void> => {
        try {
          const service = await device.gatt?.getPrimaryService('audio_remote_control');
          if (!service) return;
          
          const characteristic = await service.getCharacteristic('track_metadata');
          const filteredMetadata = Object.fromEntries(
            Object.entries(metadata).filter(([, value]) => value !== undefined)
          );
          
          const metadataString = JSON.stringify(filteredMetadata);
          await characteristic.writeValue(new TextEncoder().encode(metadataString));
        } catch (error) {
          console.error('Bluetooth metadata update failed:', error);
        }
      };
      
      // Helper function for position state updates
      const updatePositionState = () => {
        try {
          if ('setPositionState' in navigator.mediaSession) {
            const duration = audioRef.current?.duration || 0;
            const position = Math.min(audioRef.current?.currentTime || 0, duration);
            navigator.mediaSession.setPositionState({
              duration,
              playbackRate: audioRef.current?.playbackRate || 1.0,
              position
            });
          }
        } catch (error) {
          console.error('Error updating position state:', error);
        }
      };
  
      // Media session metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        artwork: [
          { src: track.album.cover_medium, sizes: '96x96', type: 'image/jpeg' },
          { src: track.album.cover_medium, sizes: '128x128', type: 'image/jpeg' },
          { src: track.album.cover_medium, sizes: '192x192', type: 'image/jpeg' },
          { src: track.album.cover_medium, sizes: '256x256', type: 'image/jpeg' },
          { src: track.album.cover_medium, sizes: '384x384', type: 'image/jpeg' },
          { src: track.album.cover_medium, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
  
      // Action handlers
      const actionHandlers: Record<ExtendedMediaSessionAction, MediaSessionActionHandler> = {
        play: () => {
          void audioRef.current?.play();
          navigator.mediaSession.playbackState = 'playing';
          showNotification('Playing', track.title);
          togglePlay();
        },
        pause: () => {
          audioRef.current?.pause();
          navigator.mediaSession.playbackState = 'paused';
          showNotification('Paused', track.title);
          togglePlay();
        },
        previoustrack: previousTrack,
        nexttrack: skipTrack,
        seekto: (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            updatePositionState();
          }
        },
        seekbackward: (details) => {
          const skipTime = details.seekOffset || 10;
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
            updatePositionState();
          }
        },
        seekforward: (details) => {
          const skipTime = details.seekOffset || 10;
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(
              audioRef.current.currentTime + skipTime,
              audioRef.current.duration || 0
            );
            updatePositionState();
          }
        },
        stop: () => {
          audioRef.current?.pause();
          audioRef.current.currentTime = 0;
          navigator.mediaSession.playbackState = 'none';
          setIsPlaying(false);
        },
        skipad: () => {
          console.log('Skip ad action triggered');
        }
      };
  
      // Register handlers
      Object.entries(actionHandlers).forEach(([action, handler]) => {
        try {
          navigator.mediaSession.setActionHandler(
            action as MediaSessionAction,
            handler as MediaSessionActionHandler
          );
        } catch (error) {
          console.warn(`Action '${action}' is not supported`);
        }
      });
  
      // Position state updates
      const positionUpdateInterval = setInterval(updatePositionState, 1000);
  
      // Bluetooth metadata
      if ('bluetooth' in navigator && navigator.bluetooth?.availableDevices) {
        const bluetoothMetadata = {
          title: new TextEncoder().encode(track.title),
          artist: new TextEncoder().encode(track.artist.name),
          album: new TextEncoder().encode(track.album.title),
          duration: new TextEncoder().encode(duration.toString()),
          currentTime: new TextEncoder().encode(seekPosition.toString()),
          genre: track.genre ? new TextEncoder().encode(track.genre) : undefined,
          year: track.year ? new TextEncoder().encode(track.year.toString()) : undefined,
          trackNumber: track.trackNumber ? new TextEncoder().encode(track.trackNumber.toString()) : undefined,
          currentLyric: lyrics[currentLyricIndex]?.text 
            ? new TextEncoder().encode(lyrics[currentLyricIndex].text)
            : undefined
        };
  
        navigator.bluetooth.availableDevices.forEach(device => {
          if (device.gatt?.connected) {
            void updateBluetoothMetadata(device, bluetoothMetadata);
          }
        });
      }
  
      return () => {
        clearInterval(positionUpdateInterval);
        Object.keys(actionHandlers).forEach(action => {
          try {
            navigator.mediaSession.setActionHandler(action as MediaSessionAction, null);
          } catch (error) {
            console.warn(`Failed to clear action handler for '${action}'`);
          }
        });
      };
    }
  }, [
    currentTrack,
    duration,
    seekPosition,
    togglePlay,
    previousTrack,
    skipTrack,
    lyrics,
    currentLyricIndex,
    showNotification,
  ]);

  const playTrackFromSource = async (track: Track) => {
    const offlineTrack = await getOfflineTrack(track.id);
    if (offlineTrack) {
      audioRef.current.src = offlineTrack;
    } else {
      audioRef.current.src = `${API_BASE_URL}/api/track/${track.id}.mp3`;
    }
  
    // Set saved position and log it
    if (track.id === currentTrack?.id) {
      console.log(`Setting playback position to: ${savedPosition}`);
      audioRef.current.currentTime = savedPosition || 0;
    }
  
    audioRef.current.oncanplay = () => {
      console.log(`Final playback position before play(): ${audioRef.current.currentTime}`);
      void audioRef.current.play();
    };
  };
  
  

  const playTrack = (track: Track) => {
    if (currentTrack) {
      setPreviousTracks((prev) => {
        // Remove any duplicates of the current track
        const filteredPrev = prev.filter((t) => t.id !== currentTrack.id);
        return [currentTrack, ...filteredPrev.slice(0, 49)];
      });
    }
    updateQueue(track);
    setCurrentTrack(track);
  };





  const addToQueue = (track: Track) => {
    setQueue((prevQueue) => {
      // Check if the track already exists in the queue
      if (!prevQueue.some((t) => t.id === track.id)) {
        return [...prevQueue, track];
      }
      return prevQueue;
    });
  };





  const getMostPlayedArtists = (): string[] => {
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]') as Track[];
    const artistCounts = recentlyPlayed.reduce<Record<string, number>>((acc, track) => {
      acc[track.artist.name] = (acc[track.artist.name] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(artistCounts).sort((a, b) => artistCounts[b] - artistCounts[a]);
  };

  const fetchRandomSongs = async (artists: string[]): Promise<Track[]> => {
    const randomSongs: Track[] = [];
    for (const artist of artists) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/search/tracks?query=${encodeURIComponent(artist)}`);
        const data = await response.json();
        randomSongs.push(...data.results.slice(0, 5));
      } catch (error) {
        console.error('Error fetching random songs:', error);
      }
    }
    return randomSongs;
  };
  
  const preloadQueueTracks = async (queueTracks: Track[]) => {
    const nextTracks = queueTracks.slice(1, 4);
    for (const [index, track] of nextTracks.entries()) {
      if (track) {
        const offlineTrack = await getOfflineTrack(track.id);
        const audio = new Audio(offlineTrack || `${API_BASE_URL}/api/track/${track.id}.mp3`);
        audio.preload = 'auto';
        preloadedAudios.current[index] = audio;
      }
    }
  };

  const updateRecentlyPlayed = (track: Track) => {
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]') as Track[];
    const updatedRecentlyPlayed = [track, ...recentlyPlayed.filter((t) => t.id !== track.id)].slice(0, 4);
    localStorage.setItem('recentlyPlayed', JSON.stringify(updatedRecentlyPlayed));
    setJumpBackIn(updatedRecentlyPlayed);
  };

  const shuffleQueue = () => {
    const shuffledQueue = [...queue];
    for (let i = shuffledQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQueue[i], shuffledQueue[j]] = [shuffledQueue[j], shuffledQueue[i]];
    }
    setQueue(shuffledQueue);
    setShuffleOn(!shuffleOn);
  };

  const addToPlaylist = (track: Track, playlistName: string) => {
    const updatedPlaylists = playlists.map((playlist) =>
      playlist.name === playlistName ? { ...playlist, tracks: [...playlist.tracks, track] } : playlist
    );
    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
  };

  const handleTrackEnd = useCallback(() => {
    console.log("Track ended, current repeat mode:", repeatMode);
    console.log("Current queue length:", queue.length);
    console.log("Current track:", currentTrack?.title);
  
    // First, let's handle repeat mode 'one' (single track repeat)
    if (repeatMode === 'one') {
      console.log("Handling repeat mode ONE");
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      }
      return;
    }
  
    // Handle repeat mode 'all' (repeat entire queue)
    if (repeatMode === 'all') {
      if (queue.length === 1) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play();
        }
      } else {
        const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
        if (currentIndex === queue.length - 1) {
          setCurrentTrack(queue[0]);
          setQueue(queue);
        } else {
          skipTrack();
        }
      }
      return;
    }
  
    // Default behavior (repeatMode === 'off')
    console.log("Repeat mode OFF, standard behavior");
    if (queue.length > 1) {
      skipTrack();
    } else {
      setIsPlaying(true);
    }
  }, [repeatMode, queue, currentTrack, skipTrack, setIsPlaying]);

  // Effect for managing audio loop property
  useEffect(() => {
    console.log("Audio loop property updating, repeat mode:", repeatMode);
    if (audioRef.current) {
      const shouldLoop = repeatMode === 'one';
      console.log("Setting audio loop to:", shouldLoop);
      audioRef.current.loop = shouldLoop;
    }
  }, [repeatMode]);

// Effect for setting up the ended event listener
useEffect(() => {
  // Get reference to the audio element
  const audio = audioRef.current;
  
  // Create the event handler
  const handleEnded = () => {
    handleTrackEnd();
  };
  
  // Add the event listener
  audio.addEventListener('ended', handleEnded);

  // Cleanup function to remove the event listener
  return () => {
    audio.removeEventListener('ended', handleEnded);
  };
}, [handleTrackEnd]); // Only re-run if handleTrackEnd changes
  


  

  const handleTimeUpdate = useCallback(() => {
    setSeekPosition(audioRef.current.currentTime);
    localStorage.setItem('seekPosition', audioRef.current.currentTime.toString());
  }, []);
  
  // Update duration when metadata is loaded
  const handleLoadedMetadata = useCallback(() => {
    setDuration(audioRef.current.duration);
  }, []);

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setSeekPosition(time);
    }
  };

  const handleSeekInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    handleSeek(newTime);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  // const closeContextMenu = () => {
  //   setShowContextMenu(false);
  // };

  const createPlaylist = () => {
    if (newPlaylistName) {
      const newPlaylist: Playlist = {
        name: newPlaylistName,
        image: newPlaylistImage || '/placeholder.svg?height=80&width=80',
        tracks: selectedTracksForNewPlaylist,
      };
      const updatedPlaylists = [...playlists, newPlaylist];
      setPlaylists(updatedPlaylists);
      setNewPlaylistName('');
      setNewPlaylistImage(null);
      setSelectedTracksForNewPlaylist([]);
      setShowCreatePlaylist(false);
      setShowSearchInPlaylistCreation(false);
      localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlaylistImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddToPlaylistModal = (track: Track) => {
    setContextMenuTrack(track);
    setShowAddToPlaylistModal(true);
  };

  const handleAddToPlaylist = () => {
    if (selectedPlaylistForAdd && contextMenuTrack) {
      addToPlaylist(contextMenuTrack, selectedPlaylistForAdd);
      setShowAddToPlaylistModal(false);
      setSelectedPlaylistForAdd(null);
    }
  };

  const toggleTrackSelection = (track: Track) => {
    setSelectedTracksForNewPlaylist((prev) =>
      prev.some((t) => t.id === track.id) ? prev.filter((t) => t.id !== track.id) : [...prev, track]
    );
  };

  const openPlaylist = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setView('playlist');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pinPlaylist = (playlist: Playlist) => {
    console.log('Pin playlist functionality not implemented yet');
  };

  const handleContextMenu = (e: MouseEvent, item: Track | Playlist) => {
    e.preventDefault();
    const options: ContextMenuOption[] = [
      { label: 'Add to Queue', action: () => addToQueue(item as Track) },
      { label: 'Add to Playlist', action: () => openAddToPlaylistModal(item as Track) },
      { label: 'Add to Liked Songs', action: () => toggleLike(item as Track) },
      { label: 'Download', action: () => downloadTrack(item as Track) },
    ];

    if ('tracks' in item) {
      options.push({ label: 'Pin Playlist', action: () => pinPlaylist(item as Playlist) });
    }

    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOptions(options);
  };

  const CustomContextMenu = ({ x, y, onClose, options }: CustomContextMenuProps) => {
    return (
      <div
        className="fixed bg-gray-800 rounded-lg shadow-lg p-2 z-50"
        style={{ top: y, left: x }}
        onMouseLeave={onClose}
      >
        {options.map((option, index) => (
          <button
            key={index}
            className="block w-full text-left px-4 py-2 hover:bg-gray-700"
            onClick={() => {
              option.action();
              onClose();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };
  
  

  
  

  const TrackItem = ({ track, showArtist = true, inPlaylistCreation = false }: TrackItemProps) => {
    const [isHovered, setIsHovered] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  
    useEffect(() => {
      const checkOfflineAvailability = async () => {
        const offlineTrack = await getOfflineTrack(track.id);
        setIsOfflineAvailable(!!offlineTrack);
      };
      checkOfflineAvailability();
    }, [track.id]);
  
    const handleTrackClick = (e: React.MouseEvent) => {
      if (inPlaylistCreation) {
        e.stopPropagation();
        toggleTrackSelection(track);
      } else {
        playTrack(track);
      }
    };
  
    return (
      <div
        className={`group flex items-center space-x-4 bg-gray-800 bg-opacity-40 rounded-lg p-2 relative cursor-pointer ${inPlaylistCreation ? 'selectable' : ''}`}
        onClick={handleTrackClick}
        onContextMenu={(e) => handleContextMenu(e, track)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <img src={track.album.cover_medium} alt={track.title} className="w-12 h-12 rounded-md" />
          {isHovered && !inPlaylistCreation && (
            <button
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300"
              onClick={(e) => {
                e.stopPropagation();
                playTrack(track);
              }}
            >
              <Play className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
        <div className="flex-grow">
          <p className="font-medium">{track.title}</p>
          {showArtist && <p className="text-sm text-gray-400">{track.artist.name}</p>}
        </div>
        {inPlaylistCreation ? (
          <input
            type="checkbox"
            checked={selectedTracksForNewPlaylist.some((t) => t.id === track.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleTrackSelection(track);
            }}
            className="ml-auto bg-gray-700 rounded-full border-none"
          />
        ) : (
          isHovered && (
            <div className="flex space-x-2 transition-opacity duration-300">
              <button
                className="bg-gray-700 rounded-full p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(track);
                }}
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <button
                className="bg-gray-700 rounded-full p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddToPlaylistModal(track);
                }}
              >
                <Library className="w-4 h-4 text-white" />
              </button>
            </div>
          )
        )}
      </div>
    );
  };

  const playPlaylist = (playlist: Playlist) => {
    setQueue(playlist.tracks);
    setCurrentTrack(playlist.tracks[0]);
    setIsPlaying(true);
  };

  const downloadPlaylist = async (playlist: Playlist) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const totalTracks = playlist.tracks.length;
    let downloadedTracks = 0;

    for (const track of playlist.tracks) {
      await downloadTrack(track);
      downloadedTracks++;
      setDownloadProgress((downloadedTracks / totalTracks) * 100);
    }
    playlist.downloaded = true;
    setIsDownloading(false);
  };

  const downloadTrack = async (track: Track) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/track/${track.id}.mp3`);
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);

      const offlineTracks = JSON.parse(localStorage.getItem('offlineTracks') || '{}') as Record<string, string>;
      offlineTracks[track.id] = objectURL;
      localStorage.setItem('offlineTracks', JSON.stringify(offlineTracks));

      // Save the blob to IndexedDB for permanent storage
      const db = await openDatabase();
      const transaction = db.transaction('tracks', 'readwrite');
      const store = transaction.objectStore('tracks');
      store.put({ id: track.id, blob });
    } catch (error) {
      console.error('Error downloading track:', error);
    }
  };

  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OctaveDB', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tracks')) {
          db.createObjectStore('tracks', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  };

  const getOfflineTrack = async (trackId: string): Promise<string | null> => {
    // Check IndexedDB for the track blob
    const db = await openDatabase();
    const transaction = db.transaction('tracks', 'readonly');
    const store = transaction.objectStore('tracks');
    console.log(store);
    const request = store.get(trackId);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        if (result) {
          const objectURL = URL.createObjectURL(result.blob);
          resolve(objectURL);
        } else {
          resolve(null);
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  };
  
  const toggleLike = (track: Track | null = currentTrack) => {
    if (!track) return;

    const likedSongsPlaylist = playlists.find((p) => p.name === 'Liked Songs');
    if (!likedSongsPlaylist) return;

    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.name === 'Liked Songs') {
        const isAlreadyLiked = playlist.tracks.some((t) => t.id === track.id);
        if (isAlreadyLiked) {
          return { ...playlist, tracks: playlist.tracks.filter((t) => t.id !== track.id) };
        } else {
          return { ...playlist, tracks: [...playlist.tracks, track] };
        }
      }
      return playlist;
    });

    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    setIsLiked(!isLiked);
  };

  const isTrackLiked = (track: Track) => {
    const likedSongsPlaylist = playlists.find((p) => p.name === 'Liked Songs');
    return likedSongsPlaylist ? likedSongsPlaylist.tracks.some((t) => t.id === track.id) : false;
  };

  const smartShuffle = (playlist: Playlist) => {
    const artistCounts: Record<string, number> = {};
    playlist.tracks.forEach((track) => {
      artistCounts[track.artist.name] = (artistCounts[track.artist.name] || 0) + 1;
    });

    const mostCommonArtist = Object.keys(artistCounts).reduce((a, b) =>
      artistCounts[a] > artistCounts[b] ? a : b
    );

    const additionalTracks = searchResults
      .filter(
        (track) => track.artist.name === mostCommonArtist && !playlist.tracks.some((t) => t.id === track.id)
      )
      .slice(0, 5);

    const newPlaylistTracks = [...playlist.tracks, ...additionalTracks];
    const shuffledTracks = newPlaylistTracks.sort(() => Math.random() - 0.5);

    const updatedPlaylist = { ...playlist, tracks: shuffledTracks };
    const updatedPlaylists = playlists.map((p) => (p.name === playlist.name ? updatedPlaylist : p));

    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    setCurrentPlaylist(updatedPlaylist);
  };

  const parseLyrics = (lyricsString: string): Lyric[] => {
    const parsedLyrics = lyricsString.split('\n').map((line) => {
      const [time, text] = line.split(']');
      const [minutes, seconds] = time.replace('[', '').split(':');
      const timeInSeconds = parseFloat(minutes) * 60 + parseFloat(seconds);
      return {
        time: parseFloat(timeInSeconds.toFixed(1)),
        text: text.trim(),
      };
    });
    return parsedLyrics;
  };

  const fetchLyrics = async (track: Track) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lyrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, artist: track.artist.name }),
      });
      const data = await response.json();
      if (data.success && data.synced) {
        const parsedLyrics = parseLyrics(data.lyrics);
        setLyrics(parsedLyrics);
      } else {
        setLyrics([]);
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      setLyrics([]);
    }
  };


  const toggleLyricsView = () => {
    setShowLyrics(!showLyrics);
  };

  

  useEffect(() => {
    const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]') as Track[];
    if (savedQueue.length > 0) {
      setQueue(savedQueue);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('queue', JSON.stringify(queue));
  }, [queue]);

  
  

  useEffect(() => {
    const updateCurrentLyric = () => {
      if (lyrics.length === 0) return;
  
      const currentTime = parseFloat(audioRef.current.currentTime.toFixed(1));
      const index = lyrics.findIndex((lyric) => lyric.time > currentTime);
  
      setCurrentLyricIndex(index > 0 ? index - 1 : lyrics.length - 1);
    };
    const interval = setInterval(updateCurrentLyric, 500);
    return () => clearInterval(interval);
  }, [lyrics]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  const deletePlaylist = (playlist: Playlist) => {
    const updatedPlaylists = playlists.filter((p) => p.name !== playlist.name);
    setPlaylists(updatedPlaylists);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
  };





// Onboarding States
// Keep the showArtistSelection state and add artistSelectionComplete handler
const [onboardingStep, setOnboardingStep] = useState<number>(0);
const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
const [showArtistSelection, setShowArtistSelection] = useState<boolean>(false);

// Add back the artist selection completion handler
const handleArtistSelectionComplete = async (artists: Artist[]) => {
  try {
    // Stop playback
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    
    // Save artist preferences
    localStorage.setItem('favoriteArtists', JSON.stringify(artists));
    setShowArtistSelection(false);

    // Fetch tracks for selected artists
    const fetchPromises = artists.map(async (artist) => {
      const response = await fetch(
        `${API_BASE_URL}/api/search/tracks?query=${encodeURIComponent(artist.name)}`
      );
      const data = await response.json();
      return data.results.slice(0, 5);
    });

    // Process tracks
    const artistTracks = await Promise.all(fetchPromises);
    const allTracks = artistTracks.flat();
    const shuffledTracks = allTracks.sort(() => Math.random() - 0.5);

    // Update player state
    setQueue(shuffledTracks);
    setSearchResults(shuffledTracks);
    
    if (shuffledTracks.length > 0) {
      setCurrentTrack(shuffledTracks[0]);
      setIsPlaying(false);
    }

    // Set up recent tracks
    const recentTracks = shuffledTracks.slice(0, 4);
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentTracks));
    setJumpBackIn(recentTracks);

    // Initialize Liked Songs playlist if needed
    if (!playlists.some(p => p.name === 'Liked Songs')) {
      const updatedPlaylists = [
        ...playlists,
        { name: 'Liked Songs', image: '/images/liked-songs.webp', tracks: [] }
      ];
      setPlaylists(updatedPlaylists);
      localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
    }
  } catch (error) {
    console.error('Error in artist selection completion:', error);
  }
};



// Initialize onboarding
useEffect(() => {
  const onboardingDone = localStorage.getItem('onboardingDone');
  if (!onboardingDone) {
    startOnboarding();
  }
}, []);

// Core Onboarding Functions
const startOnboarding = () => {
  setShowOnboarding(true);
  setOnboardingStep(1);
};

const handleOnboardingComplete = () => {
  localStorage.setItem('onboardingDone', 'true');
  setShowOnboarding(false);
  setShowArtistSelection(false);
  setOnboardingStep(0);
  setView('home');
};

const handleStep1Complete = () => {
  setOnboardingStep(2);
};

const handleStep2Complete = (artists: Artist[]) => {
  handleArtistSelectionComplete(artists).then(() => {
    handleOnboardingComplete();
  });
};

// Artist Selection Component
interface ArtistSelectionProps {
  onComplete: (selectedArtists: Artist[]) => void;
}

const ArtistSelection: React.FC<ArtistSelectionProps> = ({ onComplete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (value: string, currentSelectedArtists: Artist[]) => {
    if (value.length > 2) {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/search/artists?query=${encodeURIComponent(value)}`
        );
        const data = await response.json();
        const filteredResults = (data.results || []).filter(
          (artist: Artist) => !currentSelectedArtists.some((a) => a.id === artist.id)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching artists:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string, selectedArtists: Artist[]) => {
        performSearch(value, selectedArtists);
      }, 300),
    [performSearch]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSearch(value, selectedArtists);
    },
    [debouncedSearch, selectedArtists]
  );

  const handleArtistSelect = useCallback(
    (artist: Artist) => {
      if (selectedArtists.length < 5) {
        setSelectedArtists((prev) => [...prev, artist]);
        setSearchResults((prev) => prev.filter((a) => a.id !== artist.id));
        setSearchTerm('');
      }
    },
    [selectedArtists.length]
  );

  const handleArtistUnselect = useCallback((artist: Artist) => {
    setSelectedArtists((prev) => prev.filter((a) => a.id !== artist.id));
  }, []);

  return (
    <div className="min-h-screen overflow-y-auto custom-scrollbar bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300">
            Pick Your Vibe
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Select up to 5 artists you love and we'll create your perfect musical atmosphere
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-12">
          <div
            className={`relative transform transition-all duration-200 ${
              isSearchFocused ? 'scale-105' : 'scale-100'
            }`}
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search for your favorite artists..."
                value={searchTerm}
                onChange={handleSearchInput}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full px-6 py-4 text-lg bg-white/10 backdrop-blur-xl border border-white/20 
                         rounded-2xl text-white placeholder-gray-400 outline-none focus:ring-2 
                         focus:ring-purple-500/50 transition-all duration-300"
                style={{ caretColor: 'white' }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
                ) : (
                  <Search className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Artists Section */}
        {selectedArtists.length > 0 && (
          <div className="max-w-5xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Selected Artists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {selectedArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="group relative aspect-square rounded-2xl overflow-hidden 
                           transform transition-all duration-300 hover:scale-95"
                  onClick={() => handleArtistUnselect(artist)}
                >
                  <img
                    src={artist.picture_medium}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                                flex flex-col justify-end p-4">
                    <p className="text-white font-semibold">{artist.name}</p>
                    <p className="text-red-400 text-sm">Click to remove</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results Section */}
        {searchResults.length > 0 && (
          <div className="max-w-5xl mx-auto pb-20">
            <h2 className="text-2xl font-bold text-white mb-6">Search Results</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {searchResults.map((artist) => (
                <div
                  key={artist.id}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer 
                           transform transition-all duration-300 hover:scale-105"
                  onClick={() => handleArtistSelect(artist)}
                >
                  <img
                    src={artist.picture_medium}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                                flex flex-col justify-end p-4">
                    <p className="text-white font-semibold">{artist.name}</p>
                    <p className="text-green-400 text-sm">Click to select</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 inset-x-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
            <p className="text-white">
              <span className="text-2xl font-bold text-purple-400">{selectedArtists.length}</span>
              <span className="ml-2 text-gray-400">of 5 artists selected</span>
            </p>
            <button
              onClick={() => onComplete(selectedArtists)}
              disabled={selectedArtists.length === 0}
              className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
                selectedArtists.length === 0
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-pink-600 hover:to-purple-600 text-white transform hover:scale-105'
              }`}
            >
              {selectedArtists.length === 0 ? 'Select Artists to Continue' : 'Complete Selection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Onboarding Steps Components
const OnboardingStep1: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-bl from-[#1e1e2f] via-[#282843] to-[#0d0d14] text-white">
    <div className="relative text-center p-8 bg-gradient-to-br from-black/50 to-black/70 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg">
      {/* Subtle Decorative Elements */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500 opacity-30 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-800 opacity-20 blur-3xl" />

      {/* Music Icon */}
      <div className="flex justify-center mb-8">
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 rounded-full p-4 shadow-md">
          <Music className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Title Section */}
      <h1 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-blue-400">
        Welcome to Octave
      </h1>
      <p className="text-lg text-gray-300 mb-8 leading-relaxed">
        Your gateway to a world of music tailored just for you. Let’s craft your ultimate
        soundtrack together.
      </p>

      {/* Get Started Button */}
      <button
        onClick={onComplete}
        className="px-10 py-4 text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-purple-500 hover:to-pink-500 text-white rounded-full shadow-xl transform transition-transform hover:translate-y-[-2px] focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50"
      >
        Get Started
      </button>

      {/* Decorative Footer Line */}
      <div className="mt-10 flex items-center justify-center space-x-2">
        <div className="h-[2px] w-10 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
        <p className="text-sm text-gray-400">A personalized music experience awaits</p>
        <div className="h-[2px] w-10 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      </div>
    </div>
  </div>
);

// Onboarding Flow Control
if (showOnboarding) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black custom-scrollbar overflow-y-auto">
      {onboardingStep === 1 && <OnboardingStep1 onComplete={handleStep1Complete} />}
      {onboardingStep === 2 && <ArtistSelection onComplete={handleStep2Complete} />}
    </div>
  );
}


if (showArtistSelection) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black">
      <ArtistSelection onComplete={handleArtistSelectionComplete} />
    </div>
  );
}
  


  return (

    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Mobile View */}
 
      <div className="md:hidden flex flex-col h-full">
        <header className="p-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Good morning</h1>
          <div className="flex space-x-4">
            <Bell className="w-6 h-6" />
            <Clock className="w-6 h-6" />
            <Cog className="w-6 h-6" />
          </div>
        </header>
        <form
          onSubmit={(e: FormEvent<HTMLFormElement>) => e.preventDefault()}
          className="px-4 mb-4"
        >
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full p-2 rounded-full bg-gray-800 text-white"
          />
        </form>
        <nav className="px-4 mb-4">
          <ul className="flex space-x-2 overflow-x-auto custom-scrollbar">
            <li>
              <button className="bg-gray-800 rounded-full px-4 py-2 text-sm font-medium">
                Music
              </button>
            </li>
            <li>
              <button className="bg-gray-800 rounded-full px-4 py-2 text-sm font-medium">
                Podcasts &amp; Shows
              </button>
            </li>
            <li>
              <button className="bg-gray-800 rounded-full px-4 py-2 text-sm font-medium">
                Audiobooks
              </button>
            </li>
          </ul>
        </nav>
        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-20">
          {showLyrics ? (
            <div className="h-full flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold mb-4">{currentTrack?.title}</h2>
              <p className="text-lg mb-8">{currentTrack?.artist.name}</p>
              <div className="text-center" ref={lyricsRef}>
                {lyrics.map((lyric, index) => (
                  <p
                    key={index}
                    className={`text-lg ${
                      index === currentLyricIndex ? 'text-green-500 font-bold' : 'text-gray-400'
                    }`}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            </div>
          ) : view === 'playlist' && currentPlaylist ? (
            <section>
              {/* Playlist Header */}
              <div className="relative h-64 mb-4">
                <img
                  src={currentPlaylist.image}
                  alt={currentPlaylist.name}
                  className="w-full h-full object-cover rounded-lg"
                  style={{ filter: 'blur(5px) brightness(0.5)' }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <h2 className="text-4xl font-bold mb-2">{currentPlaylist.name}</h2>
                  <div className="flex space-x-2">
                    <button
                      className="bg-white text-black rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() => playPlaylist(currentPlaylist)}
                    >
                      Play
                    </button>
                    <button
                      className="bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={shuffleQueue}
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                    <button
                      className="bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() => smartShuffle(currentPlaylist)}
                    >
                      Smart Shuffle
                    </button>
                    <button
                      className="bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() => downloadPlaylist(currentPlaylist)}
                    >
                      {isDownloading ? (
                        <div className="relative flex items-center">
                          <Download className={`w-4 h-4 mr-2 ${downloadProgress === 100 ? 'text-blue-500' : ''}`} />
                          <span>{Math.round(downloadProgress)}%</span>
                        </div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {/* Playlist Tracks */}
              <div className="space-y-2">
              {currentPlaylist.tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-400 mb-4">This playlist is empty.</p>
                <button
                  className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                  setShowSearchInPlaylistCreation(true);
                  setCurrentPlaylist(currentPlaylist); // Ensure the current playlist is set
                  }}
                >
                  Add Songs
                </button>
              </div>
            ) : (
              currentPlaylist.tracks.map((track, index) => (
                <TrackItem key={index} track={track} />
              ))
            )}
              </div>
          
            </section>
          ) : searchQuery ? (
            <section>
              <h2 className="text-2xl font-bold mb-4">Search Results</h2>
              <div className="grid gap-4">
                {searchResults.map((track) => (
                  <TrackItem key={track.id} track={track} />
                ))}
              </div>
            </section>
          ) : view === 'library' ? (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Your Library</h2>
                <button
                  className="p-2 rounded-full hover:bg-white/10"
                  onClick={() => setShowCreatePlaylist(true)}
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </div>
                <div className="grid grid-cols-1 gap-4">
                {playlists.map((playlist) => (
                  <div
                  key={playlist.name}
                  className={`bg-gray-800 bg-opacity-40 rounded-lg p-4 flex items-center cursor-pointer relative ${
                  playlist.pinned ? 'border-2 border-blue-900' : ''
                  }`}
                  draggable
                  onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', playlist.name);
                  e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                  e.preventDefault();
                  const draggedPlaylistName = e.dataTransfer.getData('text/plain');
                  const draggedPlaylistIndex = playlists.findIndex(p => p.name === draggedPlaylistName);
                  const targetPlaylistIndex = playlists.findIndex(p => p.name === playlist.name);
                  const updatedPlaylists = [...playlists];
                  const [draggedPlaylist] = updatedPlaylists.splice(draggedPlaylistIndex, 1);
                  updatedPlaylists.splice(targetPlaylistIndex, 0, draggedPlaylist);
                  setPlaylists(updatedPlaylists);
                  localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
                  }}
                  onClick={() => openPlaylist(playlist)} // Add this line
                  style={{ userSelect: 'none' }} // Make text unselectable
                  >
                  <img
                  src={playlist.image}
                  alt={playlist.name}
                  className="w-12 h-12 rounded mr-3"
                  />
                  <span className="font-medium text-sm">{playlist.name}</span>
                  {playlist.downloaded && (
                  <Download className="w-4 h-4 text-green-500 ml-2" />
                  )}
                  <button
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10"
                  onClick={(e) => {
                  e.stopPropagation();
                  const options: ContextMenuOption[] = [
                    { label: 'Pin Playlist', action: () => pinPlaylist(playlist) },
                    { label: 'Delete Playlist', action: () => deletePlaylist(playlist) },
                    { label: 'Download Playlist', action: () => downloadPlaylist(playlist) },
                  ];
                  setContextMenuPosition({ x: e.clientX, y: e.clientY });
                  setContextMenuOptions(options);
                  setShowContextMenu(true);
                  }}
                  >
                  <span className="w-4 h-4 text-white">•••</span>
                  </button>
                  </div>
                ))}
                </div>
            </section>
          ) :
          
          (
            <>
              {/* Playlists */}
              <section className="mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {playlists.map((playlist, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 bg-opacity-40 rounded-lg p-4 flex items-center cursor-pointer"
                      onClick={() => openPlaylist(playlist)}
                    >
                      <img
                        src={playlist.image}
                        alt={playlist.name}
                        className="w-12 h-12 rounded mr-3"
                      />
                      <span className="font-medium text-sm">{playlist.name}</span>
                    </div>
                  ))}
                </div>
              </section>
              {/* Jump Back In */}
              <section className="mb-6">
                {jumpBackIn.length > 0 && <h2 className="text-2xl font-bold mb-4">Jump Back In</h2>}

                {jumpBackIn.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto custom-scrollbar">

                    {jumpBackIn.map((track, index) => (
                      <div key={index} className="flex-shrink-0 w-40">
                        <div className="relative">
                          <img
                            src={track.album.cover_medium}
                            alt={track.title}
                            className="w-40 h-40 object-cover rounded-lg mb-2"
                          />
                          <button
                            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            onClick={() => playTrack(track)}
                          >
                            <Play className="w-12 h-12 text-white" />
                          </button>
                        </div>
                        <p className="font-medium text-sm">{track.title}</p>
                      </div>
                      
                    ))}

                  </div>
                ) : (
                  <div>
                <h2 className="text-2xl font-bold mb-4">Suggested for you</h2>
                <div className="flex space-x-4 overflow-x-auto custom-scrollbar">
                      {searchResults.slice(0, 5).map((track, index) => (
                        <div key={index} className="flex-shrink-0 w-40">
                          <div className="relative">
                            <img
                              src={track.album.cover_medium}
                              alt={track.title}
                              className="w-40 h-40 object-cover rounded-lg mb-2"
                            />
                            <button
                              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              onClick={() => playTrack(track)}
                            >
                              <Play className="w-12 h-12 text-white" />
                            </button>
                          </div>
                          <p className="font-medium text-sm">{track.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
              {/* Recommended */}
              <section>
                <h2 className="text-2xl font-bold mb-4">Recommended for you</h2>
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((track) => (
                    <TrackItem key={track.id} track={track} />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
        {/* Mobile Footer */}
        {!isPlayerOpen && (
          <footer
          className="bg-black p-4 flex justify-around fixed bottom-0 left-0 right-0"
          style={{ zIndex: 9999 }}
        >
          <button
            className="flex flex-col items-center text-gray-400 hover:text-white"
            onClick={() => {
              setView('home');
              setSearchQuery('');
            }}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            className="flex flex-col items-center text-gray-400 hover:text-white"
            onClick={() => setView('search')}
          >
            <Search className="w-6 h-6" />
            <span className="text-xs mt-1">Search</span>
          </button>
          <button
          className="flex flex-col items-center text-gray-400 hover:text-white"
          onClick={() => {
            setShowMobileLibrary(true);
            setView('library');
          }}
        >
          <Library className="w-6 h-6" />
          <span className="text-xs mt-1">Your Library</span>
        </button>

        </footer>
        )}
        {/* Mobile Miniplayer */}
        {currentTrack && (
          <MobilePlayer
            currentTrack={currentTrack}
            currentTrackIndex={queue.findIndex((t) => t.id === currentTrack?.id)}
            isPlaying={isPlaying}
            removeFromQueue={removeFromQueue}
            togglePlay={togglePlay}
            skipTrack={skipTrack}
            previousTrack={previousTrack}
            seekPosition={seekPosition}
            duration={duration}
            handleSeek={handleSeek}
            isLiked={isLiked}
            repeatMode={repeatMode}
            setRepeatMode={setRepeatMode}
            toggleLike={toggleLike}
            lyrics={lyrics}
            currentLyricIndex={currentLyricIndex}
            queue={queue}
            previousTracks={previousTracks} // Add this
            shuffleOn={shuffleOn}
            shuffleQueue={shuffleQueue}
            showLyrics={showLyrics}
            toggleLyricsView={toggleLyricsView}
            onQueueItemClick={onQueueItemClick}
            setIsPlayerOpen={setIsPlayerOpen} 
          />
      )}
      </div>
      {/* Desktop View */}
      <div className="hidden md:flex flex-1 gap-2 p-2 overflow-y-auto custom-scrollbar">
        {showContextMenu && (
          <CustomContextMenu
            x={contextMenuPosition.x}
            y={contextMenuPosition.y}
            onClose={() => setShowContextMenu(false)}
            options={contextMenuOptions}
          />
        )}
        {/* Sidebar */}
        <aside className="w-64 bg-gradient-to-b from-gray-900 to-black rounded-lg p-4 overflow-y-auto custom-scrollbar">
          <nav className="space-y-4">
            {/* Main Navigation */}
            <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-lg p-3 space-y-2">
              <button
          className="flex items-center text-white hover:text-white w-full py-2 px-3 rounded-lg transition-colors duration-200"
          onClick={() => setView('home')}
              >
          <Home className="w-6 h-6 mr-3" />
          Home
              </button>
              <button
          className="flex items-center text-white hover:text-white w-full py-2 px-3 rounded-lg transition-colors duration-200"
          onClick={() => setView('search')}
              >
          <Search className="w-6 h-6 mr-3" />
          Search
              </button>
            </div>
            {/* Your Library */}
            <div className="bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-white">
            <Library className="w-6 h-6 mr-3" />
            Your Library
          </div>
          <Plus
            className="w-5 h-5 text-white hover:text-white cursor-pointer transition-colors duration-200"
            onClick={() => setShowCreatePlaylist(true)}
          />
              </div>
              <div className="space-y-2">
          {playlists.map((playlist, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 bg-gray-800 bg-opacity-40 backdrop-blur-sm rounded-md p-2 cursor-pointer hover:bg-gray-600 transition-colors duration-200"
              onClick={() => openPlaylist(playlist)}
            >
              <img src={playlist.image} alt={playlist.name} className="w-10 h-10 rounded-md" />
              <div>
                <p className="text-sm text-white">{playlist.name}</p>
                <p className="text-xs text-gray-400">Playlist</p>
              </div>
            </div>
          ))}
              </div>
            </div>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 bg-gradient-to-b from-gray-900 to-black rounded-lg p-6">
    <header className="flex justify-between items-center mb-8">
      <h1 className="text-4xl font-bold">Good morning</h1>
      <form onSubmit={(e: FormEvent<HTMLFormElement>) => e.preventDefault()} className="relative w-96">
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
      </form>
            <div className="relative flex items-center">
              {!window.matchMedia('(display-mode: standalone)').matches && (
              <button
                className="bg-white text-black rounded-full px-4 py-2 text-sm font-semibold ml-4"
                onClick={() => {
                const installPromptEvent = window.deferredPrompt;
                if (installPromptEvent) {
                  installPromptEvent.prompt();
                    installPromptEvent.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
                    if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    } else {
                    console.log('User dismissed the install prompt');
                    }
                    window.deferredPrompt = null;
                    });
                }
                }}
              >
                Install App
              </button>
              )}
              {/* User Menu */}
              <div className="relative ml-4">
              <button
                className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User className="w-5 h-5" />
              </button>
                {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-lg shadow-xl z-10 border border-gray-700">
                  <button
                  className="flex items-center px-6 py-3 text-lg text-gray-300 hover:bg-gray-700 w-full text-left rounded-t-lg"
                  onClick={() => {
                  setView('settings');
                  setShowUserMenu(false);
                  }}
                  >
                  <Cog className="w-5 h-5 mr-3" />
                  Settings
                  </button>
                  <button
                  className="flex items-center px-6 py-3 text-lg text-gray-300 hover:bg-gray-700 w-full text-left"
                  onClick={() => {
                  console.log('Profile');
                  setShowUserMenu(false);
                  }}
                  >
                  <User className="w-5 h-5 mr-3" />
                  Profile
                  </button>
                  <button
                  className="flex items-center px-6 py-3 text-lg text-gray-300 hover:bg-gray-700 w-full text-left rounded-b-lg"
                  onClick={() => {
                  console.log('Log out');
                  setShowUserMenu(false);
                  }}
                  >
                  <LogOut className="w-5 h-5 mr-3" />
                  Log out
                  </button>
                </div>
                )}
              </div>
            </div>
          </header>
          {/* Main Content Area */}
          {showLyrics ? (
            <div className="h-full flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold mb-4">{currentTrack?.title}</h2>
              <p className="text-xl mb-8">{currentTrack?.artist.name}</p>
              <div className="text-center max-h-[60vh] overflow-y-auto" ref={lyricsRef}>
                {lyrics.map((lyric, index) => (
                  <p
                    key={index}
                    className={`text-xl mb-4 ${
                      index === currentLyricIndex ? 'text-green-500 font-bold' : 'text-gray-400'
                    }`}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            </div>
          ) : view === 'settings' ? (
            <section>
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <div className="space-y-4">
              <div className="bg-gray-800 bg-opacity-40 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">Account</h3>
                <p className="text-gray-400">Manage your account settings and set e-mail preferences.</p>
              </div>
              <div className="bg-gray-800 bg-opacity-40 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">Playback</h3>
                <p className="text-gray-400">Customize your playback settings.</p>
                <div className="mt-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Default Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  localStorage.setItem('volume', newVolume.toString());
                  }}
                  className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                />
                </div>
                <div className="mt-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Default Music Quality</label>
                <select
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  onChange={(e) => {
                  const quality = e.target.value;
                  localStorage.setItem('musicQuality', quality);
                  }}
                  defaultValue={localStorage.getItem('musicQuality') || 'high'}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                </div>
              </div>
              <div className="bg-gray-800 bg-opacity-40 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">Privacy</h3>
                <p className="text-gray-400">Control your privacy settings and data usage.</p>
                <div className="mt-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Cache Music</label>
                <input
                  type="checkbox"
                  checked={localStorage.getItem('cacheMusic') === 'true'}
                  onChange={(e) => {
                  const cacheMusic = e.target.checked;
                  localStorage.setItem('cacheMusic', cacheMusic.toString());
                  }}
                  className="w-4 h-4 text-green-500 bg-gray-700 rounded border-gray-600 focus:ring-green-500"
                />
                </div>
              </div>
              <div className="bg-gray-800 bg-opacity-40 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">Notifications</h3>
                <p className="text-gray-400">Set your notification preferences.</p>
              </div>
              <div className="bg-gray-800 bg-opacity-40 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">Beta Features</h3>
                <p className="text-gray-400">Toggle beta features on or off.</p>
                <div className="mt-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Enable Beta Features</label>
                <input
                  type="checkbox"
                  checked={localStorage.getItem('betaFeatures') === 'true'}
                  onChange={(e) => {
                  const betaFeatures = e.target.checked;
                  localStorage.setItem('betaFeatures', betaFeatures.toString());
                  }}
                  className="w-4 h-4 text-green-500 bg-gray-700 rounded border-gray-600 focus:ring-green-500"
                />
                </div>
              </div>
              </div>
            </section>
          ) : view === 'playlist' && currentPlaylist ? (
 
            <section>
              {/* Playlist Header */}
              <div className="relative h-64 mb-4">
                <img
                  src={currentPlaylist.image}
                  alt={currentPlaylist.name}
                  className="w-full h-full object-cover rounded-lg"
                  style={{ filter: 'blur(5px) brightness(0.5)' }}
                />
                <div className="absolute inset-0 flex items-end p-4">
                  <div className="flex-grow">
                    <h2 className="text-4xl font-bold mb-2">{currentPlaylist.name}</h2>
                    <p className="text-sm text-gray-300">{currentPlaylist.tracks.length} tracks</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="bg-white text-black rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() => playPlaylist(currentPlaylist)}
                    >
                      Play
                    </button>
                    <button
                      className="bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={shuffleQueue}
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                    <button
                      className="bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() => smartShuffle(currentPlaylist)}
                    >
                      Smart Shuffle
                    </button>
                    <button
                      className="bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() => downloadPlaylist(currentPlaylist)}
                    >
                      {isDownloading ? (
                        <div className="relative">
                          <Download className="w-4 h-4" />
                          <div
                            className="absolute inset-0 rounded-full border-2 border-green-500"
                            style={{
                              clipPath: `circle(${downloadProgress}% at 50% 50%)`,
                            }}
                          ></div>
                        </div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {/* Playlist Tracks */}
              <div className="space-y-2">
                {currentPlaylist.tracks.map((track, index) => (
                  <TrackItem key={index} track={track} />
                ))}
              </div>
            </section>
          ) : searchQuery ? (
            <section>
              <h2 className="text-2xl font-bold mb-4">Search Results</h2>
              <div className="grid grid-cols-2 gap-4">
                {searchResults.map((track) => (
                  <TrackItem key={track.id} track={track} />
                ))}
              </div>
            </section>
          ) : view === 'search' ? (
            <section>
              <h2 className="text-2xl font-bold mb-4">Search Results</h2>
              <div className="grid grid-cols-2 gap-4">
              {searchResults.map((track) => (
                <TrackItem key={track.id} track={track} />
              ))}
              </div>
            </section>
            ) : (
            <>
              <h1 className="text-3xl font-bold mb-6">Good morning</h1>
              {/* Recently Played Playlists */}
              {playlists.length > 0 && (
                <section className="mb-8 overflow-y-auto custom-scrollbar">
                  <h2 className="text-2xl font-bold mb-4">Recently played</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {playlists.slice(0, 6).map((playlist, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 bg-opacity-40 rounded-lg p-4 flex items-center cursor-pointer"
                        onClick={() => openPlaylist(playlist)}
                      >
                        <img
                          src={playlist.image}
                          alt={playlist.name}
                          className="w-16 h-16 rounded mr-4"
                        />
                        <span className="font-medium">{playlist.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* Jump Back In */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Jump Back In</h2>
                <div className="grid grid-cols-4 gap-4">
                  {jumpBackIn.map((track, index) => (
                    <div key={index}>
                      <div className="relative">
                        <img
                          src={track.album.cover_medium}
                          alt={track.title}
                          className="w-30 aspect-square object-cover rounded-lg mb-2"
                        />
                        <button
                          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => playTrack(track)}
                        >
                          <Play className="w-12 h-12 text-white" />
                        </button>
                      </div>
                      <p className="font-medium">{track.title}</p>
                      <p className="text-sm text-gray-400">{track.artist.name}</p>
                    </div>
                  ))}
                </div>
              </section>
              
              {/* Recommended Tracks */}
              <section>
                <h2 className="text-2xl font-bold mb-4">Recommended</h2>
                <div className="grid grid-cols-2 gap-4">
                  {searchResults.map((track) => (
                    <TrackItem key={track.id} track={track} />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
        {/* Desktop Queue */}
        {showQueue && (
          <aside className="w-64 bg-gradient-to-b from-gray-900 to-black rounded-lg p-4 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold mb-4">Queue</h2>
            {queue.length === 0 ? (
              <div>
          <p className="text-gray-400 mb-4">Your queue is empty.</p>
            <button
            className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-600 transition-all duration-200"
            onClick={async () => {
              const mostPlayedArtists = getMostPlayedArtists();
              const randomSongs = await fetchRandomSongs(mostPlayedArtists);
              setQueue(randomSongs);
            }}
            >
            Add Suggestions
            </button>
              </div>
            ) : (
              <div className="space-y-2">
          {queue.map((track, index) => (
            <TrackItem key={index} track={track} showArtist={false} />
          ))}
              </div>
            )}
          </aside>
        )}
      </div>
      {/* Desktop Footer */}
      {currentTrack && (
        <footer className="bg-gradient-to-b from-black to-bg-blue-900 p-4 hidden md:block rounded-lg mx-2 mb-2">
          <div className="flex items-center justify-between">
            {/* Now Playing */}
            <div className="flex items-center space-x-4">
              <img
                src={currentTrack.album.cover_medium}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-md"
              />
              <div>
                <p className="font-semibold">{currentTrack.title}</p>
                <p className="text-sm text-gray-400">{currentTrack.artist.name}</p>
              </div>
              <button
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    toggleLike();
                  }}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'text-green-500 fill-current' : 'text-white'}`} />
            </button>
            </div>
            {/* Playback Controls */}
            <div className="flex flex-col items-center space-y-2 flex-grow mx-4">
              <div className="flex items-center space-x-4">
                <Shuffle
                  className={`w-5 h-5 cursor-pointer ${
                    shuffleOn ? 'text-green-500' : 'text-gray-400'
                  }`}
                  onClick={shuffleQueue}
                />
                <SkipBack
                  className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer"
                  onClick={previousTrack}
                />
                <button className="bg-white rounded-full p-2" onClick={togglePlay}>
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-black" />
                  ) : (
                    <Play className="w-6 h-6 text-black" />
                  )}
                </button>
                <SkipForward
                  className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer"
                  onClick={skipTrack}
                />
                <button onClick={toggleLyricsView}>
                  <Music
                    className={`w-5 h-5 ${showLyrics ? 'text-green-500' : 'text-gray-400'}`}
                  />
                </button>
              </div>
                
              <div className="w-full flex items-center space-x-2">
                <span className="text-xs">{formatTime(seekPosition)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={seekPosition}
                    onChange={handleSeekInputChange} // Use the new handler
                    className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-xs">{formatTime(duration)}</span>
                </div>
            </div>


            {/* Volume and Queue */}
            <div className="flex items-center space-x-4">
              <Volume2 className="w-5 h-5 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
              />
              <button onClick={() => setShowQueue(!showQueue)}>
                {showQueue ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </footer>
      )}
      {/* Modals */}
      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black rounded-lg p-6 w-96">
            <h2 className="text-2xl font-bold mb-4">Create Playlist</h2>
            <input
              type="text"
              placeholder="Playlist Name"
              value={newPlaylistName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPlaylistName(e.target.value)}
              className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
            />
            <div className="mb-4">
              <label htmlFor="playlist-image" className="block text-sm font-medium text-gray-400 mb-2">
                Playlist Cover Image
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="playlist-image"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600"
                >
                  {newPlaylistImage ? (
                    <img
                      src={newPlaylistImage}
                      alt="Playlist Cover"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-4 text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                    </div>
                  )}
                  <input
                    id="playlist-image"
                    type="file"
                    className="hidden"
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </label>
              </div>
            </div>
            <button
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4"
              onClick={() => setShowSearchInPlaylistCreation(true)}
            >
              Add Songs
            </button>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                onClick={() => setShowCreatePlaylist(false)}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-green-500 rounded hover:bg-green-600" onClick={createPlaylist}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Songs to Playlist Modal */}
      {showSearchInPlaylistCreation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add Songs to Playlist</h2>
            <input
              type="text"
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
            />
            <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
              {searchResults.map((track) => (
                <TrackItem key={track.id} track={track} inPlaylistCreation={true} />
              ))}
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-400">{selectedTracksForNewPlaylist.length} songs selected</p>
              <div className="flex space-x-2">
                <button
                  className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                  onClick={() => setShowSearchInPlaylistCreation(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
                  onClick={() => setShowSearchInPlaylistCreation(false)}
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add to Playlist Modal */}
      {showAddToPlaylistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black rounded-lg p-6 w-96">
            <h2 className="text-2xl font-bold mb-4">Add to Playlist</h2>
            {playlists.length === 1 ? (
              <div>
                <p className="mb-4">You don&apos;t have any playlists yet. Would you like to create one?</p>
                <button
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={() => {
                    setShowAddToPlaylistModal(false);
                    setShowCreatePlaylist(true);
                  }}
                >
                  Create Playlist
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {playlists.map((playlist, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 bg-gray-700 bg-opacity-30 rounded-md p-2 cursor-pointer ${
                        selectedPlaylistForAdd === playlist.name ? 'border-2 border-green-500' : ''
                      }`}
                      onClick={() => setSelectedPlaylistForAdd(playlist.name)}
                    >
                      <img src={playlist.image} alt={playlist.name} className="w-10 h-10 rounded-md" />
                      <p>{playlist.name}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                    onClick={() => setShowAddToPlaylistModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
                    onClick={handleAddToPlaylist}
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
}

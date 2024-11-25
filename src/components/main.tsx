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

const API_BASE_URL = 'https://reproduction-cardiff-increases-acquire.trycloudflare.com';

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
  [key: string]: string | number | { name: string } | { title: string; cover_medium: string };
}

interface Playlist {
  name: string;
  image: string;
  tracks: Track[];
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

export function SpotifyClone() {
  const [view, setView] = useState<'home' | 'search' | 'playlist' | 'settings'>('home');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [jumpBackIn, setJumpBackIn] = useState<Track[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [shows, setShows] = useState<{ name: string; image: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [previousTracks, setPreviousTracks] = useState<Track[]>([]);
  const [shuffleOn, setShuffleOn] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
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

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);
  
  const previousTrack = useCallback(() => {
    if (previousTracks.length > 0) {
      const [prevTrack, ...restPreviousTracks] = previousTracks;
      setCurrentTrack(prevTrack);
      setQueue([prevTrack, currentTrack!, ...queue.slice(1)]);
      setPreviousTracks(restPreviousTracks);
    }
  }, [currentTrack, previousTracks, queue]);
  
  const skipTrack = useCallback(async () => {
    if (currentTrack) {
      setPreviousTracks((prev) => [currentTrack, ...prev.slice(0, 49)]);
    }
    if (queue.length > 1) {
      const [, ...newQueue] = queue;
      setCurrentTrack(newQueue[0]);
      setQueue(newQueue);
    } else {
      const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]') as Track[];
      if (savedQueue.length > 1) {
        const [, ...newQueue] = savedQueue;
        setCurrentTrack(newQueue[0]);
        setQueue(newQueue);
        localStorage.setItem('queue', JSON.stringify(newQueue));
      } else {
        const mostPlayedArtists = getMostPlayedArtists();
        const randomSongs = await fetchRandomSongs(mostPlayedArtists);
        setQueue(randomSongs);
        setCurrentTrack(randomSongs[0]);
        localStorage.setItem('queue', JSON.stringify(randomSongs));
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

    const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]') as Track[];
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

    audioRef.current.addEventListener('ended', handleTrackEnd);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

    fetchSearchResults('Kendrick Lamar');

    return () => {
      audioRef.current.removeEventListener('ended', handleTrackEnd);
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
    if (lyricsRef.current && currentLyricIndex !== -1) {
      const lyricsContainer = lyricsRef.current;
      const currentLyricElement = lyricsContainer.children[currentLyricIndex] as HTMLElement;
      if (currentLyricElement) {
        const containerHeight = lyricsContainer.clientHeight;
        const lyricPosition = currentLyricElement.offsetTop;
        const lyricHeight = currentLyricElement.clientHeight;
        const scrollPosition = lyricPosition - containerHeight / 2 + lyricHeight / 2;

        lyricsContainer.scrollTo({
          top: scrollPosition - 50,
          behavior: 'smooth',
        });
      }
    }
  }, [currentLyricIndex]);

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

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack?.title || '',
        artist: currentTrack?.artist.name || '',
        album: currentTrack?.album.title || '',
        artwork: [
          { src: currentTrack?.album.cover_medium || '', sizes: '96x96', type: 'image/png' },
          { src: currentTrack?.album.cover_medium || '', sizes: '128x128', type: 'image/png' },
          { src: currentTrack?.album.cover_medium || '', sizes: '192x192', type: 'image/png' },
          { src: currentTrack?.album.cover_medium || '', sizes: '256x256', type: 'image/png' },
          { src: currentTrack?.album.cover_medium || '', sizes: '384x384', type: 'image/png' },
          { src: currentTrack?.album.cover_medium || '', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        togglePlay();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        togglePlay();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        previousTrack();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        skipTrack();
      });
    }
  }, [currentTrack, previousTrack, skipTrack, togglePlay]);


  const playTrackFromSource = async (track: Track) => {
    const offlineTrack = await getOfflineTrack(track.id);
    if (offlineTrack) {
      audioRef.current.src = offlineTrack;
    } else {
      audioRef.current.src = `${API_BASE_URL}/api/track/${track.id}.mp3`;
    }
    audioRef.current.play();
  };

  const getOfflineTrack = async (trackId: string): Promise<string | null> => {
    const offlineTracks = JSON.parse(localStorage.getItem('offlineTracks') || '{}') as Record<string, string>;
    return offlineTracks[trackId] || null;
  };

  const playTrack = (track: Track) => {
    if (currentTrack) {
      setPreviousTracks((prev) => [currentTrack, ...prev.slice(0, 49)]);
    }
    setCurrentTrack(track);
    setQueue([track, ...queue]);
  };


  const addToQueue = (track: Track) => {
    setQueue([...queue, track]);
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

  const preloadQueueTracks = (queueTracks: Track[]) => {
    queueTracks.slice(0, 3).forEach((track, index) => {
      if (track) {
        preloadedAudios.current[index].src = `${API_BASE_URL}/api/track/${track.id}.mp3`;
        preloadedAudios.current[index].load();
      }
    });
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
    skipTrack();
  }, [skipTrack]);

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
    setShowContextMenu(true);
    setContextMenuTrack(item as Track);
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

    return (
      <div
        className="group flex items-center space-x-4 bg-gray-800 bg-opacity-40 rounded-lg p-2 relative cursor-pointer"
        onClick={() => playTrack(track)}
        onContextMenu={(e) => handleContextMenu(e, track)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <img src={track.album.cover_medium} alt={track.title} className="w-12 h-12 rounded-md" />
          {isHovered && (
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
            className="ml-auto"
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
    } catch (error) {
      console.error('Error downloading track:', error);
    }
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
              <div className="grid gap-4">
                {searchResults.map((track) => (
                  <TrackItem key={track.id} track={track} />
                ))}
              </div>
            </section>
          ) : (
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
                <h2 className="text-2xl font-bold mb-4">Jump Back In</h2>
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
            onClick={() => setShowCreatePlaylist(true)}
          >
            <Library className="w-6 h-6" />
            <span className="text-xs mt-1">Your Library</span>
          </button>
        </footer>
        {/* Mobile Miniplayer */}
        {currentTrack && (
          <MobilePlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            skipTrack={skipTrack}
            previousTrack={previousTrack}
            seekPosition={seekPosition}
            duration={duration}
            handleSeek={handleSeek}
            isLiked={isLiked}
            toggleLike={toggleLike}
            lyrics={lyrics}
            currentLyricIndex={currentLyricIndex}
            queue={queue}
            shuffleOn={shuffleOn}
            shuffleQueue={shuffleQueue}
            showLyrics={showLyrics}
            toggleLyricsView={toggleLyricsView}
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
        <main className="flex-1 bg-gradient-to-b from-gray-900 to-black rounded-lg p-4 overflow-y-auto custom-scrollbar">
          <header className="flex justify-between items-center mb-6">
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => e.preventDefault()}
              className="w-full max-w-md"
            >
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full p-2 rounded-full bg-gray-800 text-white"
              />
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
          <div className="bg-gray-800 rounded-lg p-6 w-96">
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
          <div className="bg-gray-800 rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto">
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
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-2xl font-bold mb-4">Add to Playlist</h2>
            {playlists.length === 0 ? (
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

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Home, Search, Library, Bell, Clock, Cog, Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, ChevronUp, ChevronDown, MoreHorizontal, Shuffle, Plus, X, User, Download, Heart, List, Music } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import debounce from 'lodash/debounce'

const API_BASE_URL = 'https://reproduction-cardiff-increases-acquire.trycloudflare.com'

export function SpotifyClone() {
  const [view, setView] = useState('home')
  const [playlists, setPlaylists] = useState([])
  const [jumpBackIn, setJumpBackIn] = useState([])
  const [shows, setShows] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [queue, setQueue] = useState([])
  const [previousTracks, setPreviousTracks] = useState([])
  const [miniplayerExpanded, setMiniplayerExpanded] = useState(false)
  const [shuffleOn, setShuffleOn] = useState(false)
  const [volume, setVolume] = useState(1)
  const [seekPosition, setSeekPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showQueue, setShowQueue] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [contextMenuTrack, setContextMenuTrack] = useState(null)
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistImage, setNewPlaylistImage] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false)
  const [selectedPlaylistForAdd, setSelectedPlaylistForAdd] = useState(null)
  const [showSearchInPlaylistCreation, setShowSearchInPlaylistCreation] = useState(false)
  const [selectedTracksForNewPlaylist, setSelectedTracksForNewPlaylist] = useState([])
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [contextMenuOptions, setContextMenuOptions] = useState([])
  const [isLiked, setIsLiked] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState([])
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0)
  const [showMobileQueue, setShowMobileQueue] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState(0)

  const audioRef = useRef(new Audio())
  const preloadedAudios = useRef([new Audio(), new Audio(), new Audio()])
  const lyricsRef = useRef(null)
  const expandedPlayerRef = useRef(null)

  useEffect(() => {
    const savedVolume = localStorage.getItem('volume')
    if (savedVolume) setVolume(parseFloat(savedVolume))

    const savedShuffleOn = localStorage.getItem('shuffleOn')
    if (savedShuffleOn) setShuffleOn(JSON.parse(savedShuffleOn))

    const savedPlaylists = JSON.parse(localStorage.getItem('playlists') || '[]')
    if (!savedPlaylists.some(playlist => playlist.name === 'Liked Songs')) {
      savedPlaylists.push({ name: 'Liked Songs', image: '/images/liked-songs.webp', tracks: [] })
    }
    setPlaylists(savedPlaylists)
    setJumpBackIn(JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'))

    const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]')
    setQueue(savedQueue)
    const savedCurrentTrack = JSON.parse(localStorage.getItem('currentTrack'))
    if (savedCurrentTrack) {
      setCurrentTrack(savedCurrentTrack)
      setSeekPosition(parseFloat(localStorage.getItem('seekPosition') || '0'))
      setIsLiked(isTrackLiked(savedCurrentTrack))
    }

    setShows([
      { name: 'Spotify Original', image: '/placeholder.svg?height=150&width=150' },
      { name: 'After School Radio', image: '/placeholder.svg?height=150&width=150' },
    ])

    preloadQueueTracks(savedQueue)

    audioRef.current.addEventListener('ended', handleTrackEnd)
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate)
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)

    fetchSearchResults('Kendrick Lamar')

    return () => {
      audioRef.current.removeEventListener('ended', handleTrackEnd)
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('queue', JSON.stringify(queue))
    preloadQueueTracks(queue)
  }, [queue])

  useEffect(() => {
    if (currentTrack) {
      playTrackFromSource(currentTrack)
      setIsPlaying(true)
      updateRecentlyPlayed(currentTrack)
      localStorage.setItem('currentTrack', JSON.stringify(currentTrack))
      setIsLiked(isTrackLiked(currentTrack))
      fetchLyrics(currentTrack)
    }
  }, [currentTrack])

  useEffect(() => {
    localStorage.setItem('volume', volume.toString())
    audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    localStorage.setItem('shuffleOn', JSON.stringify(shuffleOn))
  }, [shuffleOn])
  
  useEffect(() => {
    if (lyricsRef.current && currentLyricIndex !== -1) {
      const lyricsContainer = lyricsRef.current
      const currentLyricElement = lyricsContainer.children[currentLyricIndex]
      if (currentLyricElement) {
        const containerHeight = lyricsContainer.clientHeight
        const lyricPosition = currentLyricElement.offsetTop
        const lyricHeight = currentLyricElement.clientHeight
        const scrollPosition = lyricPosition - containerHeight / 2 + lyricHeight / 2

        lyricsContainer.scrollTo({
          top: scrollPosition - 50,
          behavior: 'smooth'
        })
      }
    }
  }, [currentLyricIndex])

  const debouncedSearch = useCallback(
    debounce((query) => {
      fetchSearchResults(query)
    }, 300),
    []
  )

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery)
    }
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    if ('mediaSession' in navigator) {
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
  }, [currentTrack, isPlaying]);

  const fetchSearchResults = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/tracks?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.results)
    } catch (error) {
      console.error('Error fetching search results:', error)
    }
  }

  const playTrackFromSource = async (track) => {
    const offlineTrack = await getOfflineTrack(track.id)
    if (offlineTrack) {
      audioRef.current.src = offlineTrack
    } else {
      audioRef.current.src = `${API_BASE_URL}/api/track/${track.id}.mp3`
    }
    audioRef.current.play()
  }

  const getOfflineTrack = async (trackId) => {
    const offlineTracks = JSON.parse(localStorage.getItem('offlineTracks') || '{}')
    return offlineTracks[trackId] || null
  }

  const playTrack = (track) => {
    if (currentTrack) {
      setPreviousTracks(prev => [currentTrack, ...prev.slice(0, 49)])
    }
    setCurrentTrack(track)
    setQueue([track, ...queue])
  }

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const addToQueue = (track) => {
    setQueue([...queue, track])
  }

  const skipTrack = async () => {
    if (currentTrack) {
      setPreviousTracks(prev => [currentTrack, ...prev.slice(0, 49)])
    }
    if (queue.length > 1) {
      const [, ...newQueue] = queue
      setCurrentTrack(newQueue[0])
      setQueue(newQueue)
    } else {
      const savedQueue = JSON.parse(localStorage.getItem('queue') || '[]')
      if (savedQueue.length > 1) {
        const [, ...newQueue] = savedQueue
        setCurrentTrack(newQueue[0])
        setQueue(newQueue)
        localStorage.setItem('queue', JSON.stringify(newQueue))
      } else {
        const mostPlayedArtists = getMostPlayedArtists()
        const randomSongs = await fetchRandomSongs(mostPlayedArtists)
        setQueue(randomSongs)
        setCurrentTrack(randomSongs[0])
        localStorage.setItem('queue', JSON.stringify(randomSongs))
      }
    }
  }

  const previousTrack = () => {
    if (previousTracks.length > 0) {
      const [prevTrack, ...restPreviousTracks] = previousTracks
      setCurrentTrack(prevTrack)
      setQueue([prevTrack, currentTrack, ...queue.slice(1)])
      setPreviousTracks(restPreviousTracks)
    }
  }

  const getMostPlayedArtists = () => {
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]')
    const artistCounts = recentlyPlayed.reduce((acc, track) => {
      acc[track.artist.name] = (acc[track.artist.name] || 0) + 1
      return acc
    }, {})

    return Object.keys(artistCounts).sort((a, b) => artistCounts[b] - artistCounts[a])
  }

  const fetchRandomSongs = async (artists) => {
    const randomSongs = []
    for (const artist of artists) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/search/tracks?query=${encodeURIComponent(artist)}`)
        const data = await response.json()
        randomSongs.push(...data.results.slice(0, 5))
      } catch (error) {
        console.error('Error fetching random songs:', error)
      }
    }
    return randomSongs
  }

  const preloadQueueTracks = (queueTracks) => {
    queueTracks.slice(0, 3).forEach((track, index) => {
      if (track) {
        preloadedAudios.current[index].src = `${API_BASE_URL}/api/track/${track.id}.mp3`
        preloadedAudios.current[index].load()
      }
    })
  }

  const updateRecentlyPlayed = (track) => {
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]')
    const updatedRecentlyPlayed = [track, ...recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 4)
    localStorage.setItem('recentlyPlayed', JSON.stringify(updatedRecentlyPlayed))
    setJumpBackIn(updatedRecentlyPlayed)
  }

  const shuffleQueue = () => {
    const shuffledQueue = [...queue]
    for (let i = shuffledQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQueue[i], shuffledQueue[j]] = [shuffledQueue[j], shuffledQueue[i]]
    }
    setQueue(shuffledQueue)
    setShuffleOn(!shuffleOn)
  }

  const addToPlaylist = (track, playlistName) => {
    const updatedPlaylists = playlists.map(playlist => 
      playlist.name === playlistName 
        ? { ...playlist, tracks: [...playlist.tracks, track] }
        : playlist
    )
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
  }

  const handleTrackEnd = () => {
    skipTrack()
  }

  const handleTimeUpdate = () => {
    setSeekPosition(audioRef.current.currentTime)
    localStorage.setItem('seekPosition', audioRef.current.currentTime.toString())
    updateCurrentLyric()
  }

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration)
  }

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setSeekPosition(newTime)
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    audioRef.current.volume = newVolume
    setVolume(newVolume)
  }

  const closeContextMenu = () => {
    setShowContextMenu(false)
  }

  const createPlaylist = () => {
    if (newPlaylistName) {
      const newPlaylist = {
        name: newPlaylistName,
        image: newPlaylistImage || '/placeholder.svg?height=80&width=80',
        tracks: selectedTracksForNewPlaylist
      }
      setPlaylists([...playlists, newPlaylist])
      setNewPlaylistName('')
      setNewPlaylistImage(null)
      setSelectedTracksForNewPlaylist([])
      setShowCreatePlaylist(false)
      setShowSearchInPlaylistCreation(false)
      localStorage.setItem('playlists', JSON.stringify([...playlists, newPlaylist]))
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewPlaylistImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const openAddToPlaylistModal = (track) => {
    setContextMenuTrack(track)
    setShowAddToPlaylistModal(true)
  }

  const handleAddToPlaylist = () => {
    if (selectedPlaylistForAdd && contextMenuTrack) {
      addToPlaylist(contextMenuTrack, selectedPlaylistForAdd)
      setShowAddToPlaylistModal(false)
      setSelectedPlaylistForAdd(null)
    }
  }

  const toggleTrackSelection = (track) => {
    setSelectedTracksForNewPlaylist(prev => 
      prev.some(t => t.id === track.id)
        ? prev.filter(t => t.id !== track.id)
        : [...prev, track]
    )
  }

  const openPlaylist = (playlist) => {
    setCurrentPlaylist(playlist)
    setView('playlist')
  }

  const pinPlaylist = (playlist) => {
    console.log("Pin playlist functionality not implemented yet")
  }

  const handleContextMenu = (e, item) => {
    e.preventDefault()
    const options = [
      { label: 'Add to Queue', action: () => addToQueue(item) },
      { label: 'Add to Playlist', action: () => openAddToPlaylistModal(item) },
      { label: 'Add to Liked Songs', action: () => toggleLike(item) },
      { label: 'Download', action: () => downloadTrack(item) },
    ]
  
    if (item.type === 'playlist') {
      options.push({ label: 'Pin Playlist', action: () => pinPlaylist(item) })
    }
  
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuOptions(options)
    setShowContextMenu(true)
    setContextMenuTrack(item)
  }

  const CustomContextMenu = ({ x, y, onClose, options }) => {
    return (
      <div
        className="fixed bg-gray-800 rounded-lg shadow-lg p-2 z-50"
        style={{ top: y, left: x }}
      >
        {options.map((option, index) => (
          <button
            key={index}
            className="block w-full text-left px-4 py-2 hover:bg-gray-700"
            onClick={() => {
              option.action()
              onClose()
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  const TrackItem = ({ track, showArtist = true, inPlaylistCreation = false }) => (
    <div
      className="group flex items-center space-x-4 bg-gray-800 bg-opacity-40 rounded-lg p-2 relative"
      onContextMenu={(e) => handleContextMenu(e, track)}
    >
      <div className="relative">
        <img src={track.album.cover_medium} alt={track.title} className="w-12 h-12 rounded-md" />
        <button
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => playTrack(track)}
        >
          <Play className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="flex-grow">
        <p className="font-medium">{track.title}</p>
        {showArtist && <p className="text-sm text-gray-400">{track.artist.name}</p>}
      </div>
      {inPlaylistCreation ? (
        <input
          type="checkbox"
          checked={selectedTracksForNewPlaylist.some(t => t.id === track.id)}
          onChange={() => toggleTrackSelection(track)}
          className="ml-auto"
        />
      ) : (
        <div className="flex space-x-2 md:hidden">
          <button
            className="bg-gray-700 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation()
              addToQueue(track)
            }}
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
          <button
            className="bg-gray-700 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation()
              openAddToPlaylistModal(track)
            }}
          >
            <Library className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  )

  const playPlaylist = (playlist) => {
    setQueue(playlist.tracks)
    setCurrentTrack(playlist.tracks[0])
    setIsPlaying(true)
  }

  const downloadPlaylist = async (playlist) => {
    setIsDownloading(true)
    setDownloadProgress(0)
    const totalTracks = playlist.tracks.length
    let downloadedTracks = 0

    for (const track of playlist.tracks) {
      await downloadTrack(track)
      downloadedTracks++
      setDownloadProgress((downloadedTracks / totalTracks) * 100)
    }

    setIsDownloading(false)
  }

  const downloadTrack = async (track) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/track/${track.id}.mp3`)
      const blob = await response.blob()
      const objectURL = URL.createObjectURL(blob)
      
      const offlineTracks = JSON.parse(localStorage.getItem('offlineTracks') || '{}')
      offlineTracks[track.id] = objectURL
      localStorage.setItem('offlineTracks', JSON.stringify(offlineTracks))
    } catch (error) {
      console.error('Error downloading track:', error)
    }
  }

  const toggleLike = (track = currentTrack) => {
    if (!track) return

    const likedSongsPlaylist = playlists.find(p => p.name === 'Liked Songs')
    if (!likedSongsPlaylist) return

    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.name === 'Liked Songs') {
        const isAlreadyLiked = playlist.tracks.some(t => t.id === track.id)
        if (isAlreadyLiked) {
          return { ...playlist, tracks: playlist.tracks.filter(t => t.id !== track.id) }
        } else {
          return { ...playlist, tracks: [...playlist.tracks, track] }
        }
      }
      return playlist
    })

    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    setIsLiked(!isLiked)
  }

  const isTrackLiked = (track) => {
    const likedSongsPlaylist = playlists.find(p => p.name === 'Liked Songs')
    return likedSongsPlaylist ? likedSongsPlaylist.tracks.some(t => t.id === track.id) : false
  }

  const smartShuffle = (playlist) => {
    const artistCounts = {}
    playlist.tracks.forEach(track => {
      artistCounts[track.artist.name] = (artistCounts[track.artist.name] || 0) + 1
    })

    const mostCommonArtist = Object.keys(artistCounts).reduce((a, b) => artistCounts[a] > artistCounts[b] ? a : b)

    const additionalTracks = searchResults
      .filter(track => track.artist.name === mostCommonArtist && !playlist.tracks.some(t => t.id === track.id))
      .slice(0, 5)

    const newPlaylistTracks = [...playlist.tracks, ...additionalTracks]
    const shuffledTracks = newPlaylistTracks.sort(() => Math.random() - 0.5)

    const updatedPlaylist = { ...playlist, tracks: shuffledTracks }
    const updatedPlaylists = playlists.map(p => p.name === playlist.name ? updatedPlaylist : p)

    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    setCurrentPlaylist(updatedPlaylist)
  }

  const parseLyrics = (lyricsString) => {
    const parsedLyrics = lyricsString.split('\n').map(line => {
      const [time, text] = line.split(']')
      const [minutes, seconds] = time.replace('[', '').split(':')
      const timeInSeconds = parseFloat(minutes) * 60 + parseFloat(seconds)
      return {
        time: parseFloat(timeInSeconds.toFixed(1)),
        text: text.trim(),
      }
    })
    return parsedLyrics
  }

  const fetchLyrics = async (track) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lyrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist.name,
        }),
      })
      const data = await response.json()
      if (data.success && data.synced) {
        const parsedLyrics = parseLyrics(data.lyrics)
        setLyrics(parsedLyrics)
      } else {
        setLyrics([])
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error)
      setLyrics([])
    }
  }

  const updateCurrentLyric = () => {
    if (lyrics.length === 0) {
      return
    }

    const currentTime = parseFloat(audioRef.current.currentTime.toFixed(1))
    const index = lyrics.findIndex(lyric => lyric.time > currentTime)
    setCurrentLyricIndex(index > 0 ? index - 1 : lyrics.length - 1)
  }

  const toggleLyricsView = () => {
    setShowLyrics(!showLyrics)
  }

  const toggleMobileQueue = (e) => {
    e.stopPropagation()
    setShowMobileQueue(!showMobileQueue)
  }

  const handleLibraryClick = () => {
    setShowLibrary(true)
    setMiniplayerExpanded(false)
  }

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isDownSwipe = distance > 50
    const isUpSwipe = distance < -50

    if (isDownSwipe && !showLyrics) {
      setShowLyrics(true)
    } else if (isUpSwipe && showLyrics) {
      setShowLyrics(false)
    } else if (isUpSwipe && !showLyrics) {
      setMiniplayerExpanded(false)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const handleImageSwipe = (direction) => {
    setSwipeDirection(direction)
    if (direction > 0) {
      skipTrack()
    } else if (direction < 0) {
      previousTrack()
    }
  }

  const swipeConfidenceThreshold = 10000
  const swipePower = (offset, velocity) => {
    return Math.abs(offset) * velocity
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
        <form onSubmit={(e) => e.preventDefault()} className="px-4 mb-4">
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 rounded-full bg-gray-800 text-white"
          />
        </form>
        <nav className="px-4 mb-4">
          <ul className="flex space-x-2 overflow-x-auto custom-scrollbar">
            <li><button className="bg-gray-800 rounded-full px-4 py-2 text-sm font-medium">Music</button></li>
            <li><button className="bg-gray-800 rounded-full px-4 py-2 text-sm font-medium">Podcasts & Shows</button></li>
            <li><button className="bg-gray-800 rounded-full px-4 py-2 text-sm font-medium">Audiobooks</button></li>
          </ul>
        </nav>
        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-20">
          {showLibrary ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Your Library</h2>
              {playlists.map((playlist, index) => (
                <div
                  key={index}
                  className="bg-gray-800 bg-opacity-40 rounded-lg p-4 flex items-center cursor-pointer"
                  onClick={() => openPlaylist(playlist)}
                >
                  <img src={playlist.image} alt={playlist.name} className="w-12 h-12 rounded mr-3" />
                  <span className="font-medium text-sm">{playlist.name}</span>
                </div>
              ))}
              <button
                className="w-full bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-semibold"
                onClick={() => setShowCreatePlaylist(true)}
              >
                Create Playlist
              </button>
            </div>
          ) : view === 'search' ? (
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
              <section className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Jump Back In</h2>
                <div className="flex space-x-4 overflow-x-auto custom-scrollbar">
                  {jumpBackIn.map((track, index) => (
                    <div key={index} className="flex-shrink-0 w-40">
                      <div className="relative">
                        <img src={track.album.cover_medium} alt={track.title} className="w-40 h-40 object-cover rounded-lg mb-2" />
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
        <footer className="bg-black p-4 flex justify-around fixed bottom-0 left-0 right-0" style={{ zIndex: 9998 }}>
          <button className="flex flex-col items-center text-gray-400 hover:text-white" onClick={() => { setView('home'); setSearchQuery(''); setShowLibrary(false); }}>
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="flex flex-col items-center text-gray-400 hover:text-white" onClick={() => { setView('search'); setShowLibrary(false); }}>
            <Search className="w-6 h-6" />
            <span className="text-xs mt-1">Search</span>
          </button>
          <button className="flex flex-col items-center text-gray-400 hover:text-white" onClick={handleLibraryClick}>
            <Library className="w-6 h-6" />
            <span className="text-xs mt-1">Your Library</span>
          </button>
        </footer>
        <AnimatePresence>
          {currentTrack && (
            <motion.div
              ref={expandedPlayerRef}
              className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black"
              initial={{ y: '100%' }}
              animate={{ y: miniplayerExpanded ? 0 : 'calc(100% - 5rem)' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => setMiniplayerExpanded(!miniplayerExpanded)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="h-20 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img src={currentTrack.album.cover_medium} alt={currentTrack.title} className="w-12 h-12 rounded-md" />
                  <div>
                    <p className="font-semibold text-white">{currentTrack.title}</p>
                    <p className="text-sm text-gray-400">{currentTrack.artist.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(); }}>
                    <Heart className={`w-6 h-6 ${isLiked ? 'text-green-500 fill-current' : 'text-white'}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                    {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white" />}
                  </button>
                </div>
              </div>
              {miniplayerExpanded && (
                <div className="px-4 pt-4 h-[calc(100%-5rem)] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={(e) => { e.stopPropagation(); setMiniplayerExpanded(false); }}>
                      <ChevronDown className="w-6 h-6 text-white" />
                    </button>
                    <button onClick={toggleMobileQueue}>
                      <List className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <motion.div
                    className="w-64 h-64 mx-auto relative"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = swipePower(offset.x, velocity.x)
                      if (swipe < -swipeConfidenceThreshold) {
                        handleImageSwipe(1)
                      } else if (swipe > swipeConfidenceThreshold) {
                        handleImageSwipe(-1)
                      }
                    }}
                  >
                    <img src={currentTrack.album.cover_medium} alt={currentTrack.title} className="w-full h-full object-cover rounded-md" />
                  </motion.div>
                  <p className="text-2xl font-semibold text-white text-center mt-4">{currentTrack.title}</p>
                  <p className="text-lg text-gray-400 text-center mb-4">{currentTrack.artist.name}</p>
                  <div className="flex justify-between items-center mb-4">
                    <SkipBack className="w-6 h-6 text-white" onClick={(e) => { e.stopPropagation(); previousTrack(); }} />
                    <button className="bg-white rounded-full p-3" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                      {isPlaying ? <Pause className="w-8 h-8 text-black" /> : <Play className="w-8 h-8 text-black" />}
                    </button>
                    <SkipForward className="w-6 h-6 text-white" onClick={(e) => { e.stopPropagation(); skipTrack(); }} />
                  </div>
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={seekPosition}
                      onChange={handleSeek}
                      className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-white">{formatTime(seekPosition)}</span>
                      <span className="text-white">{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <Shuffle
                      className={`w-5 h-5 cursor-pointer ${shuffleOn ? 'text-green-500' : 'text-gray-400'}`}
                      onClick={(e) => { e.stopPropagation(); shuffleQueue(); }}
                    />
                    <button onClick={(e) => { e.stopPropagation(); setShowLyrics(!showLyrics); }}>
                      <Music className={`w-5 h-5 ${showLyrics ? 'text-green-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {showMobileQueue && (
                      <motion.div
                        className="fixed inset-0 bg-black bg-opacity-90 z-50"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Queue</h3>
                            <button onClick={toggleMobileQueue}>
                              <X className="w-6 h-6 text-white" />
                            </button>
                          </div>
                          <div className="space-y-2 overflow-y-auto h-[calc(100vh-8rem)]">
                            {queue.map((track, index) => (
                              <TrackItem key={index} track={track} showArtist={false} />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {showLyrics ? (
                    <div className="flex-1 overflow-y-auto" ref={lyricsRef}>
                      {lyrics.map((lyric, index) => (
                        <p
                          key={index}
                          className={`text-lg mb-4 ${index === currentLyricIndex ? 'text-green-500 font-bold' : 'text-gray-400'}`}
                        >
                          {lyric.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-400">Swipe down to view lyrics</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
        <aside className="w-64 bg-gray-900 rounded-lg p-4 overflow-y-auto custom-scrollbar">
          <nav className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <a href="#" className="flex items-center text-gray-300 hover:text-white" onClick={() => setView('home')}>
                <Home className="w-6 h-6 mr-3" />
                Home
              </a>
              <a href="#" className="flex items-center text-gray-300 hover:text-white" onClick={() => setView('search')}>
                <Search className="w-6 h-6 mr-3" />
                Search
              </a>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-gray-300">
                  <Library className="w-6 h-6 mr-3" />
                  Your Library
                </div>
                <Plus className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" onClick={() => setShowCreatePlaylist(true)} />
              </div>
              <div className="space-y-2">
                {playlists.map((playlist, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 bg-gray-700 bg-opacity-30 rounded-md p-2 cursor-pointer"
                    onClick={() => openPlaylist(playlist)}
                  >
                    <img src={playlist.image} alt={playlist.name} className="w-10 h-10 rounded-md" />
                    <div>
                      <p className="text-sm">{playlist.name}</p>
                      <p className="text-xs text-gray-400">Playlist</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </aside>
        <main className="flex-1 bg-gradient-to-b from-gray-900 to-black rounded-lg p-4 overflow-y-auto custom-scrollbar">
          <header className="flex justify-between items-center mb-6">
            <form onSubmit={(e) => e.preventDefault()} className="w-full max-w-md">
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 rounded-full bg-gray-800 text-white"
              />
            </form>
            <div className="relative">
              <button className="bg-white text-black rounded-full px-4 py-2 text-sm font-semibold ml-4">
                Install App
              </button>
            </div>
            <div className="relative">
              <button
                className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User className="w-5 h-5" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-10">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Settings</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Profile</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Log out</a>
                </div>
              )}
            </div>
          </header>
          {showLyrics ? (
            <div className="h-full flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold mb-4">{currentTrack?.title}</h2>
              <p className="text-xl mb-8">{currentTrack?.artist.name}</p>
              <div className="text-center max-h-[60vh]" ref={lyricsRef}>
                {lyrics.map((lyric, index) => (
                  <p
                    key={index}
                    className={`text-xl mb-4 ${index === currentLyricIndex ? 'text-green-500 font-bold' : 'text-gray-400'}`}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            </div>
          ) : view === 'playlist' && currentPlaylist ? (
            <section>
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
                      onClick={() => shuffleQueue()}
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
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-6">Good morning</h1>
              <section className="mb-8 overflow-y-auto custom-scrollbar">
                {playlists.length > 0 && (
                  <>
                    <h2 className="text-2xl font-bold mb-4">Recently played</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {playlists.slice(0, 6).map((playlist, index) => (
                        <div
                          key={index}
                          className="bg-gray-800 bg-opacity-40 rounded-lg p-4 flex items-center cursor-pointer"
                          onClick={() => openPlaylist(playlist)}
                        >
                          <img src={playlist.image} alt={playlist.name} className="w-16 h-16 rounded mr-4" />
                          <span className="font-medium">{playlist.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="mb-4"></div>
                <h2 className="text-2xl font-bold mb-4">Jump Back In</h2>
                <div className="grid grid-cols-4 gap-4">
                  {jumpBackIn.map((track, index) => (
                    <div key={index}>
                      <div className="relative">
                        <img src={track.album.cover_medium} alt={track.title} className="w-30 aspect-square object-cover rounded-lg mb-2" />
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
                <div className="mb-4"></div>
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
        {showQueue && (
          <aside className="w-64 bg-gray-900 rounded-lg p-4 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold mb-4">Queue</h2>
            <div className="space-y-2">
              {queue.map((track, index) => (
                <TrackItem key={index} track={track} showArtist={false} />
              ))}
            </div>
          </aside>
        )}
      </div>
      {currentTrack && (
        <footer className="bg-gray-900 p-4 hidden md:block rounded-lg mx-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={currentTrack.album.cover_medium} alt={currentTrack.title} className="w-14 h-14 rounded-md" />
              <div>
                <p className="font-semibold">{currentTrack.title}</p>
                <p className="text-sm text-gray-400">{currentTrack.artist.name}</p>
              </div>
              <button onClick={toggleLike}>
                <Heart className={`w-6 h-6 ${isLiked ? 'text-green-500 fill-current' : 'text-white'}`} />
              </button>
            </div>
            <div className="flex flex-col items-center space-y-2 flex-grow mx-4">
              <div className="flex items-center space-x-4">
                <Shuffle
                  className={`w-5 h-5 cursor-pointer ${shuffleOn ? 'text-green-500' : 'text-gray-400'}`}
                  onClick={shuffleQueue}
                />
                <SkipBack className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" onClick={previousTrack} />
                <button className="bg-white rounded-full p-2" onClick={togglePlay}>
                  {isPlaying ? <Pause className="w-6 h-6 text-black" /> : <Play className="w-6 h-6 text-black" />}
                </button>
                <SkipForward className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" id="skipForwardButtonDesktop" onClick={skipTrack} />
                <button onClick={toggleLyricsView}>
                  <Music className={`w-5 h-5 ${showLyrics ? 'text-green-500' : 'text-gray-400'}`} />
                </button>
              </div>
              <div className="w-full flex items-center space-x-2">
                <span className="text-xs">{formatTime(seekPosition)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={seekPosition}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                />
                <span className="text-xs">{formatTime(duration)}</span>
              </div>
            </div>
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
                {showQueue ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </div>
        </footer>
      )}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-2xl font-bold mb-4">Create Playlist</h2>
            <input
              type="text"
              placeholder="Playlist Name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
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
                    <img src={newPlaylistImage} alt="Playlist Cover" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                    </div>
                  )}
                  <input id="playlist-image" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
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
              <button className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500" onClick={() => setShowCreatePlaylist(false)}>Cancel</button>
              <button className="px-4 py-2 bg-green-500 rounded hover:bg-green-600" onClick={createPlaylist}>Create</button>
            </div>
          </div>
        </div>
      )}
      {showSearchInPlaylistCreation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add Songs to Playlist</h2>
            <input
              type="text"
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <button className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500" onClick={() => setShowSearchInPlaylistCreation(false)}>Cancel</button>
                <button className="px-4 py-2 bg-green-500 rounded hover:bg-green-600" onClick={() => setShowSearchInPlaylistCreation(false)}>Add Selected</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddToPlaylistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-2xl font-bold mb-4">Add to Playlist</h2>
            {playlists.length === 0 ? (
              <div>
                <p className="mb-4">You don't have any playlists yet. Would you like to create one?</p>
                <button
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={() => {
                    setShowAddToPlaylistModal(false)
                    setShowCreatePlaylist(true)
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
  )
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Hls from "hls.js"

type VideoPlayerState = {
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  isFullScreen: boolean
}

export function useVideoPlayer(
  videoContainerRef: React.RefObject<HTMLDivElement | null>,
  src: string | null,
  rotation: number,
  onRotationChange: (rotation: number) => void
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const lastSrcRef = useRef<string | null>(null)
  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    volume: 0,
    currentTime: 0,
    duration: 0,
    isFullScreen: false,
  })

  const togglePlay = useCallback(() => {
    setPlayerState((prevState) => ({
      ...prevState,
      isPlaying: !prevState.isPlaying,
    }))
  }, [])

  const handleVolumeChange = useCallback((volume: number) => {
    setPlayerState((prevState) => ({ ...prevState, volume }))
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setPlayerState((prevState) => ({
      ...prevState,
      currentTime: video.currentTime,
    }))
  }, [])

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setPlayerState((prevState) => ({
      ...prevState,
      duration: video.duration,
    }))
  }, [])

  const handlePlaybackEnded = useCallback(() => {
    setPlayerState((prevState) => ({ ...prevState, isPlaying: false }))
  }, [])

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    const nextTime = Math.max(0, time)
    video.currentTime = nextTime
    setPlayerState((prevState) => ({ ...prevState, currentTime: nextTime }))
  }, [])

  const toggleRotation = useCallback(() => {
    onRotationChange((rotation + 90) % 360)
  }, [onRotationChange, rotation])

  const toggleFullScreen = useCallback(() => {
    const container = videoContainerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      void container.requestFullscreen().catch((error: Error) => {
        window.alert(
          `フルスクリーン表示に失敗しました: ${error.message} (${error.name})`
        )
      })
      return
    }

    void document.exitFullscreen()
  }, [videoContainerRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    hlsRef.current?.destroy()
    hlsRef.current = null

    if (!src) {
      video.pause()
      video.removeAttribute("src")
      video.load()
      queueMicrotask(() => {
        setPlayerState((prevState) => ({
          ...prevState,
          currentTime: 0,
          duration: 0,
          isPlaying: false,
        }))
      })
      lastSrcRef.current = src
      return
    }

    const shouldAutoPlay = lastSrcRef.current !== src
    lastSrcRef.current = src

    if (src.toLowerCase().includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      hlsRef.current = hls
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (shouldAutoPlay) {
          void video.play().catch((error: unknown) => {
            console.error("Video play failed:", error)
            setPlayerState((prevState) => ({ ...prevState, isPlaying: false }))
          })
        }
      })
    } else {
      video.src = src
    }

    if (shouldAutoPlay) {
      queueMicrotask(() => {
        setPlayerState((prevState) => ({
          ...prevState,
          isPlaying: true,
          currentTime: 0,
        }))
      })
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (playerState.isPlaying) {
      void video.play().catch((error: unknown) => {
        console.error("Video play failed:", error)
        setPlayerState((prevState) => ({ ...prevState, isPlaying: false }))
      })
      return
    }

    video.pause()
  }, [playerState.isPlaying, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = playerState.volume
    video.muted = playerState.volume === 0
  }, [playerState.volume])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setPlayerState((prevState) => ({
        ...prevState,
        isFullScreen: Boolean(document.fullscreenElement),
      }))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return

      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        return
      }

      const key = event.key.toLowerCase()
      const isButton = target.closest("button")
      const isSlider = target.closest('[role="slider"]')

      if (isButton && (key === " " || key === "enter")) return

      if (
        isSlider &&
        [
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          "home",
          "end",
          "pageup",
          "pagedown",
        ].includes(key)
      ) {
        return
      }

      switch (key) {
        case "k":
        case " ":
          event.preventDefault()
          togglePlay()
          break
        case "m":
          event.preventDefault()
          setPlayerState((prevState) => ({
            ...prevState,
            volume: prevState.volume > 0 ? 0 : 1,
          }))
          break
        case "arrowup":
          event.preventDefault()
          setPlayerState((prevState) => ({
            ...prevState,
            volume: Math.min(prevState.volume + 0.1, 1),
          }))
          break
        case "arrowdown":
          event.preventDefault()
          setPlayerState((prevState) => ({
            ...prevState,
            volume: Math.max(prevState.volume - 0.1, 0),
          }))
          break
        case "l":
        case "arrowright":
          event.preventDefault()
          handleSeek(playerState.currentTime + 5)
          break
        case "h":
        case "arrowleft":
          event.preventDefault()
          handleSeek(playerState.currentTime - 5)
          break
        case "f":
          event.preventDefault()
          toggleFullScreen()
          break
        case "r":
          if (!event.shiftKey) {
            event.preventDefault()
            toggleRotation()
          }
          break
      }
    },
    [
      handleSeek,
      playerState.currentTime,
      toggleFullScreen,
      togglePlay,
      toggleRotation,
    ]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    videoRef,
    playerState,
    togglePlay,
    handleVolumeChange,
    handleSeek,
    toggleRotation,
    toggleFullScreen,
    handleTimeUpdate,
    handleDurationChange,
    handlePlaybackEnded,
  }
}

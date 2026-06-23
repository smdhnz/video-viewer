"use client"

import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react"
import { useEffect, useRef, useState, type PointerEvent } from "react"

import { Slider } from "@/components/ui/slider"
import { useVideoPlayer } from "@/hooks/use-video-player"
import { cn } from "@/lib/utils"

type VideoPlayerProps = {
  src: string | null
  onEnded: () => void
  onNext: () => void
  onPrev: () => void
}

const formatTime = (time: number) => {
  if (Number.isNaN(time)) return "00:00"

  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function VideoPlayer({
  src,
  onEnded,
  onNext,
  onPrev,
}: VideoPlayerProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const {
    videoRef,
    playerState,
    togglePlay,
    handleVolumeChange,
    handleSeek,
    toggleRotation,
    toggleFullScreen,
    handleTimeUpdate,
    handleDurationChange,
  } = useVideoPlayer(videoContainerRef, src)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        return
      }

      switch (event.key.toLowerCase()) {
        case "n":
          event.preventDefault()
          onNext()
          break
        case "p":
          event.preventDefault()
          onPrev()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onNext, onPrev])

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest("button, [role='slider'], [data-slot='slider']")) {
      ;(document.activeElement as HTMLElement | null)?.blur()
    }
  }

  const controlsVisible = isHovering && !playerState.isFullScreen

  return (
    <section
      ref={videoContainerRef}
      className="group relative h-full w-full overflow-hidden bg-black"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_32%)]" />

      {src ? (
        <video
          ref={videoRef}
          src={src || undefined}
          className="absolute object-contain"
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onEnded={onEnded}
          onClick={togglePlay}
          muted={playerState.volume === 0}
          style={{
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) rotate(${playerState.rotation}deg)`,
            width: playerState.rotation % 180 !== 0 ? "100vh" : "100vw",
            height: playerState.rotation % 180 !== 0 ? "100vw" : "100vh",
          }}
        />
      ) : (
        <div className="relative z-10 flex h-full items-center justify-center p-8 text-center">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 shadow-2xl backdrop-blur">
            <p className="text-sm tracking-[0.24em] text-primary uppercase">
              Video Viewer
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Drop, Queue, Play
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
              右側のプレイリストに動画ファイルを追加、またはHLS/動画URLを貼り付けて再生します。
            </p>
          </div>
        </div>
      )}

      {src ? (
        <div
          className={cn(
            "absolute right-4 bottom-4 left-4 z-20 rounded-3xl border border-white/10 bg-zinc-950/75 p-4 text-white shadow-2xl backdrop-blur-xl transition-opacity duration-300",
            controlsVisible ? "opacity-100" : "opacity-0"
          )}
          onPointerUp={handlePointerUp}
        >
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 0}
            onValueChange={(value) => handleSeek(value[0] ?? 0)}
            className="cursor-pointer"
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full bg-white px-3 py-2 text-black transition hover:bg-primary"
                aria-label={playerState.isPlaying ? "一時停止" : "再生"}
              >
                {playerState.isPlaying ? (
                  <Pause size={20} />
                ) : (
                  <Play size={20} />
                )}
              </button>

              <button
                type="button"
                onClick={onPrev}
                className="rounded-full p-2 transition hover:bg-white/10"
                aria-label="前の動画"
              >
                <SkipBack size={20} />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-full p-2 transition hover:bg-white/10"
                aria-label="次の動画"
              >
                <SkipForward size={20} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleVolumeChange(playerState.volume > 0 ? 0 : 1)
                  }
                  className="rounded-full p-2 transition hover:bg-white/10"
                  aria-label="ミュート切り替え"
                >
                  {playerState.volume > 0 ? (
                    <Volume2 size={20} />
                  ) : (
                    <VolumeX size={20} />
                  )}
                </button>
                <Slider
                  value={[playerState.volume]}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => handleVolumeChange(value[0] ?? 0)}
                  className="w-24 cursor-pointer"
                />
              </div>

              <span className="truncate font-mono text-xs text-zinc-300">
                {formatTime(playerState.currentTime)} /{" "}
                {formatTime(playerState.duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRotation}
                className="rounded-full p-2 transition hover:bg-white/10"
                aria-label="90度回転"
              >
                <RotateCcw size={20} />
              </button>
              <button
                type="button"
                onClick={toggleFullScreen}
                className="rounded-full p-2 transition hover:bg-white/10"
                aria-label="フルスクリーン切り替え"
              >
                {playerState.isFullScreen ? (
                  <Minimize size={20} />
                ) : (
                  <Maximize size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

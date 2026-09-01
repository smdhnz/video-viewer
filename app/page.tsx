"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Playlist } from "@/components/playlist"
import { VideoPlayer, type RepeatMode } from "@/components/video-player"
import type { PlaylistItem } from "@/types/playlist"

export default function Page() {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [currentItem, setCurrentItem] = useState<PlaylistItem | null>(null)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none")
  const [rotations, setRotations] = useState<Record<string, number>>({})
  const playlistItemsRef = useRef(playlistItems)
  const prevPlaylistLengthRef = useRef(playlistItems.length)

  useEffect(() => {
    playlistItemsRef.current = playlistItems
  }, [playlistItems])

  useEffect(() => {
    return () => {
      playlistItemsRef.current.forEach((item) => {
        if (item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url)
        }
      })
    }
  }, [])

  const handleItemClick = useCallback((item: PlaylistItem) => {
    setCurrentItem(item)
  }, [])

  const handleRemoveItem = useCallback(
    (id: string) => {
      const itemToRemove = playlistItems.find((item) => item.id === id)
      if (!itemToRemove) return

      const nextPlaylist = playlistItems.filter((item) => item.id !== id)

      if (currentItem?.id === id) {
        if (nextPlaylist.length === 0) {
          setCurrentItem(null)
        } else {
          const currentIndex = playlistItems.findIndex((item) => item.id === id)
          const nextIndex = Math.min(currentIndex, nextPlaylist.length - 1)
          setCurrentItem(nextPlaylist[nextIndex] ?? null)
        }
      }

      if (itemToRemove.url.startsWith("blob:")) {
        URL.revokeObjectURL(itemToRemove.url)
      }

      setPlaylistItems(nextPlaylist)
    },
    [currentItem?.id, playlistItems]
  )

  const playNext = useCallback(() => {
    if (playlistItems.length < 2) return

    const currentIndex = playlistItems.findIndex(
      (item) => item.id === currentItem?.id
    )
    const nextIndex = (currentIndex + 1) % playlistItems.length
    setCurrentItem(playlistItems[nextIndex] ?? null)
  }, [currentItem?.id, playlistItems])

  const playPrev = useCallback(() => {
    if (playlistItems.length < 2) return

    const currentIndex = playlistItems.findIndex(
      (item) => item.id === currentItem?.id
    )
    const prevIndex =
      (currentIndex - 1 + playlistItems.length) % playlistItems.length
    setCurrentItem(playlistItems[prevIndex] ?? null)
  }, [currentItem?.id, playlistItems])

  const handleEnded = useCallback(() => {
    if (repeatMode === "playlist") playNext()
  }, [playNext, repeatMode])

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode((mode) =>
      mode === "none" ? "playlist" : mode === "playlist" ? "one" : "none"
    )
  }, [])

  const handleRotationChange = useCallback(
    (rotation: number) => {
      if (!currentItem) return
      setRotations((current) => ({
        ...current,
        [currentItem.id]: rotation,
      }))
    },
    [currentItem]
  )

  useEffect(() => {
    const prevLength = prevPlaylistLengthRef.current
    if (prevLength === 0 && playlistItems.length > 0) {
      setCurrentItem(playlistItems[0] ?? null)
    }
    prevPlaylistLengthRef.current = playlistItems.length
  }, [playlistItems])

  return (
    <main className="flex h-svh w-screen overflow-hidden bg-black">
      <div className="h-full min-w-0 grow">
        <VideoPlayer
          src={currentItem?.url ?? null}
          rotation={currentItem ? (rotations[currentItem.id] ?? 0) : 0}
          repeatMode={repeatMode}
          loop={
            repeatMode === "one" ||
            (repeatMode === "playlist" && playlistItems.length === 1)
          }
          onEnded={handleEnded}
          onNext={playNext}
          onPrev={playPrev}
          onRepeatModeChange={toggleRepeatMode}
          onRotationChange={handleRotationChange}
        />
      </div>
      <div className="h-full w-[28rem] shrink-0">
        <Playlist
          items={playlistItems}
          setItems={setPlaylistItems}
          onItemClick={handleItemClick}
          onRemoveItem={handleRemoveItem}
          currentItemId={currentItem?.id ?? null}
        />
      </div>
    </main>
  )
}

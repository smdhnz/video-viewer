"use client"

import { CSS } from "@dnd-kit/utilities"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Film, GripVertical, Link, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import { useState, type FormEvent, type MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PlaylistItem } from "@/types/playlist"

const getVideoMetadata = (
  file: File
): Promise<{ duration: number; thumbnail: string }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const videoUrl = URL.createObjectURL(file)

    const cleanup = () => URL.revokeObjectURL(videoUrl)

    video.preload = "metadata"
    video.onloadedmetadata = () => {
      const duration = video.duration
      video.currentTime = Math.min(1, duration / 2)

      video.onseeked = () => {
        const canvas = document.createElement("canvas")
        const aspectRatio = video.videoWidth / video.videoHeight || 16 / 9
        canvas.width = 180
        canvas.height = Math.round(canvas.width / aspectRatio)

        const context = canvas.getContext("2d")
        if (!context) {
          cleanup()
          reject(new Error("サムネイル生成に失敗しました"))
          return
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnail = canvas.toDataURL("image/jpeg")
        cleanup()
        resolve({ duration, thumbnail })
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error("動画メタデータの読み込みに失敗しました"))
    }

    video.src = videoUrl
  })
}

const formatDuration = (seconds: number) => {
  if (Number.isNaN(seconds)) return "--:--"

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function SortableItem({
  item,
  isPlaying,
  onRemove,
}: {
  item: PlaylistItem
  isPlaying: boolean
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onRemove(item.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group/item mb-2 flex cursor-pointer items-center gap-3 rounded-2xl border p-2 transition",
        isPlaying
          ? "border-primary/40 bg-primary/15 text-foreground shadow-[0_0_40px_rgba(250,204,21,0.12)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-xl p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
      >
        <GripVertical size={18} />
      </div>

      {item.thumbnail ? (
        <Image
          src={item.thumbnail}
          alt={item.name}
          width={96}
          height={56}
          unoptimized
          className="h-14 w-24 shrink-0 rounded-xl bg-black object-cover"
        />
      ) : (
        <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-black/60 text-muted-foreground">
          {item.isHLS ? <Link size={20} /> : <Film size={20} />}
        </div>
      )}

      <div className="min-w-0 grow">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.isHLS
            ? "HLS Link"
            : item.duration
              ? formatDuration(item.duration)
              : "読み込み中"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleRemove}
        className="hover:text-destructive-foreground rounded-xl p-2 text-muted-foreground opacity-80 transition group-hover/item:opacity-100 hover:bg-destructive"
        aria-label="項目を削除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

type PlaylistProps = {
  items: PlaylistItem[]
  setItems: (
    items: PlaylistItem[] | ((prev: PlaylistItem[]) => PlaylistItem[])
  ) => void
  onItemClick: (item: PlaylistItem) => void
  onRemoveItem: (id: string) => void
  currentItemId: string | null
}

export function Playlist({
  items,
  setItems,
  onItemClick,
  onRemoveItem,
  currentItemId,
}: PlaylistProps) {
  const [urlInput, setUrlInput] = useState("")
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddUrl = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!urlInput.trim()) return

    let finalUrl = urlInput.trim()
    if (finalUrl.includes("public.ynjn.jp")) {
      finalUrl = finalUrl.replace("https://public.ynjn.jp", "/proxy-ynjn")
    }

    setItems((prevItems) => [
      ...prevItems,
      {
        id: `url-${Date.now()}`,
        name: finalUrl.split("/").pop() || "Network Stream",
        url: finalUrl,
        isHLS: finalUrl.includes(".m3u8"),
      },
    ])
    setUrlInput("")
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((prevItems) => {
      const oldIndex = prevItems.findIndex((item) => item.id === active.id)
      const newIndex = prevItems.findIndex((item) => item.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prevItems

      return arrayMove(prevItems, oldIndex, newIndex)
    })
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("video/")
    )

    if (files.length === 0) return

    const newItems = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file)
        const id = `${file.name}-${file.size}-${Date.now()}`

        try {
          const cleanFile = new File([file], file.name, { type: file.type })
          const { duration, thumbnail } = await getVideoMetadata(cleanFile)
          return { id, name: file.name, file, url, duration, thumbnail }
        } catch (error) {
          console.error(`Failed to get metadata for ${file.name}:`, error)
          return { id, name: file.name, file, url, duration: 0, thumbnail: "" }
        }
      })
    )

    setItems((prevItems) => [...prevItems, ...newItems])
  }

  return (
    <aside
      className="flex h-full w-full flex-col border-l border-white/10 bg-zinc-950/90 p-4 text-zinc-50 shadow-2xl backdrop-blur"
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <div className="mb-4">
        <p className="text-xs font-medium tracking-[0.24em] text-primary uppercase">
          Queue
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Playlist</h2>
      </div>

      <form onSubmit={handleAddUrl} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="m3u8 / video URL"
          className="h-11 min-w-0 grow rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-zinc-50 transition outline-none placeholder:text-zinc-500 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
        />
        <Button type="submit" size="icon" className="h-11 w-11 rounded-2xl">
          <Plus size={20} />
        </Button>
      </form>

      <div className="min-h-0 grow overflow-y-auto pr-1">
        {items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <div key={item.id} onClick={() => onItemClick(item)}>
                  <SortableItem
                    item={item}
                    isPlaying={currentItemId === item.id}
                    onRemove={onRemoveItem}
                  />
                </div>
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex h-full min-h-80 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <p className="text-sm leading-7 text-zinc-400">
              動画ファイルをドラッグ＆ドロップ
              <br />
              またはURLを貼り付け
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

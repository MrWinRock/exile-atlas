"use client";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { api } from "@/lib/client";
import type { ItemArtwork, PassiveSprite } from "@/lib/artwork";
type Catalogue = {
  items: ItemArtwork[];
  withImages: number;
  revision: string;
  source: string;
  fetchedAt: string;
};
export function useItemImages() {
  const query = useQuery({
    queryKey: ["item-artwork"],
    queryFn: () => api<Catalogue>("items"),
    staleTime: 86400000,
  });
  const index = useMemo(() => {
    const ids = new Map<string, ItemArtwork>(),
      names = new Map<string, ItemArtwork>();
    for (const item of query.data?.items ?? []) {
      ids.set(item.id, item);
      const key = item.name.toLowerCase();
      if (!names.has(key) || (!names.get(key)?.icon && item.icon)) names.set(key, item);
    }
    return { ids, names };
  }, [query.data]);
  const find = useCallback(
    (id?: string, name?: string) =>
      (id ? index.ids.get(id) : undefined) ??
      (name ? index.names.get(name.toLowerCase()) : undefined),
    [index],
  );
  return { ...query, find };
}
export function ItemImage({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState<string>();
  return (
    <span
      className="item-artwork"
      style={{ width: size, height: size }}
      title={!src || failed === src ? `${name} — image unavailable` : name}
    >
      {src && failed !== src ? (
        <Image
          unoptimized
          src={src}
          width={size}
          height={size}
          alt={name}
          loading="lazy"
          onError={() => setFailed(src)}
        />
      ) : (
        <ImageOff size={Math.min(22, size / 2)} aria-label={`${name} image unavailable`} />
      )}
    </span>
  );
}
export function PassiveIcon({
  sprite,
  name,
  size = 34,
}: {
  sprite?: PassiveSprite;
  name: string;
  size?: number;
}) {
  const scale = sprite ? Math.min(size / sprite.w, size / sprite.h) : 1;
  return (
    <span
      className="passive-artwork"
      style={{ width: size, height: size }}
      role="img"
      aria-label={sprite ? name : `${name} — image unavailable`}
    >
      {sprite ? (
        <span
          style={{
            width: sprite.w * scale,
            height: sprite.h * scale,
            backgroundImage: `url("${sprite.sheet}")`,
            backgroundSize: `${sprite.sheetWidth * scale}px ${sprite.sheetHeight * scale}px`,
            backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
          }}
        />
      ) : (
        <ImageOff size={size / 2} />
      )}
    </span>
  );
}

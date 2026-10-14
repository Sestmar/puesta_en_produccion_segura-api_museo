import { Link } from "react-router-dom";

import { imageForRoom } from "@/lib/images";
import type { Room } from "@/lib/api/types";

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link to={`/salas/${room.id}`} className="group relative flex flex-col overflow-hidden rounded-card border border-ink-700">
      <div className="relative aspect-16/10 overflow-hidden bg-ink-800">
        <img
          src={imageForRoom(room, 900)}
          alt={room.name}
          loading="lazy"
          decoding="async"
          className="artwork-media size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-400">
              Planta {room.floor}
            </span>
            <h3 className="font-display text-lg font-bold text-bone-50">{room.name}</h3>
          </div>
        </div>
      </div>
    </Link>
  );
}

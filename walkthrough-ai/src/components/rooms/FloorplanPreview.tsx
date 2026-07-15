'use client';

interface FloorplanRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function FloorplanPreview({
  rooms,
  roomNames,
}: {
  rooms: FloorplanRoom[];
  roomNames: Record<string, string>;
}) {
  if (rooms.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <svg viewBox="0 0 100 100" className="h-auto w-full" style={{ aspectRatio: '1 / 1' }}>
        {rooms.map((room) => (
          <g key={room.id}>
            <rect
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              rx={1.5}
              className="fill-primary/10 stroke-primary/40"
              strokeWidth={0.4}
            />
            <text
              x={room.x + room.width / 2}
              y={room.y + room.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground/80"
              style={{ fontSize: '3.2px' }}
            >
              {roomNames[room.id] ?? ''}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Relative floorplan estimate — not to scale
      </p>
    </div>
  );
}

// Initial on a soft hue derived from a stable key (user id or email), so the
// same person always gets the same color across the dashboard, editor and share list.
function hueFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Avatar({ name, idKey, size = 32 }: { name: string; idKey: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-ink"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `oklch(0.88 0.07 ${hueFor(idKey)})`,
      }}
    >
      {initial}
    </span>
  );
}

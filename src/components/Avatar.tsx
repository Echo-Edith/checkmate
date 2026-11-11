/** Round profile picture with a letter fallback. `version` busts the cache when the picture changes. */
export function Avatar({
  id,
  version,
  name,
  size = 40,
  className = "",
}: {
  id: string | null;
  version: number | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = Array.from(name)[0]?.toUpperCase() ?? "♞";
  const style = { width: size, height: size, fontSize: size * 0.45 };

  if (id && version !== null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${id}?v=${version}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className={`btn-primary grid shrink-0 place-items-center rounded-full font-bold ${className}`} style={style} aria-hidden>
      {initial}
    </span>
  );
}

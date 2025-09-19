export function relativeTime(dateIso: string | number | Date): string {
  try {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24); if (day < 7) return `${day}d ago`;
    const wk = Math.floor(day / 7); if (wk < 4) return `${wk}w ago`;
    const mo = Math.floor(day / 30); if (mo < 12) return `${mo}mo ago`;
    const yr = Math.floor(day / 365); return `${yr}y ago`;
  } catch {
    return '';
  }
}

function dots(count: number, radius: number, size: number): Array<{
  cx: number;
  cy: number;
  r: number;
}> {
  const out: Array<{ cx: number; cy: number; r: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    out.push({
      cx: 260 + Math.cos(angle) * radius,
      cy: 260 + Math.sin(angle) * radius,
      r: size,
    });
  }
  return out;
}

const RINGS = [
  ...dots(16, 70, 1.6),
  ...dots(28, 118, 1.5),
  ...dots(40, 166, 1.4),
  ...dots(52, 214, 1.25),
];

export function OrbitField() {
  return (
    <svg className="orbit" viewBox="0 0 520 520" aria-hidden="true">
      <circle cx="260" cy="260" r="70" fill="none" stroke="rgba(12,12,11,0.08)" />
      <circle cx="260" cy="260" r="118" fill="none" stroke="rgba(12,12,11,0.07)" />
      <circle cx="260" cy="260" r="166" fill="none" stroke="rgba(12,12,11,0.06)" />
      <circle cx="260" cy="260" r="214" fill="none" stroke="rgba(12,12,11,0.05)" />
      {RINGS.map((dot, i) => (
        <circle key={`${dot.cx}-${dot.cy}-${i}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill="rgba(12,12,11,0.28)" />
      ))}
      <circle cx="260" cy="260" r="4.5" fill="#0c0c0b" />
    </svg>
  );
}

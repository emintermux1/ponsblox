import type { ReactNode } from "react";

function Glyph({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <span className="mf-icon" aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      <svg viewBox="0 0 24 24">{children}</svg>
    </span>
  );
}

export function IconHome() {
  return (
    <Glyph>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M7 10.5V20h10v-9.5" />
    </Glyph>
  );
}

export function IconSearch() {
  return (
    <Glyph>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Glyph>
  );
}

export function IconPeople() {
  return (
    <Glyph>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 14.2c2 .4 3.6 1.8 4.2 4.8" />
    </Glyph>
  );
}

export function IconProfile() {
  return (
    <Glyph>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c.8-3.6 3.4-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Glyph>
  );
}

let pane: HTMLDivElement | null = null;

export function bindDexPane(el: HTMLDivElement | null): void {
  pane = el;
}

export function dexPane(): HTMLDivElement | null {
  return pane;
}

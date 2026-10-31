export function spotlightPlacement(rect, viewport, measuredHeight) {
  const gap = 16, width = Math.min(360, viewport.width - gap * 2);
  const height = Math.min(measuredHeight, viewport.height - gap * 2);
  if (!rect) return { left: Math.max(gap, (viewport.width - width) / 2), top: gap, width, maxHeight: viewport.height - gap * 2 };
  const left = Math.max(gap, Math.min(viewport.width - width - gap, rect.left + rect.width / 2 - width / 2));
  const bottom = rect.top + rect.height;
  if (bottom + gap + height <= viewport.height - gap) return { left, top: bottom + gap, width, maxHeight: viewport.height - bottom - gap * 2 };
  if (rect.top - gap - height >= gap) return { left, top: rect.top - gap - height, width, maxHeight: rect.top - gap * 2 };
  if (rect.left + rect.width + gap + width <= viewport.width - gap) return { left: rect.left + rect.width + gap, top: gap, width, maxHeight: viewport.height - gap * 2 };
  if (rect.left - gap - width >= gap) return { left: rect.left - gap - width, top: gap, width, maxHeight: viewport.height - gap * 2 };
  // Use the larger free area and scroll the explanation, never cover the target.
  const above = rect.top - gap * 2, below = viewport.height - bottom - gap * 2;
  return above > below ? { left, top: gap, width, maxHeight: Math.max(40, above) } :
    { left, top: bottom + gap, width, maxHeight: Math.max(40, below) };
}

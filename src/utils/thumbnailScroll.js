export function getCenteredThumbnailScrollLeft({
  scrollLeft,
  clientWidth,
  scrollWidth,
  itemLeft,
  itemWidth
}) {
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth)
  const target = scrollLeft + itemLeft - ((clientWidth - itemWidth) / 2)
  return Math.min(maxScrollLeft, Math.max(0, Math.round(target)))
}

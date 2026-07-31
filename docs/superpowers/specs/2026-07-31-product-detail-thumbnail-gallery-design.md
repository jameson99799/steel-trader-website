# Product Detail Thumbnail Gallery Restoration Design

**Date:** 2026-07-31

## Goal

Restore the missing thumbnail strip below the product detail hero image while
preserving the current image navigation, zoom behavior, and image/video media
support.

## Evidence and root cause

The last repository snapshot before the end of June 30 is commit `d60b2da`
from June 29. Its product detail template iterates over an undefined
`galleryImages` binding and assigns the class `thumb-btn`, while the component
actually exposes the `images` computed value and styles `.thumbnail-btn`.

The mismatch was introduced by commit `1859c15` when video support was added.
The preceding implementation used `images` and `.thumbnail-btn`, and the
isolated gallery correction in commit `ae91b74` restored those same bindings.

## Scope

### In scope

- Render one thumbnail for every entry in the existing `images` computed value.
- Support both image and MP4/WebM thumbnail media.
- Mark the selected thumbnail with the existing active-state styling.
- Switch the main media when a thumbnail is selected.
- Show the strip only when the product contains more than one media item.
- Preserve horizontal scrolling and the existing desktop/mobile thumbnail sizes.
- Add a focused regression test for the template bindings and media behavior.

### Out of scope

- Restoring the complete July 31 commit.
- Changing product data, API responses, database records, or admin upload flows.
- Redesigning the hero image, navigation arrows, lightbox, badges, or product
  information column.
- Reverting the complete product detail component to an older snapshot.

## Design

The product detail template will use the component's existing `images` computed
value as the single gallery data source. Thumbnail buttons will use the existing
`.thumbnail-btn` class and its `active` modifier. The current conditional image
and video elements remain unchanged, so the repair does not remove media support
added after the original gallery implementation.

No new state, computed values, components, or API calls are required. Selecting
a thumbnail continues assigning its URL to `currentImage`; the main viewer,
navigation arrows, and lightbox therefore stay synchronized through the existing
state flow.

## Error handling

The existing `images` computed value already returns an empty array for missing
product media and filters empty comma-separated entries. The thumbnail strip is
not rendered for zero or one media item, avoiding empty controls. This change
does not add a second fallback path or duplicate gallery state.

## Testing

A focused Node test will read `ProductDetail.vue` and assert that:

- the thumbnail loop iterates over `images`;
- the button uses `.thumbnail-btn` with the active state;
- the obsolete `galleryImages` and `thumb-btn` bindings are absent;
- image and MP4/WebM thumbnail branches remain present.

The focused test will be observed failing before the production edit, then
passing afterward. The full test suite and Vite production build must also pass.

## Success criteria

On a product with multiple media items, thumbnails appear directly below the
main viewer, the selected item is highlighted, clicking another thumbnail
updates the main viewer, image/video entries both render, and no unrelated
product detail behavior changes.

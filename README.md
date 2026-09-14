# Photo Orbit

A playful rotating photo gallery built with plain HTML, CSS, and JavaScript. Inspired by the photo interaction on ramp.design; independently implemented for Veena Panicker. No build tools or framework required.

## Run locally

With Python 3 installed, open a terminal in this folder and run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The included abstract SVG artwork makes the demo usable immediately.

## Add your own photos

1. Create an `assets/photos/` folder and put your images there (the demo SVGs live in the repository root).
2. Edit `photos.js`. Each entry has `src` (full image), `thumb` (small preview), `width`, `height`, `alt` (accessible description), and `caption`.
3. Use 21 entries for 21 unique globe positions. Fewer entries repeat; more than 21 will not all appear in the globe unless you also extend the slots in `orbit.js`.
4. Use actual image dimensions and meaningful alt text. WebP thumbnails around 400–600 pixels on the long edge reduce initial downloads. Full images around 1800 pixels are a useful starting point.
5. Replace “Your Name”, title, and subtitle in `index.html`. Adjust colors, typography, and sizes in `style.css`. Rotation speed and depth live in `orbit.js`.

Keep captions as plain text. They are rendered with textContent, not HTML. The demo contains no personal photographs or personal captions.

## Interactions

- Drag the globe to explore; tap/click a photo to enlarge.
- On desktop (over 600px), scroll to navigate enlarged photos. Trackpad momentum is guarded so a single gesture does not race through the gallery.
- On mobile, swipe enlarged photos left or right.
- Click outside the image, use the close button, or press Escape to return.
- Arrow buttons and keyboard arrows navigate. Tab/Enter opens focused photos.
- Play/Pause controls motion. Reduced-motion preferences are respected.

## Hosting

Upload this folder to any static web host. No server application or secrets are required. For GitHub Pages, publish the main branch’s root directory in repository Settings → Pages. All asset paths are relative so project URLs work.

## Files

- `index.html`: page and photo dialog
- `style.css`: responsive presentation
- `photos.js`: image and caption configuration
- `orbit.js`: globe slots, projection, and motion math
- `gallery.js`: rendering and interaction logic

## Notes

Google Fonts are currently requested by the stylesheet/page; system fonts provide a fallback. JavaScript is required for the interactive globe. Test your own images, captions, and device sizes before publishing. Add only photos you have permission to share.

## License

MIT; see LICENSE. Includes the demo SVG artwork. Original personal photos are not included.

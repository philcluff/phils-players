# Friction log: adding a Video.js 10 beta page

Date: 2026-08-26. Version tested: `@videojs/html@10.0.0-beta.32` via jsDelivr.

## Discovery

1. **v10 is not on the `video.js` npm package.** `npm view video.js dist-tags` shows `latest: 8.24.0` and no `10.x` versions at all. v10 lives in a separate repo (`videojs/v10`) and separate scoped packages (`@videojs/html`, `@videojs/react`, `@videojs/core`). If you know Video.js 8 and go looking for `video.js@10` or `video.js@next`, you find nothing.
2. **`videojs.org/llms.txt` is a changelog, not usable docs.** Fetching it and the linked `docs/framework/html/llms.txt` gave an index and changelog entries but no install snippet, no CDN URL, no element names. Had to go two more hops to `how-to/installation.md`.
3. **Docs are bundled in the npm package** (`@videojs/html/docs/*.md`), which turned out to be the fastest way to read them: `curl https://cdn.jsdelivr.net/npm/@videojs/html@<ver>/docs/how-to/installation.md`. Nice, but not obvious from the website.
4. **Installation guide's CDN snippet only shows a plain `<video>`.** It's "tailored" by a CLI (`npx @videojs/cli docs how-to/installation --media hls ...`). For a static HTML page you have to know to read `reference/hlsjs-video.md` or the v8 migration guide to learn that HLS/DASH need their own `cdn/media/*.js` script tags. The base `cdn/video.js` registers the skin and UI elements only — no media elements.

## CDN / versioning

5. **jsDelivr semver ranges don't match prereleases.** `@videojs/html@10/...` and `@10.x/...` both 404. `@latest` works (200), as does `@^10.0.0-beta`. The rest of this repo uses floating majors (`video.js@8`), so I used `@latest`. Once GA ships, `@latest` will silently move off the beta.
6. **Everything is ESM (`type="module"`) with ~50 hashed chunk imports.** `cdn/video.js` pulled about 50 module requests on first load; Chrome DevTools' 10s navigation timeout tripped while waiting for them. Not a bug, just a very different loading profile to the single `video.min.js` of v8.
7. `cdn/media/dash-video.js` is 822 KB and `shaka-video.js` is 705 KB, because they bundle dash.js / Shaka wholesale. Fine for a demo page, worth knowing for real use.

## Building the page

8. **HLS vs DASH are different elements, not `player.src({type})`.** v8 pages here call `player.src({src, type})` and switch between HLS and DASH on one player. In v10 the "tech" is the media tag (`<hlsjs-video>` / `<hls-video>` / `<dash-video>`), so switching formats means creating a new element and `replaceWith()`-ing the old one inside `<video-skin>`. Swapping worked without issue, but it's a mental-model change from every other page in this repo.
9. **Three HLS elements to choose from** (`hls-video` = SPF, `hlsjs-video` = hls.js, `native-hls-video`). The migration guide says "start with the default (SPF) and move to hls.js if you hit something it doesn't handle". The repo's demo HLS manifest is MediaConvert MPEG-TS, which SPF does not support, so "the default" fails on the first thing a bring-your-own-manifest tool is likely to be fed. Defaulted the page to hls.js and left SPF as an option.
10. **SPF failure surfaces as `error.code: 99001` with an empty `message`.** Console gets `[spf] reported condition [object Object]` and `Can't play this source: it requires an unsupported playback feature.` The skin's error dialog says "Something went wrong. This media is unsupported by the player." Neither the dialog nor the error object says "MPEG-TS isn't supported, use hlsjs-video", even though the docs describe an `alternativeMediaSuggestion` property intended for exactly this — it's empty for `hls-video`.
11. **`media.play()` straight after setting `src` on `<hlsjs-video>` rejects with `AbortError: The play() request was interrupted by a new load request`.** hls.js attaches asynchronously and triggers a load, cancelling the pending play. `<hls-video>` and `<dash-video>` did not do this. Setting the `autoplay` attribute on the freshly created element instead works for all three. Behaviour differs per media element, which bites when you're swapping them generically.
12. Unhandled `play()` rejections show as `Uncaught (in promise)` in the console — the v8 page has the same latent issue but v10 surfaced it because of item 11.

## What worked well

- Markup is genuinely three tags: `<video-player><video-skin><hlsjs-video src>`. No `videojs()` call, no `data-setup`, no CSS link needed (skin styles are in the JS).
- Default skin looks good out of the box with zero config, and the error dialog is a real improvement over v8's error display.
- Sizing is plain CSS (`width` + `aspect-ratio` on `video-skin`), no `fluid`/`aspectRatio` options.
- dash.js playback worked first time with only a `src`.

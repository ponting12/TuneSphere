# TuneSphere Fix Log

## Goal
Fix issue where “song is not playing” by addressing endpoint/player bugs.

## Completed
- Identified that `index.html` (root) loads `script.js`, while React frontend `client/index.html` loads only the Vite/React bundle. If root `index.html` is used, React playback code may be bypassed or conflicting with `script.js`.
- Found React `PlayerBar` uses a hidden `div id="yt-player"`, but also the legacy `script.js` creates its own `ytPlayer = new YT.Player('yt-player', ...)`, which can conflict if both run.

## Next steps
1. Update root `index.html` to also use React app (or remove legacy `script.js`), so only one playback controller runs.
2. Ensure backend YouTube endpoint is consistent (`/api/youtube/search`).
3. Run app and verify that clicking play triggers YouTube IFrame API state.
4. If needed, fix any remaining mismatches in YouTube track objects (must include `videoId`).


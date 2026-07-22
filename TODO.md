# Bug Fix: Song Not Playing

## Root Cause
Race condition between YouTube iframe API initialization and track loading in `PlayerBar.jsx`.

## Steps
1. [x] Add refs to track pending video loads and loaded video state
2. [x] Fix `currentTrack` effect to handle YT not-ready case by storing pending video ID
3. [x] Fix YT `onReady` to load the pending video when player becomes ready
4. [x] Add `currentTrack` to `isPlaying` effect dependencies so it re-runs on track change
5. [x] Ensure `isPlaying` effect loads video if not already loaded before playing
6. [x] Test the fix


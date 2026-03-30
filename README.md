# SuperSubstack

<img src="icons/supersubstack_icon.png" alt="SuperSubstack" width="180" />

SuperSubstack is a Chrome extension that enhances your Substack reading experience with better progress context, typography controls, bionic reading, a reading list, and offline article archiving.

## What it does

- Adds a reading progress bar with percent complete, estimated time left, and current section context
- Offers bionic reading mode to bold the start of words, with light, medium, or strong intensity
- Lets you tune typography with reading style, font size, line spacing, content width, and a reset-to-defaults button
- Saves articles to a local reading list so you can come back to them later
- Archives Substack articles as self-contained HTML files for offline reading

## How it works

The extension injects a content script into Substack article pages and applies lightweight reading helpers without permanently changing the original content. The popup gives you quick access to progress, focus, typography, reading-list, and archive controls.

## Files

- `manifest.json` - Chrome extension configuration
- `content.js` - progress context, typography, bionic reading, and archiving logic
- `content.css` - injected styles for the reading UI and progress HUD
- `popup.html` / `popup.js` - extension popup controls, typography settings, and reading list UI
- `background.js` - service worker for context menu and download handling

## Install locally

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click Load unpacked
4. Select this project folder

## Usage

Open any Substack article, click the extension icon, and adjust the reading tools you want. You can fine-tune typography, save the article to your reading list, or archive it from the popup for offline reading later.

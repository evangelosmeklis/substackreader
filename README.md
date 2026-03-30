# SuperSubstack

<img src="icons/supersubstack_icon.png" alt="SuperSubstack" width="180" />

SuperSubstack is a Chrome extension that enhances your Substack reading experience with a progress bar, bionic reading mode, and article archiving.

## What it does

- Adds a reading progress bar at the top of Substack articles
- Offers bionic reading mode to bold the start of words, with light, medium, or strong intensity
- Lets you archive Substack articles as Markdown files to your local machine

## How it works

The extension injects a content script into Substack pages and applies lightweight reading helpers without changing the original article content permanently. The popup gives you quick access to all controls.

## Files

- `manifest.json` - Chrome extension configuration
- `content.js` - progress bar, bionic reading, and archiving logic
- `content.css` - injected styles for the reading UI
- `popup.html` / `popup.js` - extension popup controls
- `background.js` - service worker for context menu and download handling

## Install locally

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click Load unpacked
4. Select this project folder

## Usage

Open any Substack article, click the extension icon, and toggle the reading tools you want. To archive an article, navigate to it and use the Archive section in the popup.

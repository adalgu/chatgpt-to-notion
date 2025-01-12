# ChatGPT to Notion Exporter

A Chrome extension that exports ChatGPT conversations to Notion, preserving markdown formatting.

## Features

- Export the last ChatGPT response to Notion
- Preserves markdown formatting (headers, lists, code blocks)
- Fallback to plain text when needed
- Supports both popup configuration and .env file for Notion credentials

## Setup

1. Clone this repository
2. Create a `.env` file with your Notion credentials:
   ```
   NOTION_API_KEY=your_api_key_here
   NOTION_DATABASE_ID=your_database_id_here
   ```
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this directory

## Usage

1. Navigate to chat.openai.com
2. When you want to export a response, click the extension icon
3. Click "Export to Notion"

The extension will export the last ChatGPT response to your Notion database, preserving formatting where possible.

## Development

The extension consists of:
- `manifest.json`: Extension configuration
- `popup.html/js`: Extension popup UI
- `content.js`: Content script for extracting ChatGPT responses
- `background.js`: Background script for Notion API communication

## License

MIT License

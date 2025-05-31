# Development Guide

## Quick Start - Running the Project

Follow these three simple steps to run the project:

### 1. Start ngrok
```bash
ngrok http 3000
```
This creates a secure tunnel to your local server and provides a public HTTPS URL.

### 2. Update ngrok URL
```bash
npm run update-ngrok
```
This automatically updates your environment variables with the new ngrok URL.

### 3. Start the development server
```bash
npm run dev
```
This starts the Next.js development server on port 3000.

## That's it! 🎉

Your app will be available at:
- **Local**: http://localhost:3000
- **Public**: The HTTPS URL shown in ngrok (something like `https://abc123.ngrok-free.app`)

## Important Notes

- **Keep ngrok running**: Don't close the ngrok terminal - it needs to stay open
- **If ngrok restarts**: You'll need to run steps 2 and 3 again to update the URL
- **New ngrok URL each time**: Every time you restart ngrok, you get a new URL

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ngrok not installed | Install with `brew install ngrok` (macOS) |
| Port 3000 already in use | Use a different port: `ngrok http 8080` and update scripts |
| Environment variables not updating | Make sure to restart the dev server after `npm run update-ngrok` |

## Development Workflow

1. **Terminal 1**: `ngrok http 3000` (keep running)
2. **Terminal 2**: `npm run update-ngrok` then `npm run dev`
3. **When ngrok restarts**: Repeat step 2

That's all you need to get started! 🚀 
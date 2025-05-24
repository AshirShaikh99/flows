# Quick Start with UltraVox Call Stages

## Current Status ✅

Your environment is now configured for UltraVox Call Stages with HTTPS support:

- **ngrok**: Already installed and running ✅
- **Environment**: Updated with HTTPS URL ✅
- **Current ngrok URL**: `https://d1d3-2400-adc3-11b-2700-e9bf-a9da-d2c-b486.ngrok-free.app`

## Next Steps

1. **Restart your Next.js server** to pick up the new environment variables:
   ```bash
   # Stop your current server (Ctrl+C) then restart
   npm run dev
   ```

2. **Test UltraVox Call Stages**:
   - Open your app at http://localhost:3000
   - Click "Show Call Manager"
   - Click "Start Call"
   - The tools should now work with HTTPS! 🎉

## If ngrok URL changes

When you restart ngrok, the URL changes. Here's how to update quickly:

```bash
# Start ngrok (if not running)
ngrok http 3000

# Update your .env.local automatically
npm run update-ngrok

# Restart your dev server
npm run dev
```

## Troubleshooting

### "Tools must use HTTPS protocol" error
- Check that your .env.local has an HTTPS URL
- Restart your Next.js server after changing environment variables

### ngrok not working
- Make sure ngrok is running: `ngrok http 3000`
- Check the web interface: http://localhost:4040

### Can't reach ngrok URL
- Verify both Next.js and ngrok are running
- The ngrok URL should show your React app

## Development Workflow

1. **Terminal 1**: Run your Next.js app
   ```bash
   npm run dev
   ```

2. **Terminal 2**: Run ngrok (keep this running)
   ```bash
   ngrok http 3000
   ```

3. **When ngrok restarts**: Update URL and restart Next.js
   ```bash
   npm run update-ngrok
   # Then restart Terminal 1 server
   ```

## Files Changed

- ✅ `.env.local` - Updated with HTTPS ngrok URL
- ✅ `src/lib/ultravox.ts` - Added HTTPS validation
- ✅ `scripts/update-ngrok-url.sh` - Helper script for URL updates
- ✅ `package.json` - Added convenience scripts
- ✅ `NGROK_SETUP.md` - Detailed setup instructions

You're all set! 🚀 
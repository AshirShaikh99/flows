# Ngrok Setup for UltraVox Call Stages

UltraVox requires HTTPS for tool endpoints. Since we're running locally on `http://localhost:3000`, we need to use ngrok to expose our development server over HTTPS.

## Step 1: Install ngrok

### Option A: Using Homebrew (macOS)
```bash
brew install ngrok/ngrok/ngrok
```

### Option B: Download directly
1. Go to https://ngrok.com/download
2. Download the binary for your OS
3. Install according to their instructions

## Step 2: Create ngrok account (free)

1. Go to https://ngrok.com/
2. Sign up for a free account
3. Get your auth token from the dashboard

## Step 3: Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Step 4: Start your Next.js development server

```bash
npm run dev
```

## Step 5: Start ngrok in a new terminal

```bash
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:3000
```

## Step 6: Update your .env.local file

Copy the HTTPS URL from ngrok (e.g., `https://abc123def456.ngrok.io`) and update your `.env.local`:

```bash
NEXT_PUBLIC_BASE_URL=https://abc123def456.ngrok.io
```

## Step 7: Restart your Next.js server

After updating the environment variable, restart your development server:

```bash
# Stop the server (Ctrl+C) then restart
npm run dev
```

## Important Notes

1. **Keep ngrok running**: The ngrok tunnel must stay active while testing UltraVox calls
2. **URL changes**: Each time you restart ngrok, you get a new URL (unless you have a paid plan)
3. **Update .env.local**: Remember to update the `NEXT_PUBLIC_BASE_URL` whenever the ngrok URL changes
4. **Security**: ngrok URLs are publicly accessible, so don't expose sensitive data

## Troubleshooting

### Issue: "This site can't be reached"
- Make sure both your Next.js server and ngrok are running
- Verify the ngrok URL is correct in your .env.local

### Issue: "Tools must use HTTPS protocol"
- Ensure your `NEXT_PUBLIC_BASE_URL` starts with `https://`
- Restart your Next.js server after changing environment variables

### Issue: ngrok tunnel disconnected
- Restart ngrok: `ngrok http 3000`
- Update the new URL in .env.local
- Restart your Next.js server

## Quick Setup Script

You can create a script to automate the setup:

```bash
#!/bin/bash
# start-dev.sh

echo "Starting Next.js development server..."
npm run dev &

echo "Waiting for server to start..."
sleep 3

echo "Starting ngrok tunnel..."
ngrok http 3000
```

Then run: `chmod +x start-dev.sh && ./start-dev.sh`

## Free vs Paid ngrok

### Free Plan
- URL changes every restart
- Limited to 1 tunnel
- Basic features

### Paid Plan ($8/month)
- Static domains (URL stays the same)
- Multiple tunnels
- Better performance

For development, the free plan is usually sufficient. 
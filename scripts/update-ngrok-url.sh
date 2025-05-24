#!/bin/bash

echo "🔍 Getting ngrok URL..."

# Wait a moment for ngrok to start if it just started
sleep 2

# Get the public URL from ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ "$NGROK_URL" = "null" ] || [ -z "$NGROK_URL" ]; then
    echo "❌ Could not get ngrok URL. Make sure ngrok is running with: ngrok http 3000"
    exit 1
fi

echo "✅ Found ngrok URL: $NGROK_URL"

# Update .env.local file
if [ -f ".env.local" ]; then
    # Backup current .env.local
    cp .env.local .env.local.backup
    
    # Update the NEXT_PUBLIC_BASE_URL line
    sed -i '' "s|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=$NGROK_URL|" .env.local
    
    echo "✅ Updated .env.local with new ngrok URL"
    echo "📝 Backup saved as .env.local.backup"
    
    # Show the updated line
    echo "🔧 Current setting:"
    grep "NEXT_PUBLIC_BASE_URL" .env.local
    
    echo ""
    echo "⚠️  Remember to restart your Next.js server for the changes to take effect!"
    echo "   Stop the server (Ctrl+C) and run: npm run dev"
    
else
    echo "❌ .env.local file not found"
    exit 1
fi 
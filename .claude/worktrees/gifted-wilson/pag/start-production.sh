#!/bin/bash

# Simple production start script
# Alternative to PM2 for basic deployments

echo "🚀 Starting Kaizen Solution in production mode..."

# Load environment variables
export NODE_ENV=production
export PORT=3000

# Start the application
npm run start

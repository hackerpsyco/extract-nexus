#!/bin/bash

echo "🚀 Setting up optimized web scraping platform..."

# Check if required tools are installed
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI is required but not installed. Please install it first."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Please install it first."; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for environment file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your actual credentials before proceeding."
    read -p "Press Enter after you've configured your .env file..."
fi

# Run database migrations
echo "🗄️  Running database migrations..."
supabase db push

# Deploy edge functions
echo "⚡ Deploying edge functions..."
supabase functions deploy process-scraping-jobs
supabase functions deploy export-to-google-sheets

# Set environment variables for edge functions
echo "🔧 Setting up edge function environment variables..."
echo "Please run these commands manually with your actual values:"
echo ""
echo "supabase secrets set FIRECRAWL_API_KEY=your_actual_firecrawl_api_key"
echo "supabase secrets set GOOGLE_SHEETS_API_KEY=your_google_api_key (optional)"
echo ""

# Start development server
echo "🎯 Setup complete! Starting development server..."
echo "📖 Check PERFORMANCE_OPTIMIZATION_GUIDE.md for detailed usage instructions."
echo ""

npm run dev
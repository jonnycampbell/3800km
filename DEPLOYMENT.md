# Production Deployment Guide

## Environment Variables Required

Your app needs these environment variables configured in production:

### Next.js Configuration
```
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Strava API Configuration
```
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_ACCESS_TOKEN=your-strava-access-token
STRAVA_REFRESH_TOKEN=your-strava-refresh-token
STRAVA_REDIRECT_URI=https://your-production-domain.com/api/auth/strava/callback
```

## Deployment Platform Instructions

### Vercel
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add each variable above with your actual values

### Netlify
1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings > Environment variables
4. Add each variable above with your actual values

### Other Platforms
Most platforms have an environment variables section in their dashboard where you can add these values.

## Getting Your Values

### Strava API Values
1. Go to https://www.strava.com/settings/api
2. Create an application if you haven't already
3. Use the Client ID and Client Secret from your Strava app
4. For access tokens, you may need to run the setup script mentioned in your API route

### Supabase Values
1. Go to your Supabase project dashboard
2. Go to Settings > API
3. Copy the Project URL and anon public key

## Troubleshooting

If your app still doesn't work after setting environment variables:

1. **Check the deployment logs** for specific error messages
2. **Verify all environment variables are set** in your deployment platform
3. **Make sure your Strava tokens are valid** and not expired
4. **Check that your production URL is correct** in NEXT_PUBLIC_BASE_URL 
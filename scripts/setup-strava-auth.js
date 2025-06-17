#!/usr/bin/env node

/**
 * Strava OAuth Setup Script
 * 
 * This script helps you get a properly scoped Strava access token
 * that includes the 'activity:read' permission your app needs.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🏃‍♂️ Strava API Setup Helper\n');

console.log('Step 1: Get your Strava API credentials');
console.log('1. Go to https://www.strava.com/settings/api');
console.log('2. Create an application if you haven\'t already');
console.log('3. Note your Client ID and Client Secret\n');

console.log('Step 2: Generate Authorization URL');
console.log('You need to authorize your app with the correct scopes.\n');

rl.question('Enter your Strava Client ID: ', (clientId) => {
  if (!clientId) {
    console.log('❌ Client ID is required');
    rl.close();
    return;
  }

  const redirectUri = 'http://localhost:3000/auth/callback'; // You can change this
  const scopes = 'read,activity:read_all,profile:read_all';
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${scopes}`;

  console.log('\n✅ Authorization URL generated!');
  console.log('\nStep 3: Authorize your application');
  console.log('1. Open this URL in your browser:');
  console.log(`\n${authUrl}\n`);
  console.log('2. Click "Authorize" to grant permissions');
  console.log('3. You\'ll be redirected to your redirect URI with a code parameter');
  console.log('4. Copy the code from the URL\n');

  rl.question('Enter the authorization code from the redirect URL: ', (authCode) => {
    if (!authCode) {
      console.log('❌ Authorization code is required');
      rl.close();
      return;
    }

    rl.question('Enter your Strava Client Secret: ', (clientSecret) => {
      if (!clientSecret) {
        console.log('❌ Client Secret is required');
        rl.close();
        return;
      }

      console.log('\n🔄 Exchanging code for access token...\n');

      // Exchange code for access token using built-in fetch
      fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: authCode,
          grant_type: 'authorization_code'
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.access_token) {
          console.log('✅ Success! Here are your tokens:\n');
          console.log('Add these to your .env.local file:');
          console.log('=====================================');
          console.log(`STRAVA_CLIENT_ID=${clientId}`);
          console.log(`STRAVA_CLIENT_SECRET=${clientSecret}`);
          console.log(`STRAVA_ACCESS_TOKEN=${data.access_token}`);
          console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
          console.log(`NEXT_PUBLIC_BASE_URL=http://localhost:3000`);
          console.log('=====================================\n');
          console.log('Your access token expires at:', new Date(data.expires_at * 1000).toLocaleString());
          console.log('\n🎉 Setup complete! Your app should now work properly.');
        } else {
          console.log('❌ Error getting access token:', data);
        }
        rl.close();
      })
      .catch(error => {
        console.log('❌ Error:', error.message);
        rl.close();
      });
    });
  });
}); 
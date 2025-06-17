#!/usr/bin/env node

/**
 * Strava Token Refresh Test Script
 * 
 * This script tests the token refresh functionality to ensure it works correctly
 * according to Strava's API documentation.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔄 Strava Token Refresh Test\n');

console.log('This script will test your Strava token refresh functionality.');
console.log('You need your current refresh token to proceed.\n');

rl.question('Enter your Strava Client ID: ', (clientId) => {
  if (!clientId) {
    console.log('❌ Client ID is required');
    rl.close();
    return;
  }

  rl.question('Enter your Strava Client Secret: ', (clientSecret) => {
    if (!clientSecret) {
      console.log('❌ Client Secret is required');
      rl.close();
      return;
    }

    rl.question('Enter your current Refresh Token: ', (refreshToken) => {
      if (!refreshToken) {
        console.log('❌ Refresh Token is required');
        rl.close();
        return;
      }

      console.log('\n🔄 Testing token refresh...\n');

      // Test token refresh
      fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })
      .then(response => {
        console.log(`Response Status: ${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(data => {
        if (data.access_token) {
          console.log('✅ Token refresh successful!\n');
          console.log('Token Details:');
          console.log('===================');
          console.log(`Access Token: ${data.access_token.substring(0, 20)}...`);
          console.log(`Refresh Token: ${data.refresh_token.substring(0, 20)}...`);
          console.log(`Expires At: ${new Date(data.expires_at * 1000).toLocaleString()}`);
          console.log(`Expires In: ${Math.round((data.expires_at * 1000 - Date.now()) / (1000 * 60 * 60))} hours`);
          
          // Test the new access token
          console.log('\n🧪 Testing new access token...');
          
          return fetch('https://www.strava.com/api/v3/athlete', {
            headers: {
              'Authorization': `Bearer ${data.access_token}`
            }
          });
        } else {
          console.log('❌ Token refresh failed:', data);
          throw new Error('Token refresh failed');
        }
      })
      .then(response => {
        console.log(`Athlete API Status: ${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(athlete => {
        console.log('✅ Access token is working!\n');
        console.log('Athlete Info:');
        console.log('=============');
        console.log(`Name: ${athlete.firstname} ${athlete.lastname}`);
        console.log(`ID: ${athlete.id}`);
        console.log(`Country: ${athlete.country || 'Not specified'}`);
        console.log(`City: ${athlete.city || 'Not specified'}`);
        
        console.log('\n🎉 All tests passed! Your token refresh is working correctly.');
        rl.close();
      })
      .catch(error => {
        console.log('❌ Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('- Check that your Client ID and Secret are correct');
        console.log('- Verify your refresh token is still valid');
        console.log('- Ensure your Strava app has the correct permissions');
        console.log('- Check that your app is not rate limited');
        rl.close();
      });
    });
  });
}); 
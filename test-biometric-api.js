// Simple test script to verify biometric API credentials
// Run with: node test-biometric-api.js

const https = require('https');

// Site 67 credentials
const site67 = {
  name: 'Site 67',
  corporateId: 'Sudhir567',
  username: 'UA567',
  password: 'Sudhir@567',
};

// Site 68 credentials
const site68 = {
  name: 'Site 68',
  corporateId: 'Sudhir567',
  username: 'UA568',
  password: 'Sudhir@567',
};

function testSite(site) {
  console.log(`\n========== Testing ${site.name} ==========`);
  
  // Create auth token
  const authString = `${site.corporateId}:${site.username}:${site.password}:true`;
  const authToken = Buffer.from(authString).toString('base64');
  
  console.log(`Auth String: ${authString}`);
  console.log(`Auth Token: ${authToken}`);
  
  // Test URL - using a recent date range
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const fromDate = formatDate(yesterday);
  const toDate = formatDate(today);
  
  // Also test with LastPunchData endpoint
  const url = `https://api.etimeoffice.com/api/DownloadLastPunchData?Empcode=ALL&LastRecord=`;
  
  console.log(`URL: ${url}`);
  console.log(`Making request...`);
  
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${authToken}`,
    },
  };
  
  const req = https.request(url, options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Status Message: ${res.statusMessage}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`\nResponse Body:`);
      if (data) {
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(data);
        }
      } else {
        console.log('(empty response)');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`Error: ${error.message}`);
  });
  
  req.end();
}

// Test both sites
testSite(site67);

setTimeout(() => {
  testSite(site68);
}, 2000);

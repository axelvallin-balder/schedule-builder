const http = require('http');

function testAPI(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`\n=== ${method} ${path} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response:`, data);
        resolve({ status: res.statusCode, data: data });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error testing ${path}:`, err.message);
      console.log('Error code:', err.code);
      console.log('Error syscall:', err.syscall);
      console.log('Error details:', err);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ Timeout testing ${path}`);
      req.destroy();
    });

    req.end();
  });
}

async function runTests() {
  try {
    console.log('🔄 Testing backend server...');
    
    // Test health endpoint
    await testAPI('/health');
    
    // Test teachers API
    await testAPI('/api/teachers');
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

runTests();
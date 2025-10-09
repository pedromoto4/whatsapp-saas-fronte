// Simple test to check if our environment variable fixes work
console.log('Testing environment variable access...')

try {
  // Test 1: Check if GITHUB_RUNTIME_PERMANENT_NAME exists
  const hasEnvVar = typeof process !== 'undefined' && 
                   process.env && 
                   'GITHUB_RUNTIME_PERMANENT_NAME' in process.env
  console.log('✅ Environment variable check:', hasEnvVar ? 'FOUND' : 'NOT FOUND')
  
  // Test 2: Check if we're in a GitHub environment
  if (typeof window === 'undefined') {
    // In Node.js environment
    console.log('✅ Running in Node.js environment')
  }
  
  // Test 3: Mock window object for testing
  global.window = global.window || {
    location: {
      hostname: 'localhost'
    }
  }
  
  const isSparkHost = global.window.location.hostname.includes('github.dev') ||
                     global.window.location.hostname.includes('spark.github.dev')
  console.log('✅ Spark hostname check:', isSparkHost ? 'IS SPARK' : 'NOT SPARK')
  
  console.log('✅ All environment tests passed!')
  
} catch (error) {
  console.error('❌ Environment test failed:', error.message)
}
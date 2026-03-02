const { YouTubeTranscriptApi } = require('yt-transcript-api');

async function testRickRoll() {
  const videoId = 'dQw4w9WgXcQ';
  console.log(`Testing extraction for Rick Roll video: ${videoId}...`);
  
  try {
    const api = new YouTubeTranscriptApi();
    const result = await api.fetch(videoId);
    
    console.log('✅ Success!');
    console.log('\nFull result structure:');
    console.log(JSON.stringify(result, null, 2).substring(0, 500));
    
    if (Array.isArray(result)) {
      console.log(`\nResult is an array with ${result.length} items`);
      console.log('\nFirst 3 items:');
      console.log(JSON.stringify(result.slice(0, 3), null, 2));
    } else {
      console.log('\nResult keys:', Object.keys(result));
    }
  } catch (error) {
    console.error('❌ Extraction Failed!');
    console.error(error);
  }
}

testRickRoll();

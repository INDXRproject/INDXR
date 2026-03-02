const { YoutubeTranscript } = require('youtube-transcript');

const TEST_URL = 'https://youtu.be/gTOnEQ80W5U?si=guvOzkCYyoRfYuhY';

async function testExtraction() {
  console.log(`Testing extraction for: ${TEST_URL}`);
  
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(TEST_URL);
    console.log('Success!');
    console.log(`Transcript items: ${transcript.length}`);
    if (transcript.length > 0) {
      console.log('First line:', transcript[0].text);
    }
  } catch (error) {
    console.error('Extraction Failed!');
    console.error(error);
  }
}

testExtraction();

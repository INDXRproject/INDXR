
import { limiters } from '../src/lib/ratelimit';
import { isDisposableEmail } from '../src/utils/disposable-email';

async function testDisposableEmail() {
  console.log('\n--- Testing Disposable Email Check ---');
  
  const badEmail = 'test@guerrillamail.com';
  const goodEmail = 'test@gmail.com';
  
  console.log(`Checking ${badEmail}...`);
  const isBad = await isDisposableEmail(badEmail);
  console.log(`Result: ${isBad} (Expected: true)`);
  
  console.log(`Checking ${goodEmail}...`);
  const isGood = await isDisposableEmail(goodEmail);
  console.log(`Result: ${isGood} (Expected: false)`);
}

async function testRateLimit() {
  console.log('\n--- Testing Rate Limits ---');
  // Note: We can't easily mock Redis/Upstash connection here without running the app environment,
  // but we can check if the limiters are defined correctly.
  
  console.log('Login Limiter Configuration:');
  console.log((limiters.login as any).timeout); // Check internal props if possible, or just print keys
  
  console.log('Signup Limiter Configuration:');
  console.log((limiters.signup as any).timeout);
}

async function main() {
  await testDisposableEmail();
  // await testRateLimit(); // Redis might fail without env vars loaded properly in script
}

main().catch(console.error);

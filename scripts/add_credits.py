#!/usr/bin/env python3
"""Add test credits to user account"""

import sys
sys.path.insert(0, '/home/aladdin/Documents/Antigravity/INDXR.AI/backend')

import os
os.chdir('/home/aladdin/Documents/Antigravity/INDXR.AI/backend')

from dotenv import load_dotenv
load_dotenv('.env')

from credit_manager import add_credits
from supabase import create_client

# Get Supabase client
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

if not url or not key:
    print("Error: Environment variables not found")
    sys.exit(1)

supabase = create_client(url, key)

# Find user by email
try:
    # Query users table
    response = supabase.rpc('get_user_by_email', {'email': 'test3@example.com'}).execute()
    
    if not response.data:
        # Try alternative method
        print("Trying alternative query...")
        # We'll use the service key to query auth.users
        # This requires a custom RPC function or direct database access
        print("\nPlease run this SQL in Supabase SQL Editor:")
        print("SELECT id FROM auth.users WHERE email = 'test3@example.com';")
        print("\nThen run:")
        print("SELECT public.add_credits('USER_ID'::uuid, 100, 'Test credits');")
        sys.exit(0)
    
    user_id = response.data[0]['id']
    print(f"Found user: {user_id}")
    
    # Add credits
    result = add_credits(user_id, 100, 'Test credits for Whisper AI')
    print(f"Result: {result}")
    
    if result.get('success'):
        print(f"\n✅ Successfully added 100 credits!")
        print(f"Previous balance: {result.get('previous_balance')}")
        print(f"New balance: {result.get('new_balance')}")
    else:
        print(f"\n❌ Failed: {result.get('error')}")
        
except Exception as e:
    print(f"Error: {e}")
    print("\n📋 Manual SQL commands:")
    print("1. SELECT id FROM auth.users WHERE email = 'test3@example.com';")
    print("2. SELECT public.add_credits('USER_ID'::uuid, 100, 'Test credits');")

"""
Flush all caption-cache entries (pattern: caption:*) from Upstash Redis.

Usage:
  python3 scripts/flush_caption_cache.py             # show keys, prompt for confirmation
  python3 scripts/flush_caption_cache.py --dry-run   # show keys, do not delete
  python3 scripts/flush_caption_cache.py --yes        # delete without prompting

Requires: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in environment
or in backend/.env.

WARNING: deletes only keys matching 'caption:*'. Other keys (ARQ queue,
rate limits) are untouched. Verify the key list in --dry-run before deleting.
"""

import argparse
import os
import sys

from dotenv import load_dotenv
from upstash_redis import Redis

load_dotenv()


def build_client() -> Redis:
    url = os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        print("ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set.", file=sys.stderr)
        sys.exit(1)
    return Redis(url=url, token=token)


def scan_caption_keys(client: Redis) -> list[str]:
    keys: list[str] = []
    cursor = 0
    while True:
        cursor, batch = client.scan(cursor, match="caption:*", count=100)
        keys.extend(batch)
        if cursor == 0:
            break
    return keys


def main() -> None:
    parser = argparse.ArgumentParser(description="Flush caption:* keys from Upstash Redis.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", help="Show matching keys without deleting.")
    group.add_argument("--yes", "--confirm", action="store_true", help="Delete without prompting.")
    args = parser.parse_args()

    client = build_client()

    print("Scanning for caption:* keys...")
    keys = scan_caption_keys(client)

    if not keys:
        print("No caption:* keys found. Nothing to delete.")
        return

    print(f"\nFound {len(keys)} key(s):")
    for k in keys:
        print(f"  {k}")

    if args.dry_run:
        print("\n[dry-run] No keys deleted.")
        return

    if not args.yes:
        answer = input(f"\nDelete all {len(keys)} key(s)? Type 'yes' to confirm: ").strip().lower()
        if answer != "yes":
            print("Aborted. No keys deleted.")
            return

    deleted = client.delete(*keys)
    print(f"\nDeleted {deleted} key(s).")


if __name__ == "__main__":
    main()

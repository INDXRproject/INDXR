// Library-storage figures shown to users. The EFFECTIVE per-user limit is NOT this constant —
// it lives in the database (user_credits.library_bytes_cap + library_bytes_bonus), so it can vary
// per user once they buy space. This constant is only the BASE every account starts with, and the
// buy-space ratio; the account page reads the real cap from the DB.
//
// The real footprint counter is user_credits.library_bytes (octet_length of the
// transcript/edited_content/ai_summary/rag_exports jsonb, trigger-maintained — migration
// 20260711100400). The limit is ENFORCED before credit reservation (migration 20260723140000 +
// backend is_library_full check); a full library blocks new transcripts, existing ones are kept.

// Base free storage every account starts with (100 MiB). Also the size of one purchasable block.
export const LIBRARY_STORAGE_BASE_MB = 100
export const BYTES_PER_MB = 1024 * 1024

// Credit-sink (ADR-078): buy permanent extra space in 100 MiB blocks for 100 credits each
// (1 credit = 1 MB). Kept in lockstep with purchase_library_space in the DB.
export const STORAGE_BLOCK_MB = 100
export const STORAGE_BLOCK_COST_CREDITS = 100

// Hard cap: base 100 MiB + at most 4 bought blocks (400 MiB bonus) = 500 MiB total. Enforced
// authoritatively by purchase_library_space (migration 20260724013956); the UI disables the buy
// button at the cap. Kept in lockstep with v_max_bonus in the DB.
export const LIBRARY_STORAGE_MAX_MB = 500
export const STORAGE_MAX_UPGRADES = 4

// Deprecated alias — kept so nothing that imported the old name breaks. Prefer the DB cap.
export const LIBRARY_STORAGE_LIMIT_MB = LIBRARY_STORAGE_BASE_MB

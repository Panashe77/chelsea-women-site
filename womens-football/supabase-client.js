// ============================================
// Supabase client — shared by every page
// ============================================
// Uses the PUBLISHABLE key (sb_publishable_...), which is safe in browser code
// because Row Level Security policies control what it can actually do.
//
// NEVER put the secret key (sb_secret_...) in any file that ships to the browser.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ujvvujfkxpwzxywqqtdm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Swzl2A5oUC9pJABlKH4Chw_vUt8bOzV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/**
 * Supabase client configuration helpers with defensive URL validation.
 * Ensures the app never crashes with "Invalid supabaseUrl" if a non-URL token or empty string is passed.
 */

export function getSafeSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw;
  }
  return 'https://fqcbhmkcannaqdwarbel.supabase.co';
}

export function getSafeSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
  );
}

import { createClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

if (!authUrl || !dataApiUrl) {
  throw new Error(
    "Configuration Neon incomplete. Renseignez VITE_NEON_AUTH_URL et VITE_NEON_DATA_API_URL dans .env.local."
  );
}

export const neon = createClient({
  auth: {
    url: authUrl,
    adapter: SupabaseAuthAdapter(),
  },
  dataApi: {
    url: dataApiUrl,
  },
});


// Client Better Auth natif reserve aux operations qui n'existent pas dans
// l'API de compatibilite Supabase, notamment la reinitialisation par token.
export const neonPasswordAuth = createClient({
  auth: {
    url: authUrl,
  },
  dataApi: {
    url: dataApiUrl,
  },
});

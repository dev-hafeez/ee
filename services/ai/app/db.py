from supabase import Client, create_client

from app.config import settings


_client: Client | None = None

def get_supabase_client() -> Client:
    global _client
    if _client is not None:
        return _client
    url = settings.effective_supabase_url
    if not url or not settings.supabase_service_role_key:
        raise ValueError("Supabase URL and Service Role Key must be set.")
    _client = create_client(url, settings.supabase_service_role_key)
    return _client

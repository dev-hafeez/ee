from supabase import Client, create_client

from app.config import settings


def get_supabase_client() -> Client:
    url = settings.effective_supabase_url
    if not url or not settings.supabase_service_role_key:
        raise ValueError("Supabase URL and Service Role Key must be set.")
    return create_client(url, settings.supabase_service_role_key)

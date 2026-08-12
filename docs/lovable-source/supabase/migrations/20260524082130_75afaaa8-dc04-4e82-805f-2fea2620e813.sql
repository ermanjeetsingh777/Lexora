
revoke execute on function public.has_role(uuid, app_role) from public, anon, authenticated;
revoke execute on function public.owns_institution(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

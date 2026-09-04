-- Permanent local/CI posture assertions. Run with the Supabase database role.
do $$ declare n integer; begin
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if n <> 0 then raise exception 'PUBLIC_TABLES_WITHOUT_RLS:%', n; end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public'
    and grantee in ('anon', 'public') and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')) then
    raise exception 'UNINTENDED_PUBLIC_TABLE_PRIVILEGE';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public'
    and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE','DELETE')) then
    raise exception 'UNINTENDED_AUTHENTICATED_DIRECT_WRITE';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.prosecdef
    and (has_function_privilege('public', p.oid, 'EXECUTE') or has_function_privilege('anon', p.oid, 'EXECUTE')
      or (has_function_privilege('authenticated', p.oid, 'EXECUTE') and p.proname not in
        ('product_create_account','product_create_business','product_create_connection','product_request_account_deletion','product_transition_connection')))) then
    raise exception 'UNINTENDED_SECURITY_DEFINER_EXECUTE';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public'
    and table_name in (select table_name from information_schema.views where table_schema = 'public')
    and grantee in ('anon', 'public')) then raise exception 'UNSAFE_PUBLIC_VIEW'; end if;
end $$;

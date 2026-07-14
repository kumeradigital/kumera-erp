-- REEMPLAZAR antes de ejecutar: UUID_AUTH debe ser un usuario existente en auth.users.
do $$
declare
  v_user uuid := 'UUID_AUTH';
  v_business uuid := gen_random_uuid();
  v_ledger uuid := gen_random_uuid();
  v_rent_category uuid := gen_random_uuid();
  v_deposit_category uuid := gen_random_uuid();
begin
  insert into public.profiles (id,email,display_name,is_superadmin)
  select id,email,'Administrador KUMERA',true from auth.users where id=v_user
  on conflict (id) do update set is_superadmin=true,active=true;

  insert into public.businesses (id,name,currency,timezone) values (v_business,'Kumera Panadería','CLP','America/Santiago');
  insert into public.business_admins (business_id,user_id,assigned_by) values (v_business,v_user,v_user);
  insert into public.opening_ledgers (id,business_id,name) values (v_ledger,v_business,'Apertura inicial');
  insert into public.categories (id,business_id,name,position) values
    (v_rent_category,v_business,'Arriendo',0),(v_deposit_category,v_business,'Garantía',1);

  insert into public.opening_entries
    (ledger_id,business_id,entry_date,description,category_id,type,tax_mode,tax_rate,net_amount,tax_amount,total_amount,created_by,updated_by)
  values
    (v_ledger,v_business,current_date,'Capital inicial disponible',null,'initial_capital','exempt',0,5123000,0,5123000,v_user,v_user),
    (v_ledger,v_business,current_date,'Primer mes de arriendo',v_rent_category,'expense','exempt',0,675000,0,675000,v_user,v_user),
    (v_ledger,v_business,current_date,'Mes de garantía del local',v_deposit_category,'deposit','exempt',0,675000,0,675000,v_user,v_user);
end $$;

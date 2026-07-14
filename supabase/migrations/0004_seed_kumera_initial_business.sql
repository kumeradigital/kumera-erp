-- Applied remotely through Supabase MCP. Idempotent for the assigned administrator.
do $$
declare v_user uuid := '13cd8c0d-5c1d-4819-bf08-ff34b9123747'; v_business uuid; v_ledger uuid; v_rent uuid; v_guarantee uuid;
begin
  update public.profiles set is_superadmin=true,active=true where id=v_user;
  select business_id into v_business from public.business_admins where user_id=v_user and active limit 1;
  if v_business is null then
    insert into public.businesses(name,currency,timezone) values('Kumera Panadería','CLP','America/Santiago') returning id into v_business;
    insert into public.business_admins(business_id,user_id,assigned_by) values(v_business,v_user,v_user);
    insert into public.opening_ledgers(business_id,name) values(v_business,'Apertura inicial') returning id into v_ledger;
    insert into public.categories(business_id,name,position) select v_business,name,ord from unnest(array['Arriendo','Garantía','Remodelación','Maquinaria','Equipamiento','Instalaciones','Permisos','Marketing','Insumos iniciales','Transporte','Servicios profesionales','Otros']) with ordinality as t(name,ord);
    select id into v_rent from public.categories where business_id=v_business and name='Arriendo';
    select id into v_guarantee from public.categories where business_id=v_business and name='Garantía';
    insert into public.opening_entries(ledger_id,business_id,entry_date,description,category_id,type,tax_mode,tax_rate,net_amount,tax_amount,total_amount,created_by,updated_by) values
      (v_ledger,v_business,current_date,'Capital inicial disponible',null,'initial_capital','exempt',0,5123000,0,5123000,v_user,v_user),
      (v_ledger,v_business,current_date,'Primer mes de arriendo',v_rent,'expense','exempt',0,675000,0,675000,v_user,v_user),
      (v_ledger,v_business,current_date,'Mes de garantía del local',v_guarantee,'deposit','exempt',0,675000,0,675000,v_user,v_user);
  end if;
end $$;

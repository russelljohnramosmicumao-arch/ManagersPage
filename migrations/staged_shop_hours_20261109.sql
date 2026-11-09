-- Kape Bar-Rio Shop & Hours: REVIEW AND APPLY BEFORE MERGING FRONTEND BRANCHES.
-- Preserves existing operating hours and preorder windows; no shop status is changed by this file.
create table if not exists public.kbr_shop_settings(
 id integer primary key check(id=1),
 revision bigint not null default 1,
 settings jsonb not null,
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.kbr_shop_settings enable row level security;
revoke all on public.kbr_shop_settings from anon,authenticated;
insert into public.kbr_shop_settings(id,settings)
values(1,'{
 "timezone":"Asia/Manila","mode":"automatic","override_until":null,
 "online_enabled":true,"delivery_enabled":true,"pickup_enabled":true,"advance_enabled":true,
 "advance_days":7,"advance_notice_minutes":30,
 "pickup_start_offset_minutes":30,"delivery_start_offset_minutes":30,"weekend_delivery_start_offset_minutes":60,
 "pickup_cutoff_minutes":15,"delivery_cutoff_minutes":30,
 "schedule":[
 {"day":1,"open":"11:00","close":"23:00","closed":false},
 {"day":2,"open":"11:00","close":"23:00","closed":false},
 {"day":3,"open":"11:00","close":"23:00","closed":false},
 {"day":4,"open":"11:00","close":"23:00","closed":false},
 {"day":5,"open":"11:00","close":"23:00","closed":false},
 {"day":6,"open":"15:00","close":"23:00","closed":false},
 {"day":7,"open":"15:00","close":"23:00","closed":false}
 ],
 "special_dates":[]
}'::jsonb) on conflict(id) do nothing;

create table if not exists public.kbr_shop_settings_history(
 id bigint generated always as identity primary key,
 revision bigint not null,
 changed_at timestamptz not null default now(),
 changed_by uuid not null,
 previous_settings jsonb not null,
 next_settings jsonb not null
);
alter table public.kbr_shop_settings_history enable row level security;
revoke all on public.kbr_shop_settings_history from anon,authenticated;

create or replace function public.kbr_shop_hours_snapshot()
returns jsonb language sql stable security definer set search_path to ''
as $function$
 select jsonb_build_object(
 'revision',s.revision,'settings',s.settings,'updatedAt',s.updated_at,
 'operationalOpen',exists(select 1 from public.kbr_shifts t where t.status='open')
 )
 from public.kbr_shop_settings s where s.id=1;
$function$;
revoke all on function public.kbr_shop_hours_snapshot() from public;
grant execute on function public.kbr_shop_hours_snapshot() to anon,authenticated;

create or replace function public.kbr_manager_shop_hours_history(p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
begin
 if auth.uid() is null or not coalesce(public.kbr_management_access(),false) then raise exception 'Manager access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
 'revision',h.revision,'changedAt',h.changed_at,'changedBy',h.changed_by,
 'previous',h.previous_settings,'next',h.next_settings) order by h.changed_at desc),'[]'::jsonb)
 from (select * from public.kbr_shop_settings_history order by id desc limit greatest(1,least(p_limit,100))) h);
end;
$function$;
revoke all on function public.kbr_manager_shop_hours_history(integer) from public,anon;
grant execute on function public.kbr_manager_shop_hours_history(integer) to authenticated;

create or replace function public.kbr_manager_save_shop_hours(p_settings jsonb,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
 v_previous jsonb;
 v_revision bigint;
 v_day jsonb;
 v_special jsonb;
 v_key text;
 v_offset integer;
 v_expiry timestamptz;
begin
 if auth.uid() is null or not coalesce(public.kbr_management_access(),false) then raise exception 'Manager access required';end if;
 if jsonb_typeof(p_settings) is distinct from 'object' then raise exception 'Settings must be an object';end if;
 if p_settings->>'timezone' is distinct from 'Asia/Manila' then raise exception 'Only Asia/Manila timezone is supported';end if;
 if coalesce(p_settings->>'mode','') not in ('automatic','open','closed') then raise exception 'Invalid shop override mode';end if;
 if jsonb_typeof(p_settings->'schedule') is distinct from 'array' or jsonb_array_length(p_settings->'schedule')<>7 then raise exception 'Provide all seven weekly schedules';end if;
 if jsonb_typeof(p_settings->'special_dates') is distinct from 'array' or jsonb_array_length(p_settings->'special_dates')>60 then raise exception 'Too many special dates';end if;
 for v_key in select unnest(array['online_enabled','pickup_enabled','delivery_enabled','advance_enabled']) loop
   if jsonb_typeof(p_settings->v_key) is distinct from 'boolean' then raise exception 'Invalid setting: %',v_key;end if;
 end loop;
 for v_key in select unnest(array['advance_days','advance_notice_minutes','pickup_start_offset_minutes',
 'delivery_start_offset_minutes','weekend_delivery_start_offset_minutes','pickup_cutoff_minutes','delivery_cutoff_minutes']) loop
   if coalesce(p_settings->>v_key,'') !~ '^[0-9]{1,3}$' then raise exception 'Invalid timing setting: %',v_key;end if;
   v_offset:=(p_settings->>v_key)::integer;
   if v_offset>180 or (v_key='advance_days' and v_offset>30) then raise exception 'Timing outside supported range';end if;
 end loop;
 if (p_settings->>'advance_days')::integer<1 then raise exception 'Advance bookings must span at least one day';end if;
 -- Overnight trading windows need a separate cross-day checkout implementation;
 -- prohibit them until that workflow is tested end-to-end.
 if exists(select 1 from jsonb_array_elements(p_settings->'schedule') d
  where (d->>'closed')::boolean=false and (d->>'close')::time <= (d->>'open')::time)
 then raise exception 'For now, closing hours must be later than opening hours'; end if;

 for v_day in select value from jsonb_array_elements(p_settings->'schedule') loop
   if coalesce(v_day->>'day','') !~ '^[1-7]      or coalesce(v_day->>'open','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(v_day->>'close','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   then raise exception 'Invalid weekly day or hours';end if;
 end loop;
 if (select count(distinct (d->>'day')::integer) from jsonb_array_elements(p_settings->'schedule') d)<>7
 then raise exception 'Each weekday must be configured once';end if;
 for v_special in select value from jsonb_array_elements(p_settings->'special_dates') loop
   if coalesce(v_special->>'date','') !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
       or jsonb_typeof(v_special->'closed') is distinct from 'boolean'
       or char_length(coalesce(v_special->>'reason',''))>100
   then raise exception 'Invalid special date';end if;
   if coalesce((v_special->>'closed')::boolean,false)=false
      and (v_special->>'close')::time <= (v_special->>'open')::time
   then raise exception 'Special hours must close after opening'; end if;
   if coalesce((v_special->>'closed')::boolean,false)=false and (
    coalesce(v_special->>'open','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or
    coalesce(v_special->>'close','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   ) then raise exception 'Special opening hours are required';end if;
 end loop;
 if (select count(distinct d->>'date') from jsonb_array_elements(p_settings->'special_dates') d)
    <>jsonb_array_length(p_settings->'special_dates') then raise exception 'Duplicate special dates';end if;
 if p_settings->>'mode' in ('open','closed') then
   if nullif(p_settings->>'override_until','') is null then raise exception 'A manual override needs an expiry time';end if;
   v_expiry:=(p_settings->>'override_until')::timestamptz;
   if v_expiry<=clock_timestamp() or v_expiry>clock_timestamp()+interval '7 days'
   then raise exception 'Override expiry must be within the next 7 days';end if;
 end if;
 select settings,revision into v_previous,v_revision from public.kbr_shop_settings where id=1 for update;
 if v_revision is distinct from p_expected_revision then
   return jsonb_build_object('conflict',true,'revision',v_revision);
 end if;
 update public.kbr_shop_settings set
   settings=p_settings,revision=revision+1,updated_at=clock_timestamp(),updated_by=auth.uid()
 where id=1 returning revision into v_revision;
 insert into public.kbr_shop_settings_history(revision,changed_by,previous_settings,next_settings)
 values(v_revision,auth.uid(),v_previous,p_settings);
 return jsonb_build_object('ok',true,'revision',v_revision);
end;
$function$;
revoke all on function public.kbr_manager_save_shop_hours(jsonb,bigint) from public,anon;
grant execute on function public.kbr_manager_save_shop_hours(jsonb,bigint) to authenticated;

-- Shared scheduling decision, reuses actual cashier shift status for immediate orders.
create or replace function public.kbr_shop_order_decision(p_service text,p_requested timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
 cfg jsonb; day_cfg jsonb; exception_cfg jsonb;
 local_time timestamp; target_local timestamp; target_date date; day_number integer;
 start_min integer; end_min integer; effective_start integer; effective_end integer; desired_min integer;
 is_open boolean; mode text; override_on boolean; start_offset integer; cutoff integer;
begin
 select settings into cfg from public.kbr_shop_settings where id=1;
 if cfg is null then raise exception 'Shop settings are unavailable';end if;
 if p_service not in ('pickup','delivery') then return jsonb_build_object('allowed',false,'reason','Invalid order service');end if;
 if not coalesce((cfg->>'online_enabled')::boolean,false) then return jsonb_build_object('allowed',false,'reason','Online ordering is paused');end if;
 if not coalesce((cfg->>(p_service||'_enabled'))::boolean,false) then return jsonb_build_object('allowed',false,'reason','This order service is unavailable');end if;
 local_time:=clock_timestamp() at time zone 'Asia/Manila';
 mode:=cfg->>'mode';
 override_on:=mode in ('open','closed') and nullif(cfg->>'override_until','') is not null
     and (cfg->>'override_until')::timestamptz>clock_timestamp();
 if override_on and mode='closed' then return jsonb_build_object('allowed',false,'reason','Shop temporarily closed');end if;
 select exists(select 1 from public.kbr_shifts where status='open') into is_open;
 if p_requested is null then
  if not is_open then return jsonb_build_object('allowed',false,'reason','Shop is not open yet; choose an advance order');end if;
  if not (override_on and mode='open') then
    target_local:=local_time;
    day_number:=extract(isodow from target_local)::integer;
    select x into day_cfg from jsonb_array_elements(cfg->'schedule') x where (x->>'day')::integer=day_number;
    select x into exception_cfg from jsonb_array_elements(cfg->'special_dates') x where x->>'date'=target_local::date::text;
    if exception_cfg is not null then day_cfg:=exception_cfg;end if;
    if coalesce((day_cfg->>'closed')::boolean,false) then return jsonb_build_object('allowed',false,'reason','Shop is closed today');end if;
    start_min:=split_part(day_cfg->>'open',':',1)::integer*60+split_part(day_cfg->>'open',':',2)::integer;
    end_min:=split_part(day_cfg->>'close',':',1)::integer*60+split_part(day_cfg->>'close',':',2)::integer;
    if end_min<=start_min then return jsonb_build_object('allowed',false,'reason','Overnight service hours are not yet supported');end if;
    desired_min:=extract(hour from target_local)::integer*60+extract(minute from target_local)::integer;
    -- Overnight windows can cross midnight; the production rollout must verify such schedules first.
    if end_min>start_min and (desired_min<start_min or desired_min>end_min) then
      return jsonb_build_object('allowed',false,'reason','Outside operating hours');
    end if;
  end if;
  return jsonb_build_object('allowed',true,'type','immediate');
 end if;
 if not coalesce((cfg->>'advance_enabled')::boolean,false) then
   return jsonb_build_object('allowed',false,'reason','Advance ordering is disabled');
 end if;
 target_local:=p_requested at time zone 'Asia/Manila';
 if p_requested<clock_timestamp()+make_interval(mins => coalesce((cfg->>'advance_notice_minutes')::integer,30))
 then return jsonb_build_object('allowed',false,'reason','Please select a later time');end if;
 if p_requested>clock_timestamp()+make_interval(days => coalesce((cfg->>'advance_days')::integer,7))
 then return jsonb_build_object('allowed',false,'reason','Requested date is too far ahead');end if;
 day_number:=extract(isodow from target_local)::integer;
 select x into day_cfg from jsonb_array_elements(cfg->'schedule') x where (x->>'day')::integer=day_number;
 select x into exception_cfg from jsonb_array_elements(cfg->'special_dates') x where x->>'date'=target_local::date::text;
 if exception_cfg is not null then day_cfg:=exception_cfg;end if;
 if coalesce((day_cfg->>'closed')::boolean,false) then
  return jsonb_build_object('allowed',false,'reason','Closed on the selected date');
 end if;
 start_min:=split_part(day_cfg->>'open',':',1)::integer*60+split_part(day_cfg->>'open',':',2)::integer;
 end_min:=split_part(day_cfg->>'close',':',1)::integer*60+split_part(day_cfg->>'close',':',2)::integer;
 if end_min<=start_min then return jsonb_build_object('allowed',false,'reason','Overnight service hours are not yet supported');end if;
 start_offset:=case when p_service='delivery' and day_number in (6,7)
  then (cfg->>'weekend_delivery_start_offset_minutes')::integer
  when p_service='delivery' then (cfg->>'delivery_start_offset_minutes')::integer
  else (cfg->>'pickup_start_offset_minutes')::integer end;
 cutoff:=coalesce((cfg->>(p_service||'_cutoff_minutes'))::integer,0);
 effective_start:=start_min+start_offset;
 effective_end:=end_min-cutoff;
 desired_min:=extract(hour from target_local)::integer*60+extract(minute from target_local)::integer;
 if effective_end<effective_start or desired_min<effective_start or desired_min>effective_end then
  return jsonb_build_object('allowed',false,'reason','Please select a time within the available service hours',
   'earliest',lpad((effective_start/60)::text,2,'0') || ':' || lpad((effective_start%60)::text,2,'0'),
   'latest',lpad((effective_end/60)::text,2,'0') || ':' || lpad((effective_end%60)::text,2,'0'));
 end if;
 return jsonb_build_object('allowed',true,'type','scheduled');
end;
$function$;
revoke all on function public.kbr_shop_order_decision(text,timestamptz) from public;
grant execute on function public.kbr_shop_order_decision(text,timestamptz) to anon,authenticated;

-- Enforce on all online submissions; this is stronger than hiding UI buttons.
create or replace function public.kbr_validate_online_order_schedule()
returns trigger language plpgsql set search_path to ''
as $function$
declare decision jsonb;
begin
 decision:=public.kbr_shop_order_decision(new.service_type,new.requested_pickup_at);
 if coalesce((decision->>'allowed')::boolean,false)=false then
  raise exception '%',coalesce(decision->>'reason','Online ordering unavailable');
 end if;
 return new;
end;
$function$;

-- Include public shop settings in the existing customer menu snapshot.
create or replace function public.kbr_online_menu_snapshot()
returns jsonb language sql stable security definer set search_path to ''
as $function$
 select jsonb_build_object(
  'revision',m.revision,
  'shopOpen',exists(select 1 from public.kbr_shifts s where s.status='open'),
  'shopSettings',public.kbr_shop_hours_snapshot(),
  'items',coalesce((
   select jsonb_agg(jsonb_build_object(
    'productId',i->>'productId','name',i->>'name','category',i->>'category',
    'image',i->>'image','food',coalesce((i->>'food')::boolean,false),
    'availability',coalesce(i->>'availability','available'),
    'sizes',coalesce(i->'sizes','[]'::jsonb),
    'prices',coalesce(i->'prices','[]'::jsonb),
    'premium',i->'premium','premiumSizes',i->'premiumSizes',
    'sizeUnavailable',coalesce(i->'sizeUnavailable','{}'::jsonb))
   order by i->>'category',i->>'name')
   from jsonb_array_elements(m.items) i
   where coalesce(i->>'availability','available')='available'
  ),'[]'::jsonb)
 ) from public.kbr_menu m where m.id=1;
$function$;
-- No GRANT changes for the existing public online menu snapshot.

      or jsonb_typeof(v_day->'closed') is distinct from 'boolean'
      or coalesce(v_day->>'open','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(v_day->>'close','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   then raise exception 'Invalid weekly day or hours';end if;
 end loop;
 if (select count(distinct (d->>'day')::integer) from jsonb_array_elements(p_settings->'schedule') d)<>7
 then raise exception 'Each weekday must be configured once';end if;
 for v_special in select value from jsonb_array_elements(p_settings->'special_dates') loop
   if coalesce(v_special->>'date','') !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'
       or jsonb_typeof(v_special->'closed') is distinct from 'boolean'
       or char_length(coalesce(v_special->>'reason',''))>100
   then raise exception 'Invalid special date';end if;
   if coalesce((v_special->>'closed')::boolean,false)=false
      and (v_special->>'close')::time <= (v_special->>'open')::time
   then raise exception 'Special hours must close after opening'; end if;
   if coalesce((v_special->>'closed')::boolean,false)=false and (
    coalesce(v_special->>'open','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or
    coalesce(v_special->>'close','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   ) then raise exception 'Special opening hours are required';end if;
 end loop;
 if (select count(distinct d->>'date') from jsonb_array_elements(p_settings->'special_dates') d)
    <>jsonb_array_length(p_settings->'special_dates') then raise exception 'Duplicate special dates';end if;
 if p_settings->>'mode' in ('open','closed') then
   if nullif(p_settings->>'override_until','') is null then raise exception 'A manual override needs an expiry time';end if;
   v_expiry:=(p_settings->>'override_until')::timestamptz;
   if v_expiry<=clock_timestamp() or v_expiry>clock_timestamp()+interval '7 days'
   then raise exception 'Override expiry must be within the next 7 days';end if;
 end if;
 select settings,revision into v_previous,v_revision from public.kbr_shop_settings where id=1 for update;
 if v_revision is distinct from p_expected_revision then
   return jsonb_build_object('conflict',true,'revision',v_revision);
 end if;
 update public.kbr_shop_settings set
   settings=p_settings,revision=revision+1,updated_at=clock_timestamp(),updated_by=auth.uid()
 where id=1 returning revision into v_revision;
 insert into public.kbr_shop_settings_history(revision,changed_by,previous_settings,next_settings)
 values(v_revision,auth.uid(),v_previous,p_settings);
 return jsonb_build_object('ok',true,'revision',v_revision);
end;
$function$;
revoke all on function public.kbr_manager_save_shop_hours(jsonb,bigint) from public,anon;
grant execute on function public.kbr_manager_save_shop_hours(jsonb,bigint) to authenticated;

-- Shared scheduling decision, reuses actual cashier shift status for immediate orders.
create or replace function public.kbr_shop_order_decision(p_service text,p_requested timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
 cfg jsonb; day_cfg jsonb; exception_cfg jsonb;
 local_time timestamp; target_local timestamp; target_date date; day_number integer;
 start_min integer; end_min integer; effective_start integer; effective_end integer; desired_min integer;
 is_open boolean; mode text; override_on boolean; start_offset integer; cutoff integer;
begin
 select settings into cfg from public.kbr_shop_settings where id=1;
 if cfg is null then raise exception 'Shop settings are unavailable';end if;
 if p_service not in ('pickup','delivery') then return jsonb_build_object('allowed',false,'reason','Invalid order service');end if;
 if not coalesce((cfg->>'online_enabled')::boolean,false) then return jsonb_build_object('allowed',false,'reason','Online ordering is paused');end if;
 if not coalesce((cfg->>(p_service||'_enabled'))::boolean,false) then return jsonb_build_object('allowed',false,'reason','This order service is unavailable');end if;
 local_time:=clock_timestamp() at time zone 'Asia/Manila';
 mode:=cfg->>'mode';
 override_on:=mode in ('open','closed') and nullif(cfg->>'override_until','') is not null
     and (cfg->>'override_until')::timestamptz>clock_timestamp();
 if override_on and mode='closed' then return jsonb_build_object('allowed',false,'reason','Shop temporarily closed');end if;
 select exists(select 1 from public.kbr_shifts where status='open') into is_open;
 if p_requested is null then
  if not is_open then return jsonb_build_object('allowed',false,'reason','Shop is not open yet; choose an advance order');end if;
  if not (override_on and mode='open') then
    target_local:=local_time;
    day_number:=extract(isodow from target_local)::integer;
    select x into day_cfg from jsonb_array_elements(cfg->'schedule') x where (x->>'day')::integer=day_number;
    select x into exception_cfg from jsonb_array_elements(cfg->'special_dates') x where x->>'date'=target_local::date::text;
    if exception_cfg is not null then day_cfg:=exception_cfg;end if;
    if coalesce((day_cfg->>'closed')::boolean,false) then return jsonb_build_object('allowed',false,'reason','Shop is closed today');end if;
    start_min:=split_part(day_cfg->>'open',':',1)::integer*60+split_part(day_cfg->>'open',':',2)::integer;
    end_min:=split_part(day_cfg->>'close',':',1)::integer*60+split_part(day_cfg->>'close',':',2)::integer;
    if end_min<=start_min then return jsonb_build_object('allowed',false,'reason','Overnight service hours are not yet supported');end if;
    desired_min:=extract(hour from target_local)::integer*60+extract(minute from target_local)::integer;
    -- Overnight windows can cross midnight; the production rollout must verify such schedules first.
    if end_min>start_min and (desired_min<start_min or desired_min>end_min) then
      return jsonb_build_object('allowed',false,'reason','Outside operating hours');
    end if;
  end if;
  return jsonb_build_object('allowed',true,'type','immediate');
 end if;
 if not coalesce((cfg->>'advance_enabled')::boolean,false) then
   return jsonb_build_object('allowed',false,'reason','Advance ordering is disabled');
 end if;
 target_local:=p_requested at time zone 'Asia/Manila';
 if p_requested<clock_timestamp()+make_interval(mins => coalesce((cfg->>'advance_notice_minutes')::integer,30))
 then return jsonb_build_object('allowed',false,'reason','Please select a later time');end if;
 if p_requested>clock_timestamp()+make_interval(days => coalesce((cfg->>'advance_days')::integer,7))
 then return jsonb_build_object('allowed',false,'reason','Requested date is too far ahead');end if;
 day_number:=extract(isodow from target_local)::integer;
 select x into day_cfg from jsonb_array_elements(cfg->'schedule') x where (x->>'day')::integer=day_number;
 select x into exception_cfg from jsonb_array_elements(cfg->'special_dates') x where x->>'date'=target_local::date::text;
 if exception_cfg is not null then day_cfg:=exception_cfg;end if;
 if coalesce((day_cfg->>'closed')::boolean,false) then
  return jsonb_build_object('allowed',false,'reason','Closed on the selected date');
 end if;
 start_min:=split_part(day_cfg->>'open',':',1)::integer*60+split_part(day_cfg->>'open',':',2)::integer;
 end_min:=split_part(day_cfg->>'close',':',1)::integer*60+split_part(day_cfg->>'close',':',2)::integer;
 if end_min<=start_min then return jsonb_build_object('allowed',false,'reason','Overnight service hours are not yet supported');end if;
 start_offset:=case when p_service='delivery' and day_number in (6,7)
  then (cfg->>'weekend_delivery_start_offset_minutes')::integer
  when p_service='delivery' then (cfg->>'delivery_start_offset_minutes')::integer
  else (cfg->>'pickup_start_offset_minutes')::integer end;
 cutoff:=coalesce((cfg->>(p_service||'_cutoff_minutes'))::integer,0);
 effective_start:=start_min+start_offset;
 effective_end:=end_min-cutoff;
 desired_min:=extract(hour from target_local)::integer*60+extract(minute from target_local)::integer;
 if effective_end<effective_start or desired_min<effective_start or desired_min>effective_end then
  return jsonb_build_object('allowed',false,'reason','Please select a time within the available service hours',
   'earliest',lpad((effective_start/60)::text,2,'0') || ':' || lpad((effective_start%60)::text,2,'0'),
   'latest',lpad((effective_end/60)::text,2,'0') || ':' || lpad((effective_end%60)::text,2,'0'));
 end if;
 return jsonb_build_object('allowed',true,'type','scheduled');
end;
$function$;
revoke all on function public.kbr_shop_order_decision(text,timestamptz) from public;
grant execute on function public.kbr_shop_order_decision(text,timestamptz) to anon,authenticated;

-- Enforce on all online submissions; this is stronger than hiding UI buttons.
create or replace function public.kbr_validate_online_order_schedule()
returns trigger language plpgsql set search_path to ''
as $function$
declare decision jsonb;
begin
 decision:=public.kbr_shop_order_decision(new.service_type,new.requested_pickup_at);
 if coalesce((decision->>'allowed')::boolean,false)=false then
  raise exception '%',coalesce(decision->>'reason','Online ordering unavailable');
 end if;
 return new;
end;
$function$;

-- Include public shop settings in the existing customer menu snapshot.
create or replace function public.kbr_online_menu_snapshot()
returns jsonb language sql stable security definer set search_path to ''
as $function$
 select jsonb_build_object(
  'revision',m.revision,
  'shopOpen',exists(select 1 from public.kbr_shifts s where s.status='open'),
  'shopSettings',public.kbr_shop_hours_snapshot(),
  'items',coalesce((
   select jsonb_agg(jsonb_build_object(
    'productId',i->>'productId','name',i->>'name','category',i->>'category',
    'image',i->>'image','food',coalesce((i->>'food')::boolean,false),
    'availability',coalesce(i->>'availability','available'),
    'sizes',coalesce(i->'sizes','[]'::jsonb),
    'prices',coalesce(i->'prices','[]'::jsonb),
    'premium',i->'premium','premiumSizes',i->'premiumSizes',
    'sizeUnavailable',coalesce(i->'sizeUnavailable','{}'::jsonb))
   order by i->>'category',i->>'name')
   from jsonb_array_elements(m.items) i
   where coalesce(i->>'availability','available')='available'
  ),'[]'::jsonb)
 ) from public.kbr_menu m where m.id=1;
$function$;
-- No GRANT changes for the existing public online menu snapshot.

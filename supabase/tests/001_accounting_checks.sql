-- =====================================================================
-- BizLens database checks. Paste into the Supabase SQL Editor and Run.
-- Everything happens inside a transaction that is ROLLED BACK at the end,
-- so no test data is left behind. Success = "ALL CHECKS PASSED" notice.
-- =====================================================================
begin;

-- Two throwaway test users (removed again by the rollback)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner.a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'owner.b@test.local');

-- Act as user A, exactly like the app does
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

do $$
declare
  v_biz uuid; v_prod uuid; v_sale uuid; v_again uuid; v_dash jsonb;
  v_req uuid := gen_random_uuid(); v_qty numeric; v_avg numeric;
begin
  v_biz := public.create_business('Test Shop A');
  perform set_config('test.biz', v_biz::text, true);

  -- Product with opening stock 10 @ K40
  v_prod := public.add_product(v_biz, 'Lotion 500ml', 'LOT500', 'each', 60, 3, 10, 40);

  -- Receive 10 more @ K50 on credit -> weighted average becomes K45
  perform public.receive_stock(v_biz, current_date, 'Supplier X', 'INV-1', 'credit',
    jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 10, 'unit_cost', 50)), gen_random_uuid());
  select qty_on_hand, avg_cost into v_qty, v_avg from public.products where id = v_prod;
  assert v_qty = 20, 'qty after receipt should be 20, got ' || v_qty;
  assert v_avg = 45, 'average cost should be 45, got ' || v_avg;

  -- Sell 5 @ K60 for cash (the blueprint example: sales 300, cost 225, GP 75)
  v_sale := public.record_sale(v_biz, current_date, null, 'cash',
    jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 5, 'unit_price', 60)), v_req);

  -- Same request again (double click) must NOT create a second sale
  v_again := public.record_sale(v_biz, current_date, null, 'cash',
    jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 5, 'unit_price', 60)), v_req);
  assert v_again = v_sale, 'duplicate submission created a new sale';
  select qty_on_hand into v_qty from public.products where id = v_prod;
  assert v_qty = 15, 'qty after sale should be 15, got ' || v_qty;

  -- Credit sale of 2 to a customer
  perform public.record_sale(v_biz, current_date, 'Mrs Banda', 'credit',
    jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 2, 'unit_price', 60)), gen_random_uuid());

  -- Rent paid by mobile money
  perform public.record_expense(v_biz, current_date, 'Rent', 'November rent', 100, 'mobile_money', gen_random_uuid());

  -- Overselling must fail
  begin
    perform public.record_sale(v_biz, current_date, null, 'cash',
      jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 999, 'unit_price', 60)), gen_random_uuid());
    raise exception 'oversell was allowed';
  exception when others then
    assert sqlerrm like 'Not enough stock%', 'unexpected error: ' || sqlerrm;
  end;

  v_dash := public.dashboard_summary(v_biz, current_date - 30, current_date);
  assert (v_dash->>'sales')::numeric = 420,           'sales should be 420: ' || v_dash;
  assert (v_dash->>'cost_of_sales')::numeric = 315,   'cost of sales should be 315: ' || v_dash;
  assert (v_dash->>'expenses')::numeric = 100,        'expenses should be 100: ' || v_dash;
  assert (v_dash->>'receivables')::numeric = 120,     'receivables should be 120: ' || v_dash;
  assert (v_dash->>'payables')::numeric = 500,        'payables should be 500: ' || v_dash;
  assert (v_dash->>'inventory_value')::numeric = 585, 'inventory should be 585 (13 x 45): ' || v_dash;
  assert (v_dash->>'cash')::numeric = 200,            'cash should be 300 - 100 = 200: ' || v_dash;

  -- Every journal must balance, and the ledger must agree with stock records
  assert not exists (
    select 1 from public.journal_lines group by entry_id having sum(debit) <> sum(credit)
  ), 'an unbalanced journal exists';
  assert (select sum(quantity) from public.inventory_movements where product_id = v_prod) = 13,
    'movement ledger does not agree with stock on hand';

  -- Direct edits of stock are blocked (no update policy)
  update public.products set qty_on_hand = 1000 where id = v_prod;
  select qty_on_hand into v_qty from public.products where id = v_prod;
  assert v_qty = 13, 'a direct update changed stock!';
end $$;

-- Now act as user B: must see nothing of business A and cannot post to it
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.products) = 0, 'user B can see business A products!';
  assert (select count(*) from public.sales) = 0,    'user B can see business A sales!';
  begin
    perform public.record_expense(current_setting('test.biz')::uuid, current_date, 'Rent', 'hack', 1, 'cash', gen_random_uuid());
    raise exception 'user B posted into business A';
  exception when others then
    assert sqlerrm like 'Not allowed%', 'unexpected error: ' || sqlerrm;
  end;
  raise notice 'ALL CHECKS PASSED';
end $$;

rollback;

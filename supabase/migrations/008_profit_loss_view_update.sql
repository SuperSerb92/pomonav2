-- Extend profit_loss_daily view with columns matching the old Pomona app:
-- net_purchase_kg, total_revenue_eur, avg_price_rsd, avg_cost_price, expense_pct

create or replace view public.profit_loss_daily as
with rep_daily as (
  select
    user_id,
    repurchase_date                                      as rep_date,
    sum(income_rsd)::numeric(14,2)                      as income_rsd,
    sum(income_eur)::numeric(14,2)                      as income_eur,
    sum(coalesce(neto_shipped, neto))::numeric(14,3)    as net_kg
  from public.repurchase
  group by user_id, repurchase_date
)
select
  we.user_id,
  we.eval_date                                                              as report_date,
  count(distinct we.employee_id)::integer                                   as worker_count,
  sum(coalesce(we.no_of_boxes, 0))::integer                                 as total_boxes,
  (sum(coalesce(we.total, 0))
   + sum(coalesce(we.fuel, 0))
   + sum(coalesce(we.bonus, 0)))::numeric(14,2)                             as total_expenses,
  coalesce(rd.income_rsd, 0)::numeric(14,2)                                 as total_revenue,
  coalesce(rd.income_eur, 0)::numeric(14,2)                                 as total_revenue_eur,
  coalesce(rd.net_kg, 0)::numeric(14,3)                                     as net_purchase_kg,
  -- avg selling price = revenue / net kg purchased
  case when coalesce(rd.net_kg, 0) > 0
    then round(coalesce(rd.income_rsd, 0) / rd.net_kg, 2)
    else 0
  end::numeric(14,2)                                                         as avg_price_rsd,
  -- avg cost price = expenses / net kg purchased
  case when coalesce(rd.net_kg, 0) > 0
    then round(
      (sum(coalesce(we.total, 0)) + sum(coalesce(we.fuel, 0)) + sum(coalesce(we.bonus, 0)))
      / rd.net_kg, 2)
    else 0
  end::numeric(14,2)                                                         as avg_cost_price,
  -- profit = revenue - expenses
  (coalesce(rd.income_rsd, 0)
   - (sum(coalesce(we.total, 0)) + sum(coalesce(we.fuel, 0)) + sum(coalesce(we.bonus, 0))))::numeric(14,2)
                                                                              as profit,
  -- expense as % of revenue
  case when coalesce(rd.income_rsd, 0) > 0
    then round(
      (sum(coalesce(we.total, 0)) + sum(coalesce(we.fuel, 0)) + sum(coalesce(we.bonus, 0)))
      / rd.income_rsd * 100, 1)
    else 0
  end::numeric(10,1)                                                          as expense_pct
from public.work_evaluations we
left join rep_daily rd
       on rd.user_id = we.user_id
      and rd.rep_date = we.eval_date
group by we.user_id, we.eval_date, rd.income_rsd, rd.income_eur, rd.net_kg;

-- Work summary view per employee per day
create or replace view public.work_summary_by_employee as
select
  we.user_id,
  e.id          as employee_id,
  e.name || ' ' || e.surname as employee_full_name,
  we.eval_date,
  sum(we.neto)::numeric(12,3)           as total_neto,
  sum(we.no_of_boxes)::integer           as total_boxes,
  sum(we.total)::numeric(14,2)           as total_pay,
  round(avg(we.evaluation)::numeric, 2)  as avg_evaluation
from public.work_evaluations we
join public.employees e on e.id = we.employee_id
group by we.user_id, e.id, e.name, e.surname, we.eval_date;

-- Daily profit/loss view
create or replace view public.profit_loss_daily as
select
  we.user_id,
  we.eval_date                                                                  as report_date,
  count(distinct we.employee_id)::integer                                        as worker_count,
  sum(we.no_of_boxes)::integer                                                   as total_boxes,
  (sum(coalesce(we.total,0)) + sum(coalesce(we.fuel,0)) + sum(coalesce(we.bonus,0)))::numeric(14,2)
                                                                                 as total_expenses,
  coalesce((
    select sum(r.income_rsd)
    from public.repurchase r
    where r.user_id = we.user_id and r.repurchase_date = we.eval_date
  ), 0)::numeric(14,2)                                                           as total_revenue,
  (
    coalesce((
      select sum(r.income_rsd)
      from public.repurchase r
      where r.user_id = we.user_id and r.repurchase_date = we.eval_date
    ), 0)
    - (sum(coalesce(we.total,0)) + sum(coalesce(we.fuel,0)) + sum(coalesce(we.bonus,0)))
  )::numeric(14,2)                                                               as profit
from public.work_evaluations we
group by we.user_id, we.eval_date;

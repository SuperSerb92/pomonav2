-- Rename plot_list_name → plot_name in plot_lists table.
-- plot_lists now represents a Plot (parcel); plots represents Plot Parts (rows/sections within a parcel).
alter table public.plot_lists rename column plot_list_name to plot_name;

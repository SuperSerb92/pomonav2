# PomonaV2

A modern farm management SaaS application — rebuilt from the original Pomona (ASP.NET Core 3.1) into a full React + TypeScript + Supabase stack with subscription plans, interactive maps, and weather forecasts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| Forms & validation | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Maps | Leaflet + React-Leaflet + OpenStreetMap (free) |
| Weather | OpenWeatherMap API (free tier) |
| Barcodes | JsBarcode (CODE128, browser-based) |
| PDF export | jsPDF + jsPDF-AutoTable |
| Scale integration | Web Serial API (Chrome/Edge desktop) |
| Backend / Database | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Payments | Stripe (Checkout + Webhooks + Customer Portal) |
| Icons | Lucide React |

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary green | `#2EB88E` | Buttons, accents, active nav |
| Lavender | `#C4B5FD` | Business plan, secondary accents, barcode label header |
| Dark sidebar | `#1C1B2A` | Sidebar background (lavender-tinted) |
| Background | `#F8F9FA` | Page background |

---

## Subscription Tiers

| Feature | Free | Pro (€12/mo) | Business (€25/mo) |
|---|:---:|:---:|:---:|
| Employees (up to 5) | ✓ | ✓ | ✓ |
| Buyers, Cultures, Packaging, Plots | ✓ | ✓ | ✓ |
| Employees up to 50 | — | ✓ | ✓ |
| Barcode Generator + Reader + Storno | — | ✓ | ✓ |
| Work Evaluation | — | ✓ | ✓ |
| Repurchase tracking | — | ✓ | ✓ |
| Scheduler / Calendar | — | ✓ | ✓ |
| Unlimited employees | — | — | ✓ |
| Work Summary Reports + PDF export | — | — | ✓ |
| Profit & Loss Reports + PDF export | — | — | ✓ |
| Farm Map (on Dashboard) | — | — | ✓ |
| Weather Forecast (on Dashboard) | — | — | ✓ |

---

## What's Been Built

### All original Pomona features

- **Employees** — full CRUD with search and pagination (name, surname, phone, recommendation)
- **Buyers** — full CRUD (name, PIB/tax ID, JMBG, phone, address, city, email)
- **Cultures** — crop type management
- **Culture Types** — sub-types linked to each culture
- **Packaging** — container types with tara (empty weight) tracking
- **Plots** — parcel management with an integrated **Plot Parts** sub-table. Each Plot (parcel) can have multiple Plot Parts (rows/sections within the parcel). Managed on a single page: click any plot row to expand it and add/edit/delete its parts inline. Plot Parts are what gets assigned to a barcode at generation time.
- **Barcode** — three-tab page:
  - **Generator** — create barcodes with mandatory employee / culture / culture type / packaging / **plot part** assignments, a date picker (defaults to today, supports future dates), and a **quantity field** (1–99) to generate multiple unique barcodes in one go. After generation the dialog asks "Print now?" — yes opens the print modal immediately, no saves and closes. Print later from the table via the ⋯ menu (disabled for cancelled barcodes). Print labels: CODE128, 4.25"×2" thermal layout with lavender header showing farm name and origin, lot code, variety, worker, GGN. Checkbox selection for bulk storno. **Status filter** (All / Active / Cancelled) sits inline next to the search bar.
  - **Reader** — scan barcodes via a hardware scanner, enter Bruto weight manually (implicit 3-decimal input — type `1234` to get `1.234 kg`, no dot required) or read directly from a serial scale via the Web Serial API (9600/8N1, `P` command), Neto auto-calculated (Bruto − Tara); real-time save per row. Filter by employee, date, culture, or measured status. Date filter fetches from the DB for that specific date regardless of the default 4-day window. Checkbox selection for bulk operations.
  - **Storno** — history of all cancelled barcodes. Storno can be triggered from both the Generator and Reader tabs, individually or in bulk. **Smart storno logic:** if a barcode has been weighed (Measured = Yes), storno clears `bruto`/`neto` and automatically recalculates and updates the saved Work Evaluation for that employee and date, keeping reports accurate. If Measured = No, only the status is changed.
- **Work Evaluation** — daily employee performance tracking with star ratings (1–3), neto weight (auto-summed from barcode measurements), box count, pay per day, expense per kg, fuel, bonus, and totals. Total is always recalculated from the current barcode neto on load — so weighing new barcodes after a save is reflected immediately without manual re-entry.
- **Repurchase** — crop purchase records with dual-currency support (RSD + EUR), buyer and culture links. Live EUR/RSD rate fetched from the National Bank of Serbia (NBS) — choose between Srednji kurs or Prodajni kurs; Income (RSD/EUR) and Price (EUR) are auto-calculated when entering Price/kg (RSD). Totals footer row in the table (Neto, Net Purch., Difference, Boxes, Income RSD/EUR). Add/Edit dialog is scrollable on small screens.
- **Scheduler** — interactive monthly calendar with color-coded events, click-to-add, click-to-delete

### Authentication

- **Registration** — collects First Name, Last Name, email, password, farm name, and optional farm registration number. First/Last name are stored in the user profile.
- **Forgot password** — user requests a reset link by email (`/forgot-password`). Clicking the link redirects through `/auth/callback` which detects `type=recovery` and forwards to `/reset-password`. The reset page accepts a new password with confirmation and calls `supabase.auth.updateUser()`.

### New features (not in original Pomona)

- **Dashboard** — live stat cards (employee/buyer/culture counts), Farm Map with weather popup on marker, and 5-day weather forecast — all on one page (Business tier)
- **Farm Map** — Leaflet + OpenStreetMap embedded on the dashboard. Marker popup shows today's weather (icon, temp range, condition, humidity, wind). Coordinates set in Settings.
- **Weather Forecast** — 5-day forecast from OpenWeatherMap shown on the dashboard. Shows temperature (min/max), condition, humidity, and wind speed per day.
- **PDF export** — Export to PDF on Work Summary, Profit & Loss, and Purchase Summary report pages. Portrait for Work Summary, landscape for the others. Includes totals footer rows. Star ratings exported as `*` characters (font-safe).
- **Serial scale integration** — Web Serial API in the Barcode Reader tab. Connect to any scale on a COM port (9600 baud, 8N1). Click the scale icon on a row to send the `P` command and auto-fill Bruto weight. Requires Chrome or Edge on desktop.
- **Subscription system** — Three-tier pricing (Free / Pro / Business) with:
  - Stripe Checkout for payments
  - Stripe Webhooks to automatically provision plan upgrades
  - Stripe Customer Portal for self-serve plan management (upgrade, downgrade, cancel)
  - Feature gating — locked pages show an upgrade prompt instead of content
  - Sidebar lock icons on gated sections

### Settings

- **Farm Profile** — farm name, registration number, GGN (GlobalG.A.P. Number), origin country, and GPS coordinates (used for Map & Weather). GGN and Origin are printed on barcode labels.
- **Account** — editable first name and last name; read-only email; billing management link for Stripe customers.

### Reports (Business tier)

- **Work Summary** — aggregated work evaluation data by employee and date range, with a Recharts bar chart (Neto vs Pay per employee); PDF export
- **Profit & Loss** — daily revenue vs expenses vs profit, with a ComposedChart and summary KPI cards (Total Revenue, Total Expenses, Net Profit, **Avg Selling Price** for the period); PDF export (landscape)
- **Purchase Summary** — full repurchase history by date range with payment tracking (paid/unpaid toggle per row), income by buyer chart, and a totals footer row (Neto, Net Purch., Boxes, Price/kg, Income RSD/EUR); PDF export (landscape)

---

## Project Structure

```
PomonaV2/
├── src/
│   ├── components/
│   │   ├── layout/          # AppLayout, Sidebar, Header, PageContainer
│   │   ├── ui/              # shadcn/ui components (Button, Card, Dialog, Tabs, Checkbox, etc.)
│   │   ├── shared/          # DataTable, PageHeader, EmptyState, DeleteConfirmDialog, StatCard
│   │   ├── maps/            # FarmMap (Leaflet + weather popup)
│   │   └── subscription/    # PricingCard, PricingTable
│   ├── pages/
│   │   ├── auth/            # LoginPage, RegisterPage, AuthCallbackPage, ForgotPasswordPage, ResetPasswordPage
│   │   ├── dashboard/       # DashboardPage (map + weather + stats)
│   │   ├── employees/       # EmployeesPage
│   │   ├── buyers/          # BuyersPage
│   │   ├── cultures/        # CulturesPage, CultureTypesPage
│   │   ├── packaging/       # PackagingPage
│   │   ├── plots/           # PlotsPage (plots + plot parts combined)
│   │   ├── barcode/         # BarcodePage, BarcodeReaderTab, BarcodeStornoTab, BarcodePrintModal
│   │   ├── work-evaluation/ # WorkEvaluationPage
│   │   ├── repurchase/      # RepurchasePage
│   │   ├── scheduler/       # SchedulerPage
│   │   ├── reports/         # WorkSummaryPage, ProfitLossPage, PurchaseSummaryPage
│   │   ├── maps/            # FarmMapPage (standalone, no sidebar link)
│   │   ├── weather/         # WeatherPage (standalone, no sidebar link)
│   │   ├── subscription/    # PricingPage, SubscriptionSuccessPage
│   │   └── settings/        # SettingsPage
│   ├── hooks/               # useAuth, useProfile, useSubscription, useWeather, useSerialScale,
│   │                        # useStornoBarcode, useEmployees, useCultures, usePackaging, usePlots, etc.
│   ├── context/             # AuthContext, SubscriptionContext
│   ├── router/              # index.tsx, ProtectedRoute, PlanRoute
│   ├── lib/                 # supabase.ts, queryClient.ts, constants.ts, formatters.ts, pdfExport.ts, utils.ts
│   └── types/               # app.types.ts, database.types.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql          # profiles table (id, first_name, last_name, farm_name, farm_no, farm_lat, farm_lng)
│   │   ├── 002_master_data.sql       # employees, buyers, cultures, culture_types, packaging, plot_lists, plots
│   │   ├── 003_operational.sql       # barcodes, work_evaluations, repurchase, scheduler_events; RLS policies
│   │   ├── 004_reports_views.sql     # work_summary_by_employee and profit_loss_daily views
│   │   ├── 005_subscriptions.sql     # subscriptions table + Stripe tier management
│   │   ├── 006_repurchase_neto_shipped.sql  # add neto_shipped column to repurchase
│   │   ├── 007_repurchase_paid.sql          # add paid/paid_at tracking to repurchase
│   │   ├── 008_profit_loss_view_update.sql  # extend profit_loss_daily with EUR, avg price, expense %
│   │   ├── 009_profiles_ggn.sql             # add ggn and origin columns to profiles
│   │   └── 010_rename_plot_list_name.sql    # rename plot_list_name → plot_name in plot_lists
│   └── functions/
│       ├── stripe-webhook/
│       ├── create-checkout-session/
│       ├── create-portal-session/
│       └── get-exchange-rate/
├── wrangler.toml            # Cloudflare Workers deployment config
├── .env.local               # Your secrets (not committed)
├── .env.example             # Template for required variables
└── package.json
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon/public key** from Project Settings → API

### 3. Run database migrations

In your Supabase project, open the **SQL Editor** and run each migration file in order:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_master_data.sql`
3. `supabase/migrations/003_operational.sql`
4. `supabase/migrations/004_reports_views.sql`
5. `supabase/migrations/005_subscriptions.sql`
6. `supabase/migrations/006_repurchase_neto_shipped.sql`
7. `supabase/migrations/007_repurchase_paid.sql`
8. `supabase/migrations/008_profit_loss_view_update.sql`
9. `supabase/migrations/009_profiles_ggn.sql`
10. `supabase/migrations/010_rename_plot_list_name.sql`

> When prompted to enable RLS, confirm — the migrations set up the correct owner-based policies automatically.

### 4. Create your first account

Run the app (`npm run dev`) and register at [http://localhost:5173](http://localhost:5173). To grant yourself Business tier access, run this in the Supabase SQL Editor:

```sql
update public.subscriptions
set tier = 'business', status = 'active'
where user_id = (select id from auth.users where email = 'your@email.com');
```

### 5. Set up Stripe (optional)

1. Create a free account at [stripe.com](https://stripe.com)
2. In the Stripe Dashboard, go to **Products** and create two products:
   - **PomonaV2 Pro** — recurring monthly price (e.g. €12/month)
   - **PomonaV2 Business** — recurring monthly price (e.g. €25/month)
3. Copy the **Price IDs** (start with `price_...`) for each product
4. In **Developers → Webhooks**, add a webhook endpoint:
   ```
   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
   ```
   Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_...`)

### 6. Get an OpenWeatherMap API key

1. Create a free account at [openweathermap.org](https://openweathermap.org)
2. Go to **API Keys** and copy your default key
3. The free tier gives 1,000 API calls/day — more than enough

### 7. Fill in environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...

VITE_OPENWEATHER_API_KEY=<your-api-key>

VITE_SITE_URL=http://localhost:5173
```

### 8. Deploy Supabase Edge Functions

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

**NBS Exchange Rate function** (required for Repurchase EUR/RSD rates):

```bash
supabase functions deploy get-exchange-rate
```

The NBS credentials are bundled as defaults. To override them with secrets:

```bash
supabase secrets set NBS_USERNAME=<your-nbs-username>
supabase secrets set NBS_PASSWORD=<your-nbs-password>
supabase secrets set NBS_LICENCE_ID=<your-nbs-licence-id>
```

**Stripe functions** (optional — only needed if using paid subscriptions):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRO_MONTHLY_PRICE_ID=price_...
supabase secrets set STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set SITE_URL=http://localhost:5173

supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
```

### 9. Start the development server

```bash
npm run dev
```

---

## Setting Up Farm Profile (Settings)

Go to **Settings** to configure your farm details:

- **Farm name** — used across the app and on printed barcode labels
- **Farm registration number** — optional identifier
- **GGN (GlobalG.A.P. Number)** — printed on barcode labels when set
- **Origin (country)** — printed on barcode labels (e.g. "Serbia")
- **Latitude / Longitude** — used for the Farm Map and Weather Forecast on the Dashboard. Find coordinates by right-clicking any location on [openstreetmap.org](https://www.openstreetmap.org).

Under **Account**, you can update your first and last name.

Example coordinates for Belgrade, Serbia: `lat: 44.8176`, `lng: 20.4569`

---

## Barcode Workflow

### 1. Generate

Open **Barcodes → Generator** and click **Generate barcodes**. Fill in all required fields:

| Field | Notes |
|---|---|
| Date | Defaults to today. Set a future date to pre-create barcodes before harvest. |
| Number of barcodes | 1–99. Each gets its own unique barcode ID — one per crate. |
| Employee, Culture, Culture type, Packaging, Plot | All mandatory. |

After clicking Generate the dialog moves to a confirmation step: *"X barcodes saved. Print now?"*

- **Print now** → opens the print modal with all N labels ready to print in one pass
- **Done** → closes the dialog; barcodes are already saved in the table

### 2. Print later

Click the **⋯ menu → Print label** on any row in the Generator tab, or the **printer icon** in the Reader tab. This prints only that one barcode's label — no new records are created.

### 3. Weigh

Open the **Reader** tab. Scan or type a barcode value and press Enter — the matching row is highlighted. Enter Bruto weight using the **implicit decimal input** (type digits without a dot — `1234` becomes `1.234 kg`) or connect a serial scale to read weight directly. Neto is calculated automatically (Bruto − Tara from the packaging record).

Use the filters (Employee, Date, Culture, Measured) to narrow down the list. Selecting a **Date** fetches barcodes for that exact date from the database — not limited to the default 4-day window. Check individual rows or use the header checkbox to select all visible rows.

### 4. Storno

| Barcode state | What happens |
|---|---|
| **Not weighed** (Measured = No) | `is_storno = true` only — no side effects |
| **Weighed** (Measured = Yes) | `is_storno = true`, `bruto` and `neto` set to null, and the saved Work Evaluation for that employee on that date is recalculated automatically |

A confirmation dialog always describes what will happen. Storno is available individually (Ban icon) or in bulk (checkbox selection → Cancel selected) from both the Generator and Reader tabs.

---

## Serial Scale Integration (Barcode Reader)

The Barcode Reader tab supports reading weight directly from a physical scale connected via a COM port.

**Requirements:**
- Chrome or Edge on desktop (Web Serial API)
- Scale configured to respond to the `P` command over serial
- Serial settings: **9600 baud, 8 data bits, no parity, 1 stop bit**
- Expected response format: `2.500 KG` or `2500 G`

**Usage:**
1. Open the **Barcode** page → **Reader** tab
2. Click **Connect scale** — browser shows a COM port picker
3. Select your port and confirm
4. For any row, click the scale icon button to send the `P` command and auto-fill the Bruto field
5. Click **Save** to write the weight to the database (Neto = Bruto − Tara is calculated automatically)

---

## NBS Exchange Rate (Repurchase)

The Repurchase dialog fetches live EUR/RSD exchange rates from the **National Bank of Serbia (NBS)** SOAP web service via a Supabase Edge Function.

**Setup:** Deploy the function once:
```bash
supabase functions deploy get-exchange-rate
```

**Usage in the Repurchase dialog:**
1. Click **"Get today's rate"** — fetches both rates from NBS
2. Select **Srednji kurs** (middle rate) or **Prodajni kurs** (selling rate) via radio button
3. The `EUR rate` field is auto-filled with the selected rate
4. Enter **Price/kg (RSD)** — Income (RSD), Price (EUR), and Income (EUR) are calculated automatically
5. The EUR rate field remains editable for manual override if needed

---

## PDF Export (Reports)

Both report pages have an **Export PDF** button next to the date filters.

| Report | Orientation | Filename |
|---|---|---|
| Work Summary | Portrait | `Work_Summary_Report.pdf` |
| Profit & Loss | Landscape | `Profit_Loss_Report.pdf` |
| Purchase Summary | Landscape | `Purchase_Summary_<from>_<to>.pdf` |

All include a totals footer row. The button is disabled when there is no data in the selected date range.

---

## Generating Type Definitions from Supabase

After your migrations are applied, regenerate the TypeScript types to keep them in sync:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.types.ts
```

---

## Deploying to Cloudflare Workers

This project is configured for deployment as a Cloudflare Worker with static assets via `wrangler.toml`. SPA routing (`not_found_handling = "single-page-application"`) is handled natively — no `_redirects` file needed.

### 1. Connect your GitHub repo

Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → connect your GitHub repository.

Build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build output directory | `dist` |

### 2. Set environment variables

In your Pages project → **Settings** → **Environment Variables** → **Production**, add:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLISHABLE_KEY
VITE_STRIPE_PRO_MONTHLY_PRICE_ID
VITE_STRIPE_BUSINESS_MONTHLY_PRICE_ID
VITE_OPENWEATHER_API_KEY
VITE_SITE_URL   ← your Cloudflare domain, e.g. https://pomonav2.yourname.workers.dev
```

Then retrigger a deployment — `VITE_*` variables are baked into the bundle at build time.

### 3. Update Supabase redirect URLs

In Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**: `https://yourdomain.com/auth/callback`

### 4. Custom domain (optional)

In Cloudflare → **Workers & Pages** → your project → **Settings** → **Domains & Routes** → **Add Custom Domain**.

---

## Building for Production

```bash
npm run build
```

The output goes to `dist/`. The project is pre-configured for Cloudflare Workers via `wrangler.toml`. To deploy manually:

```bash
npx wrangler deploy
```

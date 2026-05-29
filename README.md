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
- **Plot Lists** — groupings for organizing plots
- **Plots** — individual parcels linked to plot lists
- **Barcode** — three-tab page:
  - **Generator** — create barcodes with employee/culture/packaging/plot assignments; print labels (CODE128, 5.07"×2" thermal label layout with lavender header, lot code, variety, worker, grower)
  - **Reader** — scan barcodes via a hardware scanner, enter Bruto weight manually or read directly from a serial scale via the Web Serial API (9600/8N1, `P` command), Neto auto-calculated (Bruto − Tara); real-time save per row
  - **Storno** — history of all cancelled barcodes; individual storno from Generator or Reader moves barcodes here instantly
- **Work Evaluation** — daily employee performance tracking with star ratings (1–3), neto weight, box count, pay per day, expense per kg, fuel, bonus, and totals
- **Repurchase** — crop purchase records with dual-currency support (RSD + EUR), buyer and culture links. Live EUR/RSD rate fetched from the National Bank of Serbia (NBS) — choose between Srednji kurs or Prodajni kurs; Income (RSD/EUR) and Price (EUR) are auto-calculated when entering Price/kg (RSD)
- **Scheduler** — interactive monthly calendar with color-coded events, click-to-add, click-to-delete

### Authentication

- **Registration** — collects First Name, Last Name, email, password, farm name, and optional farm registration number. First/Last name are stored in the user profile.
- **Forgot password** — user requests a reset link by email (`/forgot-password`). Clicking the link redirects through `/auth/callback` which detects `type=recovery` and forwards to `/reset-password`. The reset page accepts a new password with confirmation and calls `supabase.auth.updateUser()`.

### New features (not in original Pomona)

- **Dashboard** — live stat cards (employee/buyer/culture counts), Farm Map with weather popup on marker, and 5-day weather forecast — all on one page (Business tier)
- **Farm Map** — Leaflet + OpenStreetMap embedded on the dashboard. Marker popup shows today's weather (icon, temp range, condition, humidity, wind). Coordinates set in Settings.
- **Weather Forecast** — 5-day forecast from OpenWeatherMap shown on the dashboard. Shows temperature (min/max), condition, humidity, and wind speed per day.
- **PDF export** — Export to PDF button on both Work Summary and Profit & Loss report pages. Portrait for Work Summary, landscape for Profit & Loss. Includes totals footer row.
- **Serial scale integration** — Web Serial API in the Barcode Reader tab. Connect to any scale on a COM port (9600 baud, 8N1). Click the scale icon on a row to send the `P` command and auto-fill Bruto weight. Requires Chrome or Edge on desktop.
- **Subscription system** — Three-tier pricing (Free / Pro / Business) with:
  - Stripe Checkout for payments
  - Stripe Webhooks to automatically provision plan upgrades
  - Stripe Customer Portal for self-serve plan management (upgrade, downgrade, cancel)
  - Feature gating — locked pages show an upgrade prompt instead of content
  - Sidebar lock icons on gated sections

### Reports (Business tier)

- **Work Summary** — aggregated work evaluation data by employee and date range, with a Recharts bar chart (Neto vs Pay per employee); PDF export
- **Profit & Loss** — daily revenue vs expenses vs profit, with a ComposedChart and summary KPI cards; PDF export (landscape)

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
│   │   ├── plots/           # PlotsPage, PlotListsPage
│   │   ├── barcode/         # BarcodePage, BarcodeReaderTab, BarcodeStornoTab, BarcodePrintModal
│   │   ├── work-evaluation/ # WorkEvaluationPage
│   │   ├── repurchase/      # RepurchasePage
│   │   ├── scheduler/       # SchedulerPage
│   │   ├── reports/         # WorkSummaryPage, ProfitLossPage
│   │   ├── maps/            # FarmMapPage (standalone, no sidebar link)
│   │   ├── weather/         # WeatherPage (standalone, no sidebar link)
│   │   ├── subscription/    # PricingPage, SubscriptionSuccessPage
│   │   └── settings/        # SettingsPage
│   ├── hooks/               # useAuth, useProfile, useSubscription, useWeather, useSerialScale, etc.
│   ├── context/             # AuthContext, SubscriptionContext
│   ├── router/              # index.tsx, ProtectedRoute, PlanRoute
│   ├── lib/                 # supabase.ts, queryClient.ts, constants.ts, formatters.ts, pdfExport.ts, utils.ts
│   └── types/               # app.types.ts, database.types.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_master_data.sql
│   │   ├── 003_operational.sql
│   │   ├── 004_reports_views.sql
│   │   └── 005_subscriptions.sql
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

## Setting Up Farm Location (for Map & Weather)

Go to **Settings** and enter your farm's latitude and longitude. You can find coordinates by right-clicking any location on [openstreetmap.org](https://www.openstreetmap.org).

Example for Belgrade, Serbia: `lat: 44.8176`, `lng: 20.4569`

Once saved, the **Dashboard** (Business plan) will show the Farm Map with a weather popup on the marker and the 5-day forecast below it.

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

Both include a totals footer row. The button is disabled when there is no data in the selected date range.

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

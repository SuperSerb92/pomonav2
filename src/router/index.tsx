import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PlanRoute } from './PlanRoute'
import { AppLayout } from '@/components/layout/AppLayout'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

import DashboardPage from '@/pages/dashboard/DashboardPage'
import EmployeesPage from '@/pages/employees/EmployeesPage'
import BuyersPage from '@/pages/buyers/BuyersPage'
import CulturesPage from '@/pages/cultures/CulturesPage'
import CultureTypesPage from '@/pages/cultures/CultureTypesPage'
import PackagingPage from '@/pages/packaging/PackagingPage'
import PlotsPage from '@/pages/plots/PlotsPage'
import PlotListsPage from '@/pages/plots/PlotListsPage'
import BarcodePage from '@/pages/barcode/BarcodePage'
import WorkEvaluationPage from '@/pages/work-evaluation/WorkEvaluationPage'
import RepurchasePage from '@/pages/repurchase/RepurchasePage'
import SchedulerPage from '@/pages/scheduler/SchedulerPage'
import WorkSummaryPage from '@/pages/reports/WorkSummaryPage'
import ProfitLossPage from '@/pages/reports/ProfitLossPage'
import FarmMapPage from '@/pages/maps/FarmMapPage'
import WeatherPage from '@/pages/weather/WeatherPage'
import PricingPage from '@/pages/subscription/PricingPage'
import SubscriptionSuccessPage from '@/pages/subscription/SubscriptionSuccessPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/pricing', element: <PricingPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },

          // Master Data — Free tier
          { path: 'employees', element: <EmployeesPage /> },
          { path: 'buyers', element: <BuyersPage /> },
          { path: 'cultures', element: <CulturesPage /> },
          { path: 'cultures/types', element: <CultureTypesPage /> },
          { path: 'packaging', element: <PackagingPage /> },
          { path: 'plots', element: <PlotsPage /> },
          { path: 'plots/lists', element: <PlotListsPage /> },

          // Operations — Pro+
          { path: 'barcode', element: <PlanRoute min="pro"><BarcodePage /></PlanRoute> },
          { path: 'work-evaluation', element: <PlanRoute min="pro"><WorkEvaluationPage /></PlanRoute> },
          { path: 'repurchase', element: <PlanRoute min="pro"><RepurchasePage /></PlanRoute> },
          { path: 'scheduler', element: <PlanRoute min="pro"><SchedulerPage /></PlanRoute> },

          // Reports — Business
          { path: 'reports/work-summary', element: <PlanRoute min="business"><WorkSummaryPage /></PlanRoute> },
          { path: 'reports/profit-loss', element: <PlanRoute min="business"><ProfitLossPage /></PlanRoute> },

          // Insights — Business
          { path: 'map', element: <PlanRoute min="business"><FarmMapPage /></PlanRoute> },
          { path: 'weather', element: <PlanRoute min="business"><WeatherPage /></PlanRoute> },

          // Subscription
          { path: 'subscription/success', element: <SubscriptionSuccessPage /> },

          // Settings
          { path: 'settings', element: <SettingsPage /> },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

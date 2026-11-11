import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AuthLayout } from './components/layout/AuthLayout';

const LandingPage = lazy(() => import('./pages/LandingPage').then(({ LandingPage }) => ({ default: LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const RepositoriesPage = lazy(() => import('./pages/RepositoriesPage').then(({ RepositoriesPage }) => ({ default: RepositoriesPage })));
const ConnectRepoPage = lazy(() => import('./pages/ConnectRepoPage').then(({ ConnectRepoPage }) => ({ default: ConnectRepoPage })));
const GitHubConnectPage = lazy(() => import('./pages/GitHubConnectPage').then(({ GitHubConnectPage }) => ({ default: GitHubConnectPage })));
const RepoDetailPage = lazy(() => import('./pages/RepoDetailPage').then(({ RepoDetailPage }) => ({ default: RepoDetailPage })));
const RepoAnalysisPage = lazy(() => import('./pages/RepoAnalysisPage').then(({ RepoAnalysisPage }) => ({ default: RepoAnalysisPage })));
const PullRequestsPage = lazy(() => import('./pages/PullRequestsPage').then(({ PullRequestsPage }) => ({ default: PullRequestsPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(({ HistoryPage }) => ({ default: HistoryPage })));
const DetailedReportPage = lazy(() => import('./pages/DetailedReportPage').then(({ DetailedReportPage }) => ({ default: DetailedReportPage })));
const AnalysisReportPage = lazy(() => import('./pages/AnalysisReportPage').then(({ AnalysisReportPage }) => ({ default: AnalysisReportPage })));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage').then(({ ComparisonPage }) => ({ default: ComparisonPage })));
const DeveloperAnalyticsPage = lazy(() => import('./pages/DeveloperAnalyticsPage').then(({ DeveloperAnalyticsPage }) => ({ default: DeveloperAnalyticsPage })));
const CodeReviewPage = lazy(() => import('./pages/CodeReviewPage').then(({ CodeReviewPage }) => ({ default: CodeReviewPage })));
const BugDetectionPage = lazy(() => import('./pages/BugDetectionPage').then(({ BugDetectionPage }) => ({ default: BugDetectionPage })));
const SecurityPage = lazy(() => import('./pages/SecurityPage').then(({ SecurityPage }) => ({ default: SecurityPage })));
const ComplexityPage = lazy(() => import('./pages/ComplexityPage').then(({ ComplexityPage }) => ({ default: ComplexityPage })));
const ExplainPage = lazy(() => import('./pages/ExplainPage').then(({ ExplainPage }) => ({ default: ExplainPage })));
const TestGenerationPage = lazy(() => import('./pages/TestGenerationPage').then(({ TestGenerationPage }) => ({ default: TestGenerationPage })));
const TestExecutionPage = lazy(() => import('./pages/TestExecutionPage').then(({ TestExecutionPage }) => ({ default: TestExecutionPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(({ NotificationsPage }) => ({ default: NotificationsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(({ ProfilePage }) => ({ default: ProfilePage })));
const OrganizationPage = lazy(() => import('./pages/OrganizationPage').then(({ OrganizationPage }) => ({ default: OrganizationPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })));
const BackgroundJobsPage = lazy(() => import('./pages/BackgroundJobsPage').then(({ BackgroundJobsPage }) => ({ default: BackgroundJobsPage })));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-500">Checking your session…</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading page…</div>}>
        <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Layout & Routed Pages */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Dashboard Shell Layout & Nested Protected Routes */}
            <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
              {/* Main Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Repositories & Projects */}
              <Route path="/repositories" element={<RepositoriesPage />} />
              <Route path="/projects" element={<RepositoriesPage />} />
              <Route path="/repositories/connect" element={<ConnectRepoPage />} />
              <Route path="/github/connect" element={<GitHubConnectPage />} />
              <Route path="/repositories/:id" element={<RepoDetailPage />} />
              <Route path="/repositories/:id/analysis" element={<RepoAnalysisPage />} />
              <Route path="/analysis/reports/:reportId" element={<AnalysisReportPage />} />
              <Route path="/analysis/compare" element={<ComparisonPage />} />
              <Route path="/analytics" element={<DeveloperAnalyticsPage />} />

              {/* AI Code Intelligence & SAST Security */}
              <Route path="/code-review" element={<CodeReviewPage />} />
              <Route path="/bugs" element={<BugDetectionPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/complexity" element={<ComplexityPage />} />
              <Route path="/explain" element={<ExplainPage />} />

              {/* Testing & Ephemeral Sandboxes */}
              <Route path="/tests/generate" element={<TestGenerationPage />} />
              <Route path="/tests/execution" element={<TestExecutionPage />} />

              {/* GitHub Pull Requests & Audits */}
              <Route path="/pull-requests" element={<PullRequestsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reports/:id" element={<DetailedReportPage />} />

              {/* Workspace Management */}
              <Route path="/jobs" element={<BackgroundJobsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/organization" element={<OrganizationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback to Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

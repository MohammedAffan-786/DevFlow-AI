import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AuthLayout } from './components/layout/AuthLayout';

// Public & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Platform Core Pages
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { ConnectRepoPage } from './pages/ConnectRepoPage';
import { GitHubConnectPage } from './pages/GitHubConnectPage';
import { RepoDetailPage } from './pages/RepoDetailPage';
import { RepoAnalysisPage } from './pages/RepoAnalysisPage';
import { PullRequestsPage } from './pages/PullRequestsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DetailedReportPage } from './pages/DetailedReportPage';
import { AnalysisReportPage } from './pages/AnalysisReportPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { DeveloperAnalyticsPage } from './pages/DeveloperAnalyticsPage';

// AI Intelligence & Security Pages
import { CodeReviewPage } from './pages/CodeReviewPage';
import { BugDetectionPage } from './pages/BugDetectionPage';
import { SecurityPage } from './pages/SecurityPage';
import { ComplexityPage } from './pages/ComplexityPage';
import { ExplainPage } from './pages/ExplainPage';

// Testing & Sandboxed Execution Pages
import { TestGenerationPage } from './pages/TestGenerationPage';
import { TestExecutionPage } from './pages/TestExecutionPage';

// Workspace & Management Pages
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { OrganizationPage } from './pages/OrganizationPage';
import { SettingsPage } from './pages/SettingsPage';
import { BackgroundJobsPage } from './pages/BackgroundJobsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
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
            <Route element={<DashboardLayout />}>
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

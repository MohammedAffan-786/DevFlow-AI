import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Code2,
  Cpu,
  FolderGit2,
  PlusCircle,
  GitPullRequest,
  History,
  FileCode2,
  Bug,
  ShieldAlert,
  BarChart3,
  HelpCircle,
  FlaskConical,
  Terminal,
  Users,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Search,
  Github,
  GitCompare,
  Activity,
  Layers,
} from 'lucide-react';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigationSections = [
    {
      title: 'Platform',
      items: [
        { label: 'Overview', path: '/dashboard', icon: <Cpu className="w-4 h-4" /> },
        { label: 'Repositories', path: '/repositories', icon: <FolderGit2 className="w-4 h-4" /> },
        { label: 'GitHub Connect', path: '/github/connect', icon: <Github className="w-4 h-4" /> },
        { label: 'Connect Repo', path: '/repositories/connect', icon: <PlusCircle className="w-4 h-4" /> },
        { label: 'Background Jobs', path: '/jobs', icon: <Layers className="w-4 h-4" /> },
        { label: 'Pull Requests', path: '/pull-requests', icon: <GitPullRequest className="w-4 h-4" /> },
        { label: 'Analysis History', path: '/history', icon: <History className="w-4 h-4" /> },
      ],
    },
    {
      title: 'AI Intelligence & Security',
      items: [
        { label: 'Code Review', path: '/code-review', icon: <FileCode2 className="w-4 h-4" /> },
        { label: 'Bug Detection', path: '/bugs', icon: <Bug className="w-4 h-4" /> },
        { label: 'Security Analysis', path: '/security', icon: <ShieldAlert className="w-4 h-4" /> },
        { label: 'Complexity Metrics', path: '/complexity', icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Code Explanation', path: '/explain', icon: <HelpCircle className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Testing & Sandboxes',
      items: [
        { label: 'Test Generation', path: '/tests/generate', icon: <FlaskConical className="w-4 h-4" /> },
        { label: 'Test Execution', path: '/tests/execution', icon: <Terminal className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Developer Intelligence',
      items: [
        { label: 'Analytics & Trends', path: '/analytics', icon: <Activity className="w-4 h-4" /> },
        { label: 'Run Comparison', path: '/analysis/compare', icon: <GitCompare className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { label: 'Team & Members', path: '/organization', icon: <Users className="w-4 h-4" /> },
        { label: 'Notifications', path: '/notifications', icon: <Bell className="w-4 h-4" /> },
        { label: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 select-none z-20">
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800/80">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">DevFlow</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-1 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                AI
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
                {section.title}
              </h4>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm border border-indigo-100 dark:border-indigo-900/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Workspace Plan Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {user?.organization?.name || 'Acme Workspace'}
            </span>
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full">
              PRO
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-2/5 rounded-full" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 block">
            4 / 10 Sandboxes in use
          </span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between z-10 select-none">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">DevFlow</span>
            </Link>
          </div>

          {/* Search Bar / Command Palette Look */}
          <div className="hidden sm:flex items-center w-72 lg:w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search repos, findings, pull requests... (Ctrl+K)"
                className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Action: New Scan */}
            <Link
              to="/repositories/connect"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Connect Repo</span>
            </Link>

            {/* Notifications Button */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <img
                  src={
                    user?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={user?.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {user?.displayName || 'Alex Mercer'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Popover */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-2 z-30 animate-in fade-in-0 zoom-in-95"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.displayName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Workspace Settings</span>
                  </Link>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Modal Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">DevFlow AI</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                {navigationSections.map((section) => (
                  <div key={section.title}>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {section.title}
                    </h4>
                    <nav className="space-y-1">
                      {section.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

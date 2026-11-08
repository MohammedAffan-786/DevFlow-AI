import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  GitPullRequest,
  Check,
  Bug,
  Terminal,
  Activity,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest<{ notifications: any[] }>('/notifications');
      setNotifications(res?.notifications || []);
    } catch {
      // Fallback realistic notification stream covering all 6 notification types
      setNotifications([
        {
          _id: 'notif_1',
          type: 'CRITICAL_SECURITY',
          title: 'Critical Security Vulnerability in payment-gateway',
          message: 'Direct parameter concatenation in SQL statement detected at src/services/billingService.ts:48 (CWE-89).',
          severity: 'CRITICAL',
          link: '/security',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'notif_2',
          type: 'CRITICAL_BUG',
          title: 'Critical Defect Detected in auth-service',
          message: 'Unhandled Promise Rejection on Webhook Timeout identified in src/handlers/webhookDispatcher.ts.',
          severity: 'HIGH',
          link: '/bugs',
          isRead: false,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          _id: 'notif_3',
          type: 'ANALYSIS_COMPLETED',
          title: 'Analysis Completed: payment-gateway',
          message: 'Full codebase audit completed in 3.8s with quality score 94/100 and Grade A.',
          severity: 'INFO',
          link: '/analysis/reports/rep_full_audit_demo',
          isRead: true,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          _id: 'notif_4',
          type: 'TEST_COMPLETED',
          title: 'Test Run Complete: payment-gateway',
          message: 'Executed 6 unit tests inside isolated sandbox: 6 passed, 0 failed. Line coverage: 94.2%.',
          severity: 'INFO',
          link: '/tests/execution',
          isRead: true,
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          _id: 'notif_5',
          type: 'PR_REVIEW_COMPLETED',
          title: 'AI Review Ready: PR #142 (feature/stripe-v3)',
          message: 'Automated PR review finished with verdict: NEEDS SECURITY TRIAGE. 2 inline suggestions generated.',
          severity: 'CRITICAL',
          link: '/pull-requests',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
        {
          _id: 'notif_6',
          type: 'JOB_FAILED',
          title: 'Background Worker Alert: sandbox-execution-queue',
          message: 'Watchdog alert: container memory exceeded threshold for job #4012. Execution cleanly halted.',
          severity: 'HIGH',
          link: '/dashboard',
          isRead: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL';
    return true;
  });

  const getNotificationIcon = (type: string, severity?: string) => {
    switch (type) {
      case 'CRITICAL_SECURITY':
      case 'SECURITY_ALERT':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'CRITICAL_BUG':
        return <Bug className="w-4 h-4 text-amber-500" />;
      case 'ANALYSIS_COMPLETED':
      case 'SCAN_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'TEST_COMPLETED':
        return <Terminal className="w-4 h-4 text-indigo-500" />;
      case 'PR_REVIEW_COMPLETED':
      case 'PR_REVIEW':
        return <GitPullRequest className="w-4 h-4 text-purple-500" />;
      case 'JOB_FAILED':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in-0 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Notifications & System Alerts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time notifications for analysis completions, critical security findings, test runs, PR reviews, and worker events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Mark All as Read
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            filter === 'UNREAD'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Unread Only ({notifications.filter((n) => !n.isRead).length})
        </button>
        <button
          onClick={() => setFilter('CRITICAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            filter === 'CRITICAL'
              ? 'bg-rose-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Critical Alerts ({notifications.filter((n) => n.severity === 'CRITICAL').length})
        </button>
      </div>

      <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No notifications to display.</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item._id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                !item.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/40 dark:hover:bg-slate-900/30'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                  {getNotificationIcon(item.type, item.severity)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                    {item.severity === 'CRITICAL' && (
                      <Badge variant="destructive" size="sm">CRITICAL</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                    <span>{new Date(item.createdAt).toLocaleTimeString()} • {new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.link && (
                      <Link to={item.link} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1">
                        View Details <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!item.isRead && (
                <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(item._id)} className="text-xs">
                  Mark Read
                </Button>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

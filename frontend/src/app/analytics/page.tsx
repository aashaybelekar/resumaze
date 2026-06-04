'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Users, TrendingUp, GitBranch, RefreshCw, BarChart3 } from 'lucide-react';
import { AnalyticsData, getAnalytics } from '@/lib/api';
import StatsCard from '@/components/StatsCard';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getAnalytics();
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stageChartData = (data.by_stage || []).map((s) => ({ name: s.stage, value: s.count }));
  const roleChartData = (data.by_role || []).map((r) => ({ name: r.role, value: r.count }));

  const topStage = [...stageChartData].sort((a, b) => b.value - a.value)[0];
  const total = data.total_applications ?? 0;
  const githubPct = total > 0 ? ((data.with_github / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">Pipeline insights and metrics</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Candidates"
            value={total}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Active Stages"
            value={stageChartData.length}
            icon={TrendingUp}
            color="purple"
            subtitle={topStage ? `Top: ${topStage.name} (${topStage.value})` : undefined}
          />
          <StatsCard
            title="Job Roles"
            value={roleChartData.length}
            icon={BarChart3}
            color="green"
          />
          <StatsCard
            title="With GitHub"
            value={`${githubPct.toFixed(0)}%`}
            icon={GitBranch}
            color="orange"
            subtitle={`${data.with_github} candidates`}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidates by stage - bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Candidates by Stage</h2>
            {stageChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stageChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Candidates" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Candidates by role - pie chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Candidates by Role</h2>
            {roleChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {roleChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stage breakdown table */}
        {stageChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Stage Breakdown</h2>
            <div className="space-y-2">
              {stageChartData.sort((a, b) => b.value - a.value).map((item, i) => {
                const pct = total > 0
                  ? ((item.value / total) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600 text-right">{item.name}</div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <div className="w-16 text-sm text-slate-600">{item.value} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Role breakdown table */}
        {roleChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Role Breakdown</h2>
            <div className="space-y-2">
              {roleChartData.sort((a, b) => b.value - a.value).map((item, i) => {
                const pct = total > 0
                  ? ((item.value / total) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-36 text-sm text-slate-600 text-right truncate">{item.name}</div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <div className="w-16 text-sm text-slate-600">{item.value} ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

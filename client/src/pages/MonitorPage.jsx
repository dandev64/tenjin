import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsStats, getAnalyticsEvents, getAnalyticsVisitors } from '../api.js';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800/50">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function ActivityChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const recent = data.slice(-48);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800/50">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Hourly Activity (last 48h)</h3>
      <div className="flex items-end gap-px h-24">
        {recent.map((d, i) => (
          <div
            key={i}
            className="flex-1 bg-indigo-500/70 hover:bg-indigo-400 rounded-t transition-colors relative group"
            style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
          >
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {d.count} req &middot; {new Date(d.hour).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventTypeBadge({ type }) {
  const colors = {
    chapter_read: 'bg-green-500/20 text-green-400',
    manga_view: 'bg-blue-500/20 text-blue-400',
    search: 'bg-yellow-500/20 text-yellow-400',
    browse: 'bg-purple-500/20 text-purple-400',
    other: 'bg-zinc-500/20 text-zinc-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[type] || colors.other}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

export default function MonitorPage() {
  const [key, setKey] = useState(() => {
    try { return localStorage.getItem('tenjin:monitor-key') || ''; } catch { return ''; }
  });
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (monitorKey) => {
    setLoading(true);
    setError('');
    try {
      const [s, e, v] = await Promise.all([
        getAnalyticsStats(monitorKey),
        getAnalyticsEvents(monitorKey, 100),
        getAnalyticsVisitors(monitorKey),
      ]);
      setStats(s);
      setEvents(e);
      setVisitors(v);
      setAuthed(true);
      try { localStorage.setItem('tenjin:monitor-key', monitorKey); } catch {}
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key) fetchData(key);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => fetchData(key), 30_000);
    return () => clearInterval(interval);
  }, [authed, key, fetchData]);

  function handleLogin(e) {
    e.preventDefault();
    fetchData(key);
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleLogin} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800/50 w-full max-w-sm">
          <h2 className="text-lg font-bold mb-4">Monitor Access</h2>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Enter monitor key"
            className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-sm focus:outline-none focus:border-indigo-500 mb-3"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: 'Live Events' },
    { id: 'visitors', label: 'Visitors' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Monitor</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(key)}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => { setAuthed(false); setKey(''); try { localStorage.removeItem('tenjin:monitor-key'); } catch {} }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Lock
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900/80 rounded-xl p-1 self-start">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Requests" value={stats.totalEvents.toLocaleString()} />
            <StatCard label="Unique Visitors" value={stats.uniqueVisitors} />
            <StatCard label="Last 24h" value={stats.visitorsLastDay} sub="unique visitors" />
            <StatCard label="Last Hour" value={stats.visitorsLastHour} sub="unique visitors" />
          </div>

          <ActivityChart data={stats.hourlyActivity} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Source Usage</h3>
              {Object.entries(stats.sourceUsage).sort(([,a],[,b]) => b - a).map(([source, count]) => (
                <div key={source} className="flex justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                  <span className="text-sm text-zinc-300">{source}</span>
                  <span className="text-sm text-zinc-500">{count}</span>
                </div>
              ))}
              {Object.keys(stats.sourceUsage).length === 0 && (
                <p className="text-sm text-zinc-600">No data yet</p>
              )}
            </div>

            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Manga</h3>
              {stats.topManga.slice(0, 10).map((m, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{m.id}</p>
                    <p className="text-xs text-zinc-600">{m.source} &middot; {timeAgo(m.lastSeen)}</p>
                  </div>
                  <span className="text-sm text-zinc-500 ml-2">{m.count}</span>
                </div>
              ))}
              {stats.topManga.length === 0 && (
                <p className="text-sm text-zinc-600">No data yet</p>
              )}
            </div>
          </div>

          {stats.oldestEvent && (
            <p className="text-xs text-zinc-600 text-center">
              Tracking since {new Date(stats.oldestEvent).toLocaleString()} &middot;
              Latest: {stats.newestEvent ? timeAgo(stats.newestEvent) : 'n/a'}
            </p>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Source</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Path</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">{timeAgo(e.ts)}</td>
                    <td className="px-4 py-2"><EventTypeBadge type={e.type} /></td>
                    <td className="px-4 py-2 text-zinc-300">{e.source}</td>
                    <td className="px-4 py-2 text-zinc-400 truncate max-w-[200px]" title={e.path}>{e.path}</td>
                    <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{e.ip}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600">No events recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'visitors' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">IP</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Requests</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Sources</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Activity</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">First Seen</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">Last Seen</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-300 font-mono text-xs">{v.ip}</td>
                    <td className="px-4 py-2 text-zinc-400">{v.requests}</td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{v.sources.join(', ')}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {v.types.map(t => <EventTypeBadge key={t} type={t} />)}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-zinc-500 whitespace-nowrap text-xs">{new Date(v.firstSeen).toLocaleString()}</td>
                    <td className="px-4 py-2 text-zinc-500 whitespace-nowrap text-xs">{timeAgo(v.lastSeen)}</td>
                    <td className="px-4 py-2 text-zinc-600 truncate max-w-[200px] text-xs" title={v.ua}>{v.ua}</td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-600">No visitors recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

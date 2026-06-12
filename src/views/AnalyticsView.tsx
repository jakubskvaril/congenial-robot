import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLogsStore } from '../store/logs';
import { computeLifetimeStats } from '../utils/lifetime';

export function AnalyticsView() {
  const logs = useLogsStore(s => s.logs);
  const stats = useMemo(() => computeLifetimeStats(logs), [logs]);

  const pieData = useMemo(() => {
    const allEntries = Object.values(logs).flat();
    const counts: Record<string, number> = { meat: 0, pouch: 0, felini: 0, other: 0 };
    for (const e of allEntries) counts[e.type] = (counts[e.type] ?? 0) + e.grams;
    return [
      { name: '🥩 Maso', value: counts.meat, color: '#B8922A' },
      { name: '🥫 Kapsičky', value: counts.pouch, color: '#15803D' },
      { name: '💊 Felini', value: counts.felini, color: '#1D4ED8' },
      { name: 'Ostatní', value: counts.other, color: '#A8A29E' },
    ].filter(d => d.value > 0);
  }, [logs]);

  if (stats.totalDaysLogged === 0) {
    return (
      <div className="view">
        <div className="empty-state">
          <p>📊 Zatím žádná data</p>
          <p className="help-text">Začněte zapisovat Bobova jídla v záložce Deník.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      {/* Lifetime summary */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 10 }}>🐾 Celoživotní přehled Boba</div>
        {stats.firstLogDate && (
          <p className="help-text" style={{ marginBottom: 10 }}>
            Sledujeme od: {stats.firstLogDate} ({stats.totalDaysLogged} dní)
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['🔥 Celkem kcal', stats.totalKcal.toLocaleString()],
            ['🥩 Bílkoviny', `${stats.totalProtein_g.toLocaleString()} g`],
            ['💊 Taurin', `${stats.totalTaurin_mg.toLocaleString()} mg`],
            ['🦴 Vápník', `${stats.totalCalcium_mg.toLocaleString()} mg`],
            ['💊 Felini dávky', String(stats.totalFeliniDoses)],
            ['🍽️ Celkem jídel', String(stats.totalMeals)],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{l}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }} data-testid={l === '🔥 Celkem kcal' ? 'lifetime-kcal' : undefined}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--muted)' }}>
          📈 Průměr za den: {stats.totalDaysLogged > 0 ? Math.round(stats.totalKcal / stats.totalDaysLogged) : 0} kcal
        </div>
        {stats.topMeats[0] && (
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            🏆 Nejčastěji: {stats.topMeats[0].name} ({stats.topMeats[0].totalGrams} g)
          </div>
        )}
        {stats.topPouches[0] && (
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            🥫 Top kapsička: {stats.topPouches[0].name.split('–').pop()?.trim()} ({stats.topPouches[0].count}×)
          </div>
        )}
      </div>

      {/* Monthly kcal bar chart */}
      {stats.monthlyAvgKcal.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 10 }}>Průměrné kcal za měsíc</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.monthlyAvgKcal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="avgKcal" fill="#111110" radius={[6,6,0,0]} name="Průměr kcal/den" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 10 }}>Rozložení jídel (gramy)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

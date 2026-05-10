import { useEffect, useMemo, useState } from 'react';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/us/obbba-household-explorer';

const DATASETS = {
  'tcja-expiration': {
    label: 'TCJA expiration',
    file: 'household_tax_income_changes_senate_current_law_baseline_minimal.csv',
    districtFile: 'district_aggregates.csv',
    districtFolder: 'districts/tcja-expiration'
  },
  'tcja-extension': {
    label: 'TCJA extension',
    file: 'household_visualization_minimal_1000.csv',
    districtFile: 'district_aggregates_current_law.csv',
    districtFolder: 'districts/tcja-extension'
  }
};

const INCOME_GROUPS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'lower', label: 'Below $50K', test: (d) => d.income < 50000 },
  { id: 'middle', label: '$50K to $200K', test: (d) => d.income >= 50000 && d.income < 200000 },
  { id: 'upper', label: '$200K to $1M', test: (d) => d.income >= 200000 && d.income < 1000000 },
  { id: 'highest', label: '$1M+', test: (d) => d.income >= 1000000 }
];

function assetUrl(path) {
  return `${BASE_PATH}/${path}`.replace(/\/+/g, '/').replace(':/', '://');
}

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines
    .filter(Boolean)
    .map((line, index) => {
      const values = line.split(',');
      const row = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
      const income = Number(row['Market Income'] ?? row['Gross Income'] ?? 0);
      const change = Number(
        row['Total change in net income'] ?? row['Change in Household Net Income'] ?? 0
      );
      const weight = Number(row['Household weight'] ?? row['Household Weight'] ?? 1);
      return {
        id: row['Household ID'] || String(index + 1),
        income,
        change,
        weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
        percentChange: income ? (change / Math.abs(income)) * 100 : 0
      };
    })
    .filter((row) => Number.isFinite(row.income) && Number.isFinite(row.change));
}

function parseDistricts(text) {
  const [, ...lines] = text.trim().split(/\r?\n/);
  return lines
    .filter(Boolean)
    .map((line) => {
      const [district, relChange, absChange, pctWinners, pctLosers, totalHouseholds] =
        line.split(',');
      return {
        district,
        relChange: Number(relChange),
        absChange: Number(absChange),
        pctWinners: Number(pctWinners),
        pctLosers: Number(pctLosers),
        totalHouseholds: Number(totalHouseholds)
      };
    })
    .filter((row) => row.district);
}

function weightedStats(rows) {
  if (!rows.length) {
    return { households: 0, gainShare: 0, lossShare: 0, medianChange: 0, averageDollar: 0 };
  }

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const gainWeight = rows.reduce((sum, row) => sum + (row.change > 0 ? row.weight : 0), 0);
  const lossWeight = rows.reduce((sum, row) => sum + (row.change < 0 ? row.weight : 0), 0);
  const averageDollar = rows.reduce((sum, row) => sum + row.change * row.weight, 0) / totalWeight;
  const sorted = [...rows].sort((a, b) => a.percentChange - b.percentChange);
  let cumulative = 0;
  let medianChange = 0;
  for (const row of sorted) {
    cumulative += row.weight;
    if (cumulative >= totalWeight / 2) {
      medianChange = row.percentChange;
      break;
    }
  }

  return {
    households: totalWeight,
    gainShare: (gainWeight / totalWeight) * 100,
    lossShare: (lossWeight / totalWeight) * 100,
    medianChange,
    averageDollar
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function Scatter({ rows, selected, onSelect }) {
  const width = 920;
  const height = 520;
  const padding = { top: 28, right: 30, bottom: 52, left: 72 };
  const xValues = rows.map((row) => row.percentChange);
  const yValues = rows.map((row) => row.income);
  const xMin = Math.min(-20, ...xValues);
  const xMax = Math.max(20, ...xValues);
  const yMin = Math.min(0, ...yValues);
  const yMax = Math.max(250000, ...yValues);
  const xScale = (value) =>
    padding.left + ((value - xMin) / (xMax - xMin || 1)) * (width - padding.left - padding.right);
  const yScale = (value) =>
    height -
    padding.bottom -
    ((value - yMin) / (yMax - yMin || 1)) * (height - padding.top - padding.bottom);

  return (
    <svg
      className="scatter"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Household impact scatter plot"
    >
      <line
        className="axis"
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
      />
      <line
        className="axis"
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={height - padding.bottom}
      />
      <line
        className="zero-line"
        x1={xScale(0)}
        x2={xScale(0)}
        y1={padding.top}
        y2={height - padding.bottom}
      />
      {[-20, -10, 0, 10, 20].map((tick) => (
        <g key={tick}>
          <line
            className="grid"
            x1={xScale(tick)}
            x2={xScale(tick)}
            y1={padding.top}
            y2={height - padding.bottom}
          />
          <text className="tick" x={xScale(tick)} y={height - 18} textAnchor="middle">
            {tick}%
          </text>
        </g>
      ))}
      {[0, 50000, 200000, 1000000]
        .filter((tick) => tick <= yMax)
        .map((tick) => (
          <g key={tick}>
            <line
              className="grid"
              x1={padding.left}
              x2={width - padding.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
            />
            <text className="tick" x={padding.left - 10} y={yScale(tick) + 4} textAnchor="end">
              {formatCurrency(tick)}
            </text>
          </g>
        ))}
      {rows.map((row) => (
        <circle
          key={row.id}
          className={`point ${row.change >= 0 ? 'gain' : 'loss'} ${selected?.id === row.id ? 'selected' : ''}`}
          cx={xScale(row.percentChange)}
          cy={yScale(row.income)}
          r={selected?.id === row.id ? 5 : 3}
          onClick={() => onSelect(row)}
        />
      ))}
      <text className="axis-label" x={width / 2} y={height - 4} textAnchor="middle">
        Change in net income
      </text>
      <text
        className="axis-label"
        transform={`translate(18 ${height / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        Market income
      </text>
    </svg>
  );
}

export default function ExplorerApp({ initialView = 'households' }) {
  const [datasetKey, setDatasetKey] = useState('tcja-expiration');
  const [view, setView] = useState(initialView);
  const [groupId, setGroupId] = useState('all');
  const [rows, setRows] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dataset = DATASETS[datasetKey];
  const filteredRows = useMemo(() => {
    const group = INCOME_GROUPS.find((item) => item.id === groupId) ?? INCOME_GROUPS[0];
    return rows.filter(group.test);
  }, [groupId, rows]);
  const stats = useMemo(() => weightedStats(filteredRows), [filteredRows]);
  const topDistricts = useMemo(
    () => [...districts].sort((a, b) => Math.abs(b.relChange) - Math.abs(a.relChange)).slice(0, 12),
    [districts]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(assetUrl(dataset.file)).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${dataset.file}`);
        return response.text();
      }),
      fetch(assetUrl(dataset.districtFile)).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${dataset.districtFile}`);
        return response.text();
      })
    ])
      .then(([householdCsv, districtCsv]) => {
        if (cancelled) return;
        const parsedRows = parseCsv(householdCsv);
        setRows(parsedRows);
        setDistricts(parseDistricts(districtCsv));
        setSelected(parsedRows[0] ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset.file, dataset.districtFile]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PolicyEngine analysis</p>
          <h1>OBBBA Household Explorer</h1>
        </div>
        <div className="controls">
          {Object.entries(DATASETS).map(([key, item]) => (
            <button
              key={key}
              className={datasetKey === key ? 'active' : ''}
              onClick={() => setDatasetKey(key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <nav className="view-tabs" aria-label="Explorer views">
        <button
          className={view === 'households' ? 'active' : ''}
          onClick={() => setView('households')}
        >
          Households
        </button>
        <button
          className={view === 'districts' ? 'active' : ''}
          onClick={() => setView('districts')}
        >
          Districts
        </button>
      </nav>

      {error && <div className="notice error">{error}</div>}
      {loading && <div className="notice">Loading household impacts...</div>}

      {!loading && !error && view === 'households' && (
        <section className="workspace">
          <aside className="side-panel">
            <h2>The One Big Beautiful Bill Act, household by household</h2>
            <p>
              This view samples representative households and shows how the law changes net income
              across the income distribution.
            </p>
            <div className="group-list">
              {INCOME_GROUPS.map((group) => (
                <button
                  key={group.id}
                  className={groupId === group.id ? 'active' : ''}
                  onClick={() => setGroupId(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <div className="metric-grid">
              <div>
                <span>{formatNumber(stats.gainShare)}%</span>
                <label>gain</label>
              </div>
              <div>
                <span>{formatNumber(stats.lossShare)}%</span>
                <label>lose</label>
              </div>
              <div>
                <span>{formatNumber(stats.medianChange)}%</span>
                <label>median change</label>
              </div>
              <div>
                <span>{formatCurrency(stats.averageDollar)}</span>
                <label>average change</label>
              </div>
            </div>
            {selected && (
              <div className="household-card">
                <h3>Selected household</h3>
                <dl>
                  <div>
                    <dt>Market income</dt>
                    <dd>{formatCurrency(selected.income)}</dd>
                  </div>
                  <div>
                    <dt>Dollar change</dt>
                    <dd>{formatCurrency(selected.change)}</dd>
                  </div>
                  <div>
                    <dt>Percent change</dt>
                    <dd>{formatNumber(selected.percentChange)}%</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{formatNumber(selected.weight)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </aside>
          <section className="chart-panel">
            <Scatter rows={filteredRows} selected={selected} onSelect={setSelected} />
          </section>
        </section>
      )}

      {!loading && !error && view === 'districts' && (
        <section className="district-panel">
          <div>
            <h2>District impacts</h2>
            <p>
              District aggregates are ranked by the largest relative income changes in either
              direction.
            </p>
          </div>
          <table>
            <thead>
              <tr>
                <th>District</th>
                <th>Relative change</th>
                <th>Average dollar change</th>
                <th>Winners</th>
                <th>Losers</th>
                <th>Households</th>
              </tr>
            </thead>
            <tbody>
              {topDistricts.map((district) => (
                <tr key={district.district}>
                  <td>{district.district}</td>
                  <td className={district.relChange >= 0 ? 'positive' : 'negative'}>
                    {formatNumber(district.relChange)}%
                  </td>
                  <td>{formatCurrency(district.absChange)}</td>
                  <td>{formatNumber(district.pctWinners)}%</td>
                  <td>{formatNumber(district.pctLosers)}%</td>
                  <td>{formatNumber(district.totalHouseholds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

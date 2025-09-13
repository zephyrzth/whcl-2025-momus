import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  indexService,
  formatPricePerCall,
  formatTotal,
} from "../services/indexService";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface UsageRow {
  date: string;
  calls: number;
  pricePerCall: string;
  total: string;
}

export function UsageView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.principalId) return;
    setLoading(true);
    indexService
      .getDailyUsageCurrentMonth(user.principalId)
      .then((daily) => {
        const mapped: UsageRow[] = daily.map((d) => ({
          date: d.date,
          calls: d.calls,
          pricePerCall: formatPricePerCall(),
          total: formatTotal(d.calls),
        }));
        setRows(mapped);
      })
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [user?.principalId]);

  const chartData = {
    labels: rows.map((r) => r.date.slice(-2)),
    datasets: [
      {
        label: "Calls",
        data: rows.map((r) => r.calls),
        backgroundColor: "rgba(59,130,246,0.6)",
        borderRadius: 4,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const idx = ctx.dataIndex;
            const row = rows[idx];
            if (!row) return "";
            return `Calls: ${row.calls}  Total: ${row.total}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "#1f2937" }, ticks: { precision: 0 } },
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">Usage</h1>
            <p className="text-gray-300">Current month metered usage</p>
          </div>

          {loading && (
            <div className="mb-6 rounded border border-gray-800 bg-gray-800/50 p-6 text-center text-gray-300">
              Loading usage…
            </div>
          )}
          {error && (
            <div className="mb-6 rounded border border-red-700/40 bg-red-900/30 p-4 text-sm text-red-300">
              Failed to load usage: {error}{" "}
              <button
                className="underline"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="mb-6 rounded border border-gray-800 bg-gray-800/30 p-10 text-center text-gray-400">
              No usage yet this month.
            </div>
          )}

          {rows.length > 0 && (
            <div className="mb-10 rounded border border-gray-800 bg-gray-900 p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Metered Usage
              </h2>
              <div className="h-64">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded border border-gray-800 bg-gray-900 p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Usage Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-gray-400">
                      <th className="py-2 font-medium">Date (UTC)</th>
                      <th className="py-2 font-medium">Agent Calls</th>
                      <th className="py-2 font-medium">Price / Call</th>
                      <th className="py-2 font-medium">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.date}
                        className="border-b border-gray-800 last:border-none"
                      >
                        <td className="py-2 text-white">{r.date}</td>
                        <td className="py-2 text-white">{r.calls}</td>
                        <td className="py-2 text-white">{r.pricePerCall}</td>
                        <td className="py-2 text-white">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

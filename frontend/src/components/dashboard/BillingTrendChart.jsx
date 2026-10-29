import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '../common/Card';
import { formatCurrency } from '../../utils/format';

/**
 * Invoice value by billing month. The chart is rendered only when the
 * backend actually returned invoice records — no sample data is used.
 */
export default function BillingTrendChart({ invoices = [] }) {
  const chartData = buildMonthlyTotals(invoices);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lavender-600 dark:text-lavender-300">
        Billing trend
      </p>
      <h2 className="mt-1.5 text-base font-bold text-ink">
        Invoiced amount by month
      </h2>

      <div className="mt-5 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="mgBillingBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B7BB5" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#6F5A98" stopOpacity={0.9} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
              }
            />
            <Tooltip
              cursor={{ fill: 'rgba(139, 123, 181, 0.10)' }}
              formatter={(value) => [formatCurrency(value), 'Invoiced']}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 12,
                boxShadow: '0 12px 40px -12px rgba(41,37,54,.25)',
              }}
              labelStyle={{ color: 'var(--text-soft)' }}
            />
            <Bar
              dataKey="total"
              fill="url(#mgBillingBar)"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function buildMonthlyTotals(invoices) {
  const buckets = new Map();

  invoices.forEach((invoice) => {
    const raw = invoice.billing_date || invoice.created_at;
    if (!raw) return;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const amount = Number(invoice.amount);
    const value = Number.isFinite(amount) ? amount : 0;

    buckets.set(key, (buckets.get(key) || 0) + value);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, total]) => {
      const [year, month] = key.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);

      return {
        key,
        label: date.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        total,
      };
    });
}

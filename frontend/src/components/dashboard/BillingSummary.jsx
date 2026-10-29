import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, CircleDashed, Wallet } from 'lucide-react';
import Card from '../common/Card';
import { formatCurrency, pluralize } from '../../utils/format';

/**
 * Billing snapshot built from the invoice records returned by
 * `GET /api/billing/`. Every number is derived from real rows.
 */
export default function BillingSummary({ invoices = [], loading = false }) {
  const totals = invoices.reduce(
    (accumulator, invoice) => {
      const amount = Number(invoice.amount);
      const value = Number.isFinite(amount) ? amount : 0;
      const status = String(invoice.payment_status || '').toLowerCase();

      if (status === 'paid') {
        accumulator.paid += value;
        accumulator.paidCount += 1;
      } else if (
        status === 'pending' ||
        status === 'unpaid' ||
        status === 'due'
      ) {
        accumulator.pending += value;
        accumulator.pendingCount += 1;
      } else {
        accumulator.other += value;
        accumulator.otherCount += 1;
      }

      accumulator.total += value;
      return accumulator;
    },
    {
      total: 0,
      paid: 0,
      paidCount: 0,
      pending: 0,
      pendingCount: 0,
      other: 0,
      otherCount: 0,
    },
  );

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
            Billing summary
          </p>
          <h2 className="mt-1.5 text-base font-bold text-ink">
            Outstanding amount
          </h2>
        </div>

        <Link
          to="/billing"
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy-700 transition hover:text-navy-900 dark:text-teal-300"
        >
          Invoices
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-9 w-40 animate-pulse rounded-md bg-panel-sunken" />
          <div className="h-3 w-52 animate-pulse rounded-md bg-panel-sunken" />
        </div>
      ) : invoices.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-hairline bg-panel-muted/60 px-4 py-6 text-center text-sm text-ink-muted">
          No invoices have been issued to your account yet.
        </p>
      ) : (
        <>
          <p className="mt-4 font-display text-[32px] font-extrabold leading-none text-ink">
            {formatCurrency(totals.pending)}
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            across {pluralize(totals.pendingCount, 'pending invoice')}
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
            <div>
              <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                <CircleCheck
                  className="h-3.5 w-3.5 text-emerald-500"
                  aria-hidden="true"
                />
                Paid
              </dt>
              <dd className="mt-1 text-sm font-bold text-ink">
                {formatCurrency(totals.paid)}
              </dd>
              <dd className="text-[11.5px] text-ink-muted">
                {pluralize(totals.paidCount, 'invoice')}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                <Wallet
                  className="h-3.5 w-3.5 text-amber-500"
                  aria-hidden="true"
                />
                Total
              </dt>
              <dd className="mt-1 text-sm font-bold text-ink">
                {formatCurrency(totals.total)}
              </dd>
              <dd className="text-[11.5px] text-ink-muted">
                {pluralize(invoices.length, 'invoice')}
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                <CircleDashed
                  className="h-3.5 w-3.5 text-navy-400"
                  aria-hidden="true"
                />
                Other
              </dt>
              <dd className="mt-1 text-sm font-bold text-ink">
                {formatCurrency(totals.other)}
              </dd>
              <dd className="text-[11.5px] text-ink-muted">
                {pluralize(totals.otherCount, 'invoice')}
              </dd>
            </div>
          </dl>
        </>
      )}
    </Card>
  );
}

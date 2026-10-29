import { useMemo, useState } from 'react';
import { CreditCard, Download, FileText, Search } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { SkeletonTable } from '../components/common/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { fetchBilling } from '../services/billingService';
import { formatCurrency, formatDate } from '../utils/format';

const STATUS_FILTERS = ['all', 'paid', 'pending', 'other'];

export default function Billing() {
  const billing = useAsync(() => fetchBilling(), []);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const invoices = billing.data?.billing || [];

  const totals = useMemo(
    () =>
      invoices.reduce(
        (accumulator, invoice) => {
          const amount = Number(invoice.amount);
          const value = Number.isFinite(amount) ? amount : 0;
          const status = String(invoice.payment_status || '').toLowerCase();

          accumulator.total += value;

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
      ),
    [invoices],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const status = String(invoice.payment_status || '').toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && status === 'paid') ||
        (statusFilter === 'pending' &&
          ['pending', 'unpaid', 'due'].includes(status)) ||
        (statusFilter === 'other' &&
          !['paid', 'pending', 'unpaid', 'due'].includes(status));

      if (!matchesStatus) return false;
      if (!term) return true;

      return [
        invoice.invoice_number,
        invoice.description,
        invoice.payment_method,
        invoice.payment_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [invoices, query, statusFilter]);

  if (billing.error && !billing.data) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Billing & Invoices"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <ErrorState
          title="Unable to load your billing information"
          message={billing.error}
          onRetry={billing.reload}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Billing & Invoices"
        description="Every invoice raised against your account, with payment status and due dates."
        icon={<CreditCard className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'Billing' }]}
      />

      {/* Summary */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Total invoiced"
          value={formatCurrency(totals.total)}
          hint={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
          tone="navy"
        />
        <SummaryTile
          label="Pending payment"
          value={formatCurrency(totals.pending)}
          hint={`${totals.pendingCount} awaiting payment`}
          tone="amber"
        />
        <SummaryTile
          label="Paid"
          value={formatCurrency(totals.paid)}
          hint={`${totals.paidCount} settled`}
          tone="emerald"
        />
        <SummaryTile
          label="Other statuses"
          value={formatCurrency(totals.other)}
          hint={`${totals.otherCount} invoice${totals.otherCount === 1 ? '' : 's'}`}
          tone="teal"
        />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-hairline bg-panel p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invoice number or description"
            aria-label="Search invoices"
            className="w-full rounded-lg border border-hairline bg-panel py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={[
                'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize transition',
                statusFilter === filter
                  ? 'bg-navy-900 text-white'
                  : 'bg-panel-sunken text-ink-soft hover:bg-hairline',
              ].join(' ')}
            >
              {filter === 'other' ? 'Other' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {billing.loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="When a consultation, procedure or service is billed to your account it will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching invoices"
          description="Try a different invoice number, description or status filter."
          action={
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card padded={false} className="hidden overflow-hidden lg:block">
            <div className="scrollbar-slim overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-hairline bg-panel-muted">
                    <Th>Invoice number</Th>
                    <Th>Description</Th>
                    <Th align="right">Amount</Th>
                    <Th>Billing date</Th>
                    <Th>Due date</Th>
                    <Th>Payment method</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-hairline">
                  {filtered.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition-colors hover:bg-panel-muted/60"
                    >
                      <Td>
                        <span className="font-semibold text-ink">
                          {invoice.invoice_number || `INV-${invoice.id}`}
                        </span>
                      </Td>

                      <Td>
                        <span className="line-clamp-2 max-w-xs text-ink-soft">
                          {invoice.description || '—'}
                        </span>
                      </Td>

                      <Td align="right">
                        <span className="font-bold text-ink">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </Td>

                      <Td>{formatDate(invoice.billing_date)}</Td>
                      <Td>{formatDate(invoice.due_date)}</Td>
                      <Td>{invoice.payment_method || '—'}</Td>

                      <Td>
                        <StatusBadge status={invoice.payment_status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((invoice) => (
              <Card key={invoice.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {invoice.invoice_number || `INV-${invoice.id}`}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                      {invoice.description || 'No description provided.'}
                    </p>
                  </div>
                  <StatusBadge status={invoice.payment_status} />
                </div>

                <div className="flex items-end justify-between gap-3 border-t border-hairline pt-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                    <div>
                      <dt className="text-ink-faint">Billed</dt>
                      <dd className="font-medium text-ink">
                        {formatDate(invoice.billing_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Due</dt>
                      <dd className="font-medium text-ink">
                        {formatDate(invoice.due_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Method</dt>
                      <dd className="font-medium text-ink">
                        {invoice.payment_method || '—'}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-right font-display text-[18px] font-extrabold text-ink">
                    {formatCurrency(invoice.amount)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="mt-5 flex items-start gap-2 rounded-xl border border-hairline bg-panel px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-muted">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <span>
          Invoices are read-only. The backend does not expose a payment or
          settlement action, so a payment cannot be recorded from this screen.
          Please use the hospital billing desk to make a payment.
        </span>
      </p>
    </div>
  );
}

function SummaryTile({ label, value, hint, tone }) {
  const tones = {
    navy: 'border-l-navy-500',
    teal: 'border-l-teal-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
  };

  return (
    <div
      className={`rounded-2xl border border-hairline border-l-[3px] bg-panel p-5 shadow-card ${
        tones[tone] || tones.navy
      }`}
    >
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[24px] font-extrabold leading-none text-ink">
        {value}
      </p>
      <p className="mt-2 text-[12px] text-ink-muted">{hint}</p>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th
      scope="col"
      className={`px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-muted ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }) {
  return (
    <td
      className={`px-5 py-4 text-[13px] text-ink-soft ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </td>
  );
}

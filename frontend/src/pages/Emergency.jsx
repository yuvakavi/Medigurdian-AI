import { useState } from 'react';
import {
  AlertTriangle,
  HeartPulse,
  Phone,
  Plus,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { SkeletonCard } from '../components/common/Skeleton';
import { useAsync } from '../hooks/useAsync';
import {
  createEmergencyRecord,
  deleteEmergencyRecord,
  fetchEmergencyRecords,
  updateEmergencyStatus,
} from '../services/emergencyService';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/format';

const EMERGENCY_TYPES = [
  { value: 'chest_pain', label: 'Chest pain' },
  { value: 'breathing_difficulty', label: 'Difficulty breathing' },
  { value: 'severe_bleeding', label: 'Severe bleeding' },
  { value: 'accident', label: 'Accident / injury' },
  { value: 'stroke', label: 'Stroke symptoms' },
  { value: 'allergic_reaction', label: 'Severe allergic reaction' },
  { value: 'other', label: 'Other emergency' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
];

const WARNING_SIGNS = [
  'Severe or crushing chest pain',
  'Difficulty breathing, or bluish lips or skin',
  'Sudden weakness, numbness or slurred speech',
  'Heavy bleeding that does not stop',
  'Loss of consciousness or severe confusion',
  'Severe allergic reaction with swelling of the throat',
  'Uncontrolled bleeding after a significant injury',
];

export default function Emergency() {
  const toast = useToast();
  const records = useAsync(() => fetchEmergencyRecords(), []);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const list = records.data || [];

  async function handleCreate(payload) {
    setSubmitting(true);

    try {
      await createEmergencyRecord(payload);
      toast.success('Emergency assistance request recorded.');
      setFormOpen(false);
      records.reload();
    } catch (error) {
      toast.error(
        error?.message || 'Unable to record the emergency request.',
      );
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(record, status) {
    setUpdatingId(record.id);

    try {
      await updateEmergencyStatus(record.id, status);
      toast.success('Emergency record updated.');
      records.reload();
    } catch (error) {
      toast.error(error?.message || 'Unable to update the record.');
    } finally {
      setUpdatingId('');
    }
  }

  async function handleDelete(record) {
    setDeletingId(record.id);

    try {
      await deleteEmergencyRecord(record.id);
      toast.success('Emergency record removed.');
      records.reload();
    } catch (error) {
      toast.error(error?.message || 'Unable to remove the record.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Emergency Assistance"
        description="Immediate guidance and a record of emergency requests raised from your account."
        icon={<AlertTriangle className="h-5 w-5" />}
        breadcrumb={[
          { label: 'Dashboard', to: '/' },
          { label: 'Emergency Assistance' },
        ]}
      />

      {/* Critical banner */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30">
        <div className="flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white shadow-sm">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </span>

            <div className="max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
                Life-threatening emergency
              </span>
              <h2 className="mt-1.5 text-xl font-extrabold leading-tight text-rose-900 dark:text-rose-100 sm:text-[24px]">
                Contact your local emergency services immediately
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-rose-800/90 dark:text-rose-200/85">
                Do not wait for an AI response or an online consultation. Call
                your local emergency number now, or ask someone nearby to take
                you to the nearest emergency department.
              </p>
            </div>
          </div>

          <a
            href="tel:112"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-[15px] font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            Call 112
          </a>
        </div>

        <p className="border-t border-rose-200/70 bg-rose-100/60 px-6 py-3 text-[12.5px] text-rose-900/80 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200/80 sm:px-7">
          112 is the standard emergency number in India. If you are in another
          country, use your local emergency number.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Warning signs */}
          <Card>
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <ShieldAlert
                className="h-4 w-4 text-rose-600"
                aria-hidden="true"
              />
              Warning signs that need emergency care
            </h2>

            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {WARNING_SIGNS.map((sign) => (
                <li
                  key={sign}
                  className="flex items-start gap-2.5 rounded-lg border border-hairline bg-panel-muted/60 px-3.5 py-2.5 text-[13px] leading-snug text-ink-soft"
                >
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500"
                    aria-hidden="true"
                  />
                  {sign}
                </li>
              ))}
            </ul>
          </Card>

          {/* Records */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Your emergency records
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Requests you have raised from this account.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setFormOpen(true)}
              >
                Raise a request
              </Button>
            </div>

            <div className="mt-5">
              {records.loading ? (
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : records.error && !records.data ? (
                <ErrorState
                  compact
                  title="Unable to load emergency records"
                  message={records.error}
                  onRetry={records.reload}
                />
              ) : list.length === 0 ? (
                <EmptyState
                  compact
                  icon={Stethoscope}
                  title="No emergency requests recorded"
                  description="Requests you raise will be listed here with their status so you and the care team can track them."
                />
              ) : (
                <ul className="space-y-3">
                  {list.map((record) => (
                    <li
                      key={record.id}
                      className="rounded-xl border border-hairline bg-panel-muted/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-ink">
                              {labelForType(record.emergency_type)}
                            </p>
                            <Badge
                              tone={
                                String(record.severity).toLowerCase() ===
                                'critical'
                                  ? 'rose'
                                  : String(record.severity).toLowerCase() ===
                                      'high'
                                    ? 'amber'
                                    : 'teal'
                              }
                              dot
                            >
                              {String(record.severity || 'medium')} severity
                            </Badge>
                          </div>

                          {record.symptoms && (
                            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                              {record.symptoms}
                            </p>
                          )}

                          {record.description && (
                            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                              {record.description}
                            </p>
                          )}

                          <p className="mt-2 text-[11.5px] text-ink-faint">
                            Raised {formatDateTime(record.created_at)}
                            {record.location ? ` · ${record.location}` : ''}
                            {record.contact_number
                              ? ` · ${record.contact_number}`
                              : ''}
                          </p>
                        </div>

                        <StatusBadge status={record.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                        <label className="sr-only" htmlFor={`status-${record.id}`}>
                          Update status
                        </label>
                        <select
                          id={`status-${record.id}`}
                          value={record.status}
                          disabled={updatingId === record.id}
                          onChange={(event) =>
                            handleStatusChange(record, event.target.value)
                          }
                          className="rounded-lg border border-hairline bg-panel px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft focus:border-navy-500 focus:outline-none disabled:opacity-60"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <Button
                          variant="ghost"
                          size="xs"
                          loading={deletingId === record.id}
                          onClick={() => handleDelete(record)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-bold text-ink">While you wait for help</h2>
            <ol className="mt-3.5 space-y-3 text-[13px] leading-relaxed text-ink-muted">
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                  1
                </span>
                Stay calm and keep the person still if they are injured.
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                  2
                </span>
                Loosen tight clothing and make sure the area is well ventilated.
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                  3
                </span>
                If the person is unresponsive and not breathing normally, begin
                CPR if you are trained to do so.
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                  4
                </span>
                Share your location and medical history with the responders.
              </li>
            </ol>
          </Card>

          <Card className="border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/25">
            <h2 className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Medigurdian AI is not emergency care
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-rose-900/85 dark:text-rose-200/85">
              The assistant and this screen cannot dispatch an ambulance,
              monitor a patient or provide professional assessment. Never delay
              emergency services while waiting for an automated response.
            </p>
          </Card>
        </aside>
      </div>

      <EmergencyRequestModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        submitting={submitting}
      />
    </div>
  );
}

function labelForType(value) {
  const match = EMERGENCY_TYPES.find((type) => type.value === value);
  if (match) return match.label;

  return String(value || 'Emergency')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function EmergencyRequestModal({ open, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    emergency_type: 'chest_pain',
    symptoms: '',
    description: '',
    severity: 'high',
    location: '',
    contact_number: '',
  });
  const [errors, setErrors] = useState({});

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.symptoms.trim()) {
      nextErrors.symptoms = 'Describe the symptoms you are experiencing.';
    }
    if (form.contact_number && form.contact_number.trim().length < 6) {
      nextErrors.contact_number = 'Enter a reachable contact number.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await onSubmit({
        emergency_type: form.emergency_type,
        symptoms: form.symptoms.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        location: form.location.trim() || null,
        contact_number: form.contact_number.trim() || null,
      });

      setForm({
        emergency_type: 'chest_pain',
        symptoms: '',
        description: '',
        severity: 'high',
        location: '',
        contact_number: '',
      });
    } catch {
      /* the parent surfaces the error via a toast */
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise an emergency request"
      description="This records your request against your account for the care team. It does not dispatch emergency services."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={submitting} onClick={handleSubmit}>
            Submit request
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            If this is a life-threatening situation, call your local emergency
            number first. Do not wait for this form.
          </span>
        </div>

        <Select
          label="Type of emergency"
          name="emergency_type"
          value={form.emergency_type}
          onChange={(event) => update('emergency_type', event.target.value)}
          options={EMERGENCY_TYPES}
          placeholder=""
          required
        />

        <Select
          label="Severity"
          name="severity"
          value={form.severity}
          onChange={(event) => update('severity', event.target.value)}
          options={SEVERITIES}
          placeholder=""
          required
        />

        <Textarea
          label="Symptoms"
          name="symptoms"
          rows={3}
          value={form.symptoms}
          onChange={(event) => update('symptoms', event.target.value)}
          error={errors.symptoms}
          placeholder="What is happening right now?"
          required
        />

        <Textarea
          label="Additional description (optional)"
          name="description"
          rows={2}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Location (optional)"
            name="location"
            value={form.location}
            onChange={(event) => update('location', event.target.value)}
            placeholder="Where you are right now"
          />

          <Input
            label="Contact number (optional)"
            name="contact_number"
            type="tel"
            value={form.contact_number}
            onChange={(event) =>
              update('contact_number', event.target.value)
            }
            error={errors.contact_number}
            placeholder="A number we can reach you on"
          />
        </div>
      </form>
    </Modal>
  );
}

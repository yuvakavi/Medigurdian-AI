import { useState } from 'react';
import {
  Cake,
  Droplets,
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import { SkeletonCard } from '../components/common/Skeleton';
import ErrorState from '../components/common/ErrorState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createPatientProfile } from '../services/patientService';
import {
  validateDateOfBirth,
  validateFullName,
  validatePhone,
} from '../utils/validators';
import { formatDate, initials } from '../utils/format';

const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

const BLOOD_GROUP_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(
  (value) => ({ value, label: value }),
);

export default function Profile() {
  const {
    profile,
    profileError,
    profileMissing,
    profileLoading,
    user,
    refreshProfile,
  } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }

  const displayName = profile?.full_name || user?.email || 'Patient';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Profile"
        description="The personal and medical details the hospital holds for your account."
        icon={<UserRound className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'My Profile' }]}
        action={
          profile ? (
            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          ) : undefined
        }
      />

      {profileLoading && !profile ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_360px]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !profile && !profileMissing && profileError ? (
        <ErrorState
          title="We could not load your profile"
          message={profileError}
          onRetry={refreshProfile}
        />
      ) : !profile ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_360px]">
          <ProfileSetupCard onCreated={refreshProfile} />

          <aside className="space-y-4">
            <Card>
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <ShieldCheck
                  className="h-4 w-4 text-lavender-600 dark:text-lavender-300"
                  aria-hidden="true"
                />
                Why we ask
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                Appointments, prescriptions and invoices are linked to a patient
                record, not directly to an email address. Creating the record
                once lets the backend attach those resources to your account.
              </p>
            </Card>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
                aria-hidden="true"
              />
              <p className="text-[12.5px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                No patient record exists for this account yet. Complete the form
                to create one.
              </p>
            </div>

            <Card>
              <h2 className="text-sm font-bold text-ink">Account</h2>
              <p className="mt-2 truncate text-[13px] text-ink-muted">
                {user?.email || '—'}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-faint">
                Signed in with Supabase Auth. Your email address is not editable
                from the patient portal.
              </p>
            </Card>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Identity card */}
          <Card className="h-fit">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-lavender-600 font-display text-2xl font-extrabold text-white">
                {initials(displayName)}
              </span>

              <h2 className="mt-4 text-lg font-bold text-ink">{displayName}</h2>
              <p className="mt-1 text-[13px] text-ink-muted">{user?.email}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {profile.blood_group && (
                  <Badge tone="rose" dot>
                    Blood group {profile.blood_group}
                  </Badge>
                )}
                {profile.gender && <Badge tone="teal">{profile.gender}</Badge>}
              </div>
            </div>

            {profile.id && (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Patient identifier
                </p>
                <p className="mt-1 break-all font-mono text-[12px] text-ink-soft">
                  {profile.id}
                </p>
              </div>
            )}
          </Card>

          {/* Details */}
          <div className="space-y-5">
            <Card>
              <h2 className="text-base font-bold text-ink">Personal details</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Sourced from the patient record in the backend.
              </p>

              <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <DetailRow
                  icon={UserRound}
                  label="Full name"
                  value={profile.full_name}
                />
                <DetailRow icon={Mail} label="Account email" value={user?.email} />
                <DetailRow icon={Phone} label="Phone" value={profile.phone} />
                <DetailRow
                  icon={Cake}
                  label="Date of birth"
                  value={
                    profile.date_of_birth
                      ? formatDate(profile.date_of_birth)
                      : undefined
                  }
                />
                <DetailRow
                  icon={Users}
                  label="Gender"
                  value={profile.gender}
                />
                <DetailRow
                  icon={Droplets}
                  label="Blood group"
                  value={profile.blood_group}
                />
                <DetailRow
                  icon={MapPin}
                  label="Address"
                  value={profile.address}
                  className="sm:col-span-2"
                />
              </dl>
            </Card>

            <Card>
              <h2 className="flex items-center gap-2 text-base font-bold text-ink">
                <ShieldCheck
                  className="h-4 w-4 text-lavender-600 dark:text-lavender-300"
                  aria-hidden="true"
                />
                Privacy
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Your health data is returned only for the signed-in account. The
                backend attaches your session token to every request and applies
                row-level security, so no other patient can read your records.
              </p>
            </Card>

            <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-panel px-4 py-3.5">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint"
                aria-hidden="true"
              />
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink-soft">
                  Profile editing is not enabled.{' '}
                </span>
                The backend exposes read and create routes for the patient
                profile but no update route, so the fields above are shown for
                reference. To correct a detail, please contact the hospital
                registration desk.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSetupCard({ onCreated }) {
  const toast = useToast();

  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  }

  function validate() {
    const nextErrors = {
      full_name: validateFullName(form.full_name),
      phone: validatePhone(form.phone),
      date_of_birth: validateDateOfBirth(form.date_of_birth),
    };

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      await createPatientProfile({
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });

      toast.success('Patient profile created.');
      await onCreated?.();
    } catch (error) {
      setFormError(
        error?.message || 'Unable to create your patient profile. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="text-base font-bold text-ink">Create your patient profile</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted">
        These details are stored in the hospital patient record. Fields marked
        with an asterisk are required.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <Input
          label="Full name"
          name="full_name"
          autoComplete="name"
          placeholder="As it appears on your records"
          value={form.full_name}
          onChange={(event) => update('full_name', event.target.value)}
          error={errors.full_name}
          required
          iconRight={<UserRound className="h-4 w-4" />}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date of birth"
            name="date_of_birth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.date_of_birth}
            onChange={(event) => update('date_of_birth', event.target.value)}
            error={errors.date_of_birth}
          />

          <Select
            label="Gender"
            name="gender"
            value={form.gender}
            onChange={(event) => update('gender', event.target.value)}
            options={GENDER_OPTIONS}
            placeholder="Select (optional)"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Blood group"
            name="blood_group"
            value={form.blood_group}
            onChange={(event) => update('blood_group', event.target.value)}
            options={BLOOD_GROUP_OPTIONS}
            placeholder="Select (optional)"
          />

          <Input
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            error={errors.phone}
            iconRight={<Phone className="h-4 w-4" />}
          />
        </div>

        <Textarea
          label="Address"
          name="address"
          rows={3}
          autoComplete="street-address"
          placeholder="House, street, city, state and PIN code"
          value={form.address}
          onChange={(event) => update('address', event.target.value)}
        />

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {formError}
          </div>
        )}

        <Button type="submit" loading={submitting}>
          {submitting ? 'Creating profile…' : 'Create patient profile'}
        </Button>
      </form>
    </Card>
  );
}

function DetailRow({ icon: Icon, label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value || '—'}</dd>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Users } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { SkeletonCard } from '../components/common/Skeleton';
import DoctorCard from '../components/doctors/DoctorCard';
import DoctorFilters from '../components/doctors/DoctorFilters';
import DoctorDetailModal from '../components/doctors/DoctorDetailModal';
import { useDoctorDirectory } from '../hooks/useDoctorDirectory';
import { extractSpecializations } from '../utils/normalize';

export default function Doctors() {
  const navigate = useNavigate();
  const { doctors, loading, error, reload } = useDoctorDirectory();

  const [query, setQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selected, setSelected] = useState(null);

  const specializations = useMemo(
    () => extractSpecializations(doctors),
    [doctors],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return doctors.filter((doctor) => {
      if (onlyAvailable && doctor.isAvailable === false) return false;

      if (specialization) {
        const matches =
          doctor.specialization === specialization ||
          doctor.department === specialization;
        if (!matches) return false;
      }

      if (!term) return true;

      return [
        doctor.fullName,
        doctor.specialization,
        doctor.department,
        doctor.qualification,
        doctor.hospital,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [doctors, query, specialization, onlyAvailable]);

  function handleBook(doctor) {
    navigate(`/appointments?book=1&doctor=${encodeURIComponent(doctor.id)}`);
  }

  if (error && !doctors.length) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Find a Doctor" icon={<Stethoscope className="h-5 w-5" />} />
        <ErrorState
          title="Unable to load the doctor directory"
          message={error}
          onRetry={reload}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Find a Doctor"
        description="Browse the specialists available on the platform and book a consultation."
        icon={<Stethoscope className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'Doctors' }]}
      />

      <div className="mb-5">
        <DoctorFilters
          query={query}
          onQueryChange={setQuery}
          specialization={specialization}
          onSpecializationChange={setSpecialization}
          specializations={specializations}
          onlyAvailable={onlyAvailable}
          onOnlyAvailableChange={setOnlyAvailable}
          resultCount={filtered.length}
          totalCount={doctors.length}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No doctors published yet"
          description="The backend has not published any doctor records. Please check back later."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No doctors match your search"
          description="Try a different name, specialisation or clear the filters."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onView={setSelected}
              onBook={handleBook}
            />
          ))}
        </div>
      )}

      <DoctorDetailModal
        doctor={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onBook={handleBook}
      />
    </div>
  );
}

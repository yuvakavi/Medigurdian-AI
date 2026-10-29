import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Download,
  Eye,
  FileImage,
  FileText,
  Info,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import MedicalDisclaimer from '../components/common/MedicalDisclaimer';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import { SkeletonCard } from '../components/common/Skeleton';
import { useToast } from '../context/ToastContext';
import {
  analyzeReport,
  deleteReport,
  fetchReport,
  fetchReports,
  getReportFile,
  uploadReport,
} from '../services/reportService';
import { formatDate, formatDateTime } from '../utils/format';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];

function extensionOf(name) {
  return String(name || '').split('.').pop()?.toLowerCase() || '';
}

function fileTypeLabel(name, fallback) {
  if (fallback) return fallback;

  const extension = extensionOf(name);
  if (extension === 'pdf') return 'PDF';
  if (extension === 'png') return 'PNG image';
  if (extension === 'jpg' || extension === 'jpeg') return 'JPEG image';
  return 'Document';
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function reportTimestamp(report) {
  return report?.created_at || report?.uploaded_at || null;
}

function sortReports(items) {
  return [...items].sort((left, right) => {
    const a = new Date(reportTimestamp(left) || 0).getTime();
    const b = new Date(reportTimestamp(right) || 0).getTime();
    return b - a;
  });
}

function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'medical-report';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function ReportTypeIcon({ report, className = 'h-5 w-5' }) {
  const extension = extensionOf(report?.file_name);
  const Icon = ['png', 'jpg', 'jpeg'].includes(extension)
    ? FileImage
    : FileText;

  return <Icon className={className} aria-hidden="true" />;
}

const VALUE_STATUS_TONES = {
  'within range': 'emerald',
  'above range': 'rose',
  'below range': 'amber',
  'unable to determine': 'neutral',
};

function valueStatusTone(status) {
  return VALUE_STATUS_TONES[String(status || '').toLowerCase()] || 'neutral';
}

function referenceLabel(value) {
  if (value?.reference_text) return value.reference_text;
  if (value?.reference_min || value?.reference_max) {
    return `${value.reference_min || '—'} – ${value.reference_max || '—'}`;
  }
  return 'Not printed';
}

function analysisBadgeLabel(analysis) {
  if (!analysis) return 'Not generated';
  if (analysis.llm_status === 'used') return 'LLM-assisted';
  if (analysis.llm_status === 'failed') return 'LLM unavailable';
  if (analysis.llm_status === 'not_configured') return 'Rules-based';
  if (analysis.llm_status === 'disabled') return 'Rules-based';
  if (analysis.llm_status === 'not_needed') return 'Rules-based';
  return 'Rules-based';
}

function analysisSourceMessage(analysis) {
  if (!analysis) return '';
  return (
    analysis.llm_message ||
    'This explanation was generated from the extracted report values.'
  );
}

function ReportValuesTable({ values }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-panel">
      <table className="min-w-[900px] text-left text-[12.5px]">
        <thead className="bg-panel-muted text-ink-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">Test</th>
            <th className="px-3 py-2 font-semibold">Result</th>
            <th className="px-3 py-2 font-semibold">Unit</th>
            <th className="px-3 py-2 font-semibold">Printed reference range</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">What it measures</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {values.map((value, index) => (
            <tr key={`${value.parameter}-${index}`}>
              <td className="px-3 py-2 font-medium text-ink">
                {value.parameter}
              </td>
              <td className="px-3 py-2 text-ink">{value.value}</td>
              <td className="px-3 py-2 text-ink-muted">
                {value.unit || 'Not printed'}
              </td>
              <td className="px-3 py-2 text-ink-muted">
                {referenceLabel(value)}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={valueStatusTone(value.status)}>
                    {value.status || 'Unable to determine'}
                  </Badge>
                  {value.needs_review && <Badge tone="amber">Review</Badge>}
                </div>
              </td>
              <td className="max-w-xs px-3 py-2 text-ink-muted">
                {value.explanation ||
                  'No educational description is available for this test.'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const [reports, setReports] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [downloadId, setDownloadId] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadReports = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setListLoading(true);

    setListError('');

    try {
      const data = await fetchReports();
      setReports(sortReports(data));
    } catch (error) {
      setListError(error?.message || 'Unable to load your reports.');
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function clearSelectedFile() {
    setFile(null);
    setUploadProgress(0);
    setUploadError('');

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetUploadForm() {
    clearSelectedFile();
    setTitle('');
    setReportDate('');
  }

  function validateSelectedFile(selected) {
    if (!selected) return 'Choose a report file first.';

    const extension = extensionOf(selected.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return 'Only PDF, PNG, JPG and JPEG files are supported.';
    }

    if (!selected.size) {
      return 'The selected file is empty.';
    }

    if (selected.size > MAX_FILE_SIZE) {
      return 'The file must be 10 MB or smaller.';
    }

    return '';
  }

  function chooseFile(selected) {
    setUploadError('');

    if (!selected) {
      setFile(null);
      return;
    }

    const validationError = validateSelectedFile(selected);

    if (validationError) {
      setFile(null);
      setUploadError(validationError);

      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selected);
    setUploadProgress(0);

    if (!title.trim()) {
      const stem = selected.name.replace(/\.[^.]+$/, '').trim();
      if (stem) setTitle(stem.slice(0, 200));
    }
  }

  function onFileChange(event) {
    chooseFile(event.target.files?.[0] || null);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files?.[0] || null);
  }

  async function handleUpload() {
    if (uploading) return;

    const validationError = validateSelectedFile(file);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const created = await uploadReport(file, {
        title,
        reportDate,
        onProgress: setUploadProgress,
      });

      toast.success(
        created?.report_title
          ? `${created.report_title} uploaded successfully.`
          : 'Report uploaded successfully.',
      );

      resetUploadForm();
      await loadReports({ silent: true });

      if (created?.id) {
        await openDetails(created.id, created);
      }
    } catch (error) {
      setUploadError(error?.message || 'Unable to upload the report.');
    } finally {
      setUploading(false);
    }
  }

  function closeDetails() {
    setDetailsOpen(false);
    setDetailsId(null);
    setDetails(null);
    setDetailsLoading(false);
    setDetailsError('');
    setAnalysisError('');
    setPreviewUrl(null);
    setPreviewType('');
    setPreviewError('');
  }

  async function openDetails(reportId, fallback = null) {
    setDetailsOpen(true);
    setDetailsId(reportId);
    setDetails(fallback || reports.find((report) => report.id === reportId) || null);
    setDetailsLoading(true);
    setDetailsError('');
    setAnalysisError('');
    setPreviewUrl(null);
    setPreviewType('');
    setPreviewError('');

    try {
      const data = await fetchReport(reportId);
      setDetails(data);
    } catch (error) {
      setDetailsError(error?.message || 'Unable to load this report.');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleAnalyze(report) {
    if (!report?.id || analyzingId) return;

    const wasDetailsOpen = detailsOpen && details?.id === report.id;
    setAnalyzingId(report.id);
    setAnalysisError('');

    try {
      const updated = await analyzeReport(report.id);

      setReports((current) =>
        sortReports(
          current.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item,
          ),
        ),
      );
      setDetails(updated);
      setDetailsId(updated.id);
      setDetailsOpen(true);
      toast.success('Report explanation generated.');
    } catch (error) {
      const message = error?.message || 'Unable to analyze this report.';
      setAnalysisError(message);
      toast.error(message);

      if (wasDetailsOpen) {
        try {
          const fresh = await fetchReport(report.id);
          setDetails(fresh);
        } catch {
          // Keep the existing details; the toast already explains the failure.
        }
      }

      await loadReports({ silent: true });
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDownload(report) {
    if (!report?.id) return;

    setDownloadId(report.id);

    try {
      const { blob, filename } = await getReportFile(report.id);
      triggerBrowserDownload(
        blob,
        filename || report.file_name || 'medical-report',
      );
      toast.success('Download started.');
    } catch (error) {
      toast.error(error?.message || 'Unable to download the report.');
    } finally {
      setDownloadId(null);
    }
  }

  async function handlePreview(report) {
    if (!report?.id) return;

    setPreviewLoading(true);
    setPreviewError('');

    try {
      const { blob } = await getReportFile(report.id, { inline: true });
      const nextUrl = URL.createObjectURL(blob);

      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setPreviewType(
        blob.type || (extensionOf(report.file_name) === 'pdf'
          ? 'application/pdf'
          : 'image/*'),
      );
    } catch (error) {
      setPreviewError(error?.message || 'Unable to preview this report.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id || deleting) return;

    setDeleting(true);

    try {
      await deleteReport(deleteTarget.id);
      toast.success('Report deleted.');

      if (details?.id === deleteTarget.id) closeDetails();

      setDeleteTarget(null);
      await loadReports({ silent: true });
    } catch (error) {
      toast.error(error?.message || 'Unable to delete this report.');
    } finally {
      setDeleting(false);
    }
  }

  const today = todayInputValue();
  const selectedExtension = extensionOf(file?.name);
  const SelectedIcon = ['png', 'jpg', 'jpeg'].includes(selectedExtension)
    ? FileImage
    : FileText;
  const detailPreviewIsPdf = previewType.includes('pdf');
  const detailAnalysis = details?.analysis || null;
  const detailValues =
    detailAnalysis?.values?.length > 0
      ? detailAnalysis.values
      : details?.values || [];
  const detailAnalyzing = Boolean(
    details?.id &&
      (analyzingId === details.id || details.status === 'processing'),
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Medical Reports"
        description="Upload, analyze and securely manage your laboratory reports."
        icon={<FileText className="h-5 w-5" />}
        breadcrumb={[
          { label: 'Dashboard', to: '/' },
          { label: 'Medical Reports' },
        ]}
      />

      <MedicalDisclaimer
        title="Private health documents"
        message="Only upload reports you are comfortable storing securely. Reports and explanations are visible only to your authenticated account. Explanations are informational, use the reference ranges printed on the report, and do not replace your doctor's interpretation or provide a diagnosis."
        className="mb-5"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Upload a report</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Add a lab report, scan or discharge summary to your private
                history.
              </p>
            </div>
            <Badge tone="violet" dot>
              Private
            </Badge>
          </div>

          <div className="mt-5">
            <label
              htmlFor="report-file"
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={[
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-5 py-8 text-center transition',
                dragActive
                  ? 'border-lavender-500 bg-lavender-50 dark:border-lavender-400 dark:bg-lavender-950/40'
                  : 'border-hairline bg-panel-muted/60 hover:border-lavender-300 hover:bg-panel',
              ].join(' ')}
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-lavender-100 text-lavender-700 dark:bg-lavender-950/60 dark:text-lavender-300">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>

              <span>
                <span className="block text-sm font-semibold text-ink">
                  {dragActive
                    ? 'Drop your report here'
                    : 'Choose a report or drag and drop it here'}
                </span>
                <span className="mt-1 block text-[12.5px] text-ink-muted">
                  PDF, PNG, JPG or JPEG · up to 10 MB
                </span>
              </span>

              <input
                id="report-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={onFileChange}
                disabled={uploading}
                className="sr-only"
              />
            </label>

            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-hairline bg-panel-muted/60 px-3.5 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-panel text-lavender-700 dark:text-lavender-300">
                  <SelectedIcon className="h-5 w-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {formatFileSize(file.size)} ·{' '}
                    {fileTypeLabel(file.name).toUpperCase()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedFile}
                  disabled={uploading}
                  className="rounded-lg p-1.5 text-ink-faint transition hover:bg-panel-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Report title"
                name="report-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Complete blood count"
                maxLength={200}
                disabled={uploading}
                hint="Optional — defaults to the file name."
              />

              <Input
                label="Report date"
                name="report-date"
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                max={today}
                disabled={uploading}
                hint="Optional — the date shown on the report."
              />
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-ink-muted">
                  <span>Uploading securely…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <progress
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full accent-lavender-600"
                  value={uploadProgress}
                  max="100"
                  aria-label="Report upload progress"
                >
                  {uploadProgress}%
                </progress>
              </div>
            )}

            {uploadError && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {uploadError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={!file || uploading}
                iconLeft={<Upload className="h-4 w-4" />}
              >
                {uploading ? 'Uploading…' : 'Upload report'}
              </Button>

              {(file || title || reportDate) && !uploading && (
                <Button variant="ghost" onClick={resetUploadForm}>
                  Reset
                </Button>
              )}

              <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                Stored privately
              </span>
            </div>
          </div>
        </Card>

        <Card className="h-fit">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-base font-bold text-ink">Your privacy</h2>
          </div>

          <ul className="mt-4 space-y-3 text-[12.5px] leading-relaxed text-ink-muted">
            <li className="flex items-start gap-2.5">
              <LockKeyhole
                className="mt-0.5 h-4 w-4 shrink-0 text-lavender-600"
                aria-hidden="true"
              />
              Files stay in a private storage bucket. No public or permanent
              download links are created.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              Every list, detail, preview and download request is checked
              against your authenticated patient profile.
            </li>
            <li className="flex items-start gap-2.5">
              <Bot
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint"
                aria-hidden="true"
              />
              Explanations are generated only when you choose Analyze. They
              use the values and printed reference ranges found in the report;
              a rules-based or LLM-assisted label tells you which method was
              used.
            </li>
          </ul>

          <div className="mt-4 rounded-lg bg-panel-muted px-3.5 py-3 text-[12px] leading-relaxed text-ink-muted">
            Maximum file size: 10 MB. Supported formats: PDF, PNG, JPG and
            JPEG.
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Report history</h2>
              {!listLoading && reports.length > 0 && (
                <Badge tone="neutral">{reports.length}</Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm text-ink-muted">
              Newest uploads appear first. Select a report to view its metadata.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReports({ silent: true })}
            loading={refreshing}
            iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>

        {listError && reports.length > 0 && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{listError}</span>
            <button
              type="button"
              onClick={() => loadReports({ silent: true })}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-4">
          {listLoading && reports.length === 0 ? (
            <div className="space-y-3" aria-label="Loading reports">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : listError && reports.length === 0 ? (
            <ErrorState
              title="Unable to load reports"
              message={listError}
              onRetry={loadReports}
              compact
            />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Uploaded laboratory reports and scans will appear here with their metadata and available explanations."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  iconLeft={<Upload className="h-3.5 w-3.5" />}
                >
                  Choose a report
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lavender-50 text-lavender-700 dark:bg-lavender-950/50 dark:text-lavender-300">
                      <ReportTypeIcon report={report} />
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-ink">
                          {report.report_title || report.file_name}
                        </h3>
                        <StatusBadge status={report.status} />
                        {report.has_ai_explanation && (
                          <Badge tone="violet">Explanation ready</Badge>
                        )}
                      </div>

                      <p className="mt-1 truncate text-[12.5px] text-ink-muted">
                        {report.report_type ||
                          fileTypeLabel(report.file_name, report.file_type)}
                        {report.file_name && (
                          <span className="text-ink-faint">
                            {' / '}
                            {fileTypeLabel(report.file_name, report.file_type)}
                          </span>
                        )}
                        {report.file_name && (
                          <span className="text-ink-faint">
                            {' '}
                            · {report.file_name}
                          </span>
                        )}
                      </p>

                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Report date:{' '}
                          {report.report_date
                            ? formatDate(report.report_date)
                            : 'Not provided'}
                        </span>
                        <span>
                          Uploaded {formatDateTime(reportTimestamp(report))}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-14 sm:pl-0">
                    {report.status === 'processing' ? (
                      <Button
                        variant="outline"
                        size="xs"
                        loading
                        iconLeft={<Bot className="h-3.5 w-3.5" />}
                      >
                        Analyzing
                      </Button>
                    ) : report.has_ai_explanation ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => openDetails(report.id)}
                        iconLeft={<Bot className="h-3.5 w-3.5" />}
                      >
                        Explain
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleAnalyze(report)}
                        loading={analyzingId === report.id}
                        iconLeft={<Bot className="h-3.5 w-3.5" />}
                      >
                        {report.status === 'failed' ? 'Retry analysis' : 'Analyze'}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openDetails(report.id)}
                      iconLeft={<Eye className="h-3.5 w-3.5" />}
                    >
                      Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDownload(report)}
                      loading={downloadId === report.id}
                      iconLeft={<Download className="h-3.5 w-3.5" />}
                    >
                      Download
                    </Button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(report)}
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                      aria-label={`Delete ${report.report_title || report.file_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Modal
        open={detailsOpen}
        onClose={closeDetails}
        title={details?.report_title || 'Report details'}
        description={
          details
            ? `${fileTypeLabel(details.file_name, details.file_type)} · ${
                details.file_name
              }`
            : 'Loading report metadata…'
        }
        size="xl"
        footer={
          details && (
            <>
              <Button variant="ghost" onClick={closeDetails}>
                Close
              </Button>
              <Button
                variant="danger-outline"
                onClick={() => setDeleteTarget(details)}
                iconLeft={<Trash2 className="h-4 w-4" />}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePreview(details)}
                loading={previewLoading}
                iconLeft={<Eye className="h-4 w-4" />}
              >
                {previewUrl ? 'Reload preview' : 'Preview'}
              </Button>
              <Button
                onClick={() => handleDownload(details)}
                loading={downloadId === details.id}
                iconLeft={<Download className="h-4 w-4" />}
              >
                Download original
              </Button>
            </>
          )
        }
      >
        {detailsLoading && !details ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : detailsError ? (
          <ErrorState
            title="Unable to load this report"
            message={detailsError}
            onRetry={() => openDetails(detailsId)}
            compact
          />
        ) : details ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline bg-panel-muted/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Report date
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {details.report_date
                    ? formatDate(details.report_date)
                    : 'Not provided'}
                </p>
              </div>

              <div className="rounded-xl border border-hairline bg-panel-muted/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Uploaded
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {formatDateTime(reportTimestamp(details))}
                </p>
              </div>

              <div className="rounded-xl border border-hairline bg-panel-muted/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  File
                </p>
                <p className="mt-1 truncate text-sm font-medium text-ink">
                  {details.file_name}
                </p>
              </div>

              <div className="rounded-xl border border-hairline bg-panel-muted/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={details.status} />
                </div>
              </div>
            </div>

            {detailAnalysis ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-4 dark:border-violet-900/60 dark:bg-violet-950/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Bot
                        className="h-4 w-4 text-violet-600 dark:text-violet-300"
                        aria-hidden="true"
                      />
                      Report explanation
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                      {analysisSourceMessage(detailAnalysis)}
                    </p>
                    {detailAnalysis.generated_at && (
                      <p className="mt-1 text-[11px] text-ink-faint">
                        Generated {formatDateTime(detailAnalysis.generated_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        detailAnalysis.llm_status === 'used'
                          ? 'violet'
                          : 'neutral'
                      }
                    >
                      {analysisBadgeLabel(detailAnalysis)}
                    </Badge>
                    {detailAnalysis.ocr_used && (
                      <Badge tone="amber">OCR used</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleAnalyze(details)}
                      loading={detailAnalyzing}
                      iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      {detailAnalyzing ? 'Regenerating…' : 'Regenerate'}
                    </Button>
                  </div>
                </div>

                {analysisError && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    {analysisError}
                  </p>
                )}

                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                  {detailAnalysis.summary}
                </p>

                {detailValues.length > 0 ? (
                  <ReportValuesTable values={detailValues} />
                ) : (
                  <p className="mt-3 rounded-lg bg-panel px-3 py-2 text-[12.5px] leading-relaxed text-ink-muted">
                    No structured values were detected. Check the original report
                    and the uncertainties below.
                  </p>
                )}

                {detailAnalysis.uncertainties?.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <h4 className="flex items-center gap-2 text-[13px] font-bold text-ink">
                      <AlertTriangle
                        className="h-4 w-4 text-amber-600 dark:text-amber-300"
                        aria-hidden="true"
                      />
                      Needs review
                    </h4>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink-soft">
                      {detailAnalysis.uncertainties.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {detailAnalysis.questions?.length > 0 && (
                  <div className="mt-4 rounded-xl border border-hairline bg-panel px-3.5 py-3">
                    <h4 className="text-[13px] font-bold text-ink">
                      Questions to ask a clinician
                    </h4>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink-soft">
                      {detailAnalysis.questions.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {detailAnalysis.disclaimer && (
                  <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
                    {detailAnalysis.disclaimer}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-hairline bg-panel-muted/60 px-4 py-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Bot
                    className="h-4 w-4 text-ink-faint"
                    aria-hidden="true"
                  />
                  Report explanation
                </h3>

                {detailAnalyzing ? (
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-muted">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                      aria-hidden="true"
                    />
                    Analyzing the report and extracting values…
                  </div>
                ) : (
                  <>
                    {details.ai_explanation ? (
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                        {details.ai_explanation}
                      </p>
                    ) : (
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                        {details.status === 'failed'
                          ? 'The last analysis attempt failed. You can retry without uploading the file again.'
                          : 'No explanation has been generated for this report yet. Generate one from the report’s extracted values.'}
                      </p>
                    )}

                    {analysisError && (
                      <p
                        role="alert"
                        className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        {analysisError}
                      </p>
                    )}

                    {detailValues.length > 0 && (
                      <ReportValuesTable values={detailValues} />
                    )}

                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyze(details)}
                        loading={detailAnalyzing}
                        iconLeft={<Bot className="h-4 w-4" />}
                      >
                        {details.status === 'failed'
                          ? 'Retry analysis'
                          : 'Generate explanation'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {details.extracted_text && (
              <details className="rounded-xl border border-hairline bg-panel px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Extracted report text
                </summary>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                  This is the raw text used for extraction. It may contain
                  personal details printed on the original report and is shown
                  only to you.
                </p>
                <pre className="scrollbar-slim mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-ink-muted">
                  {details.extracted_text}
                </pre>
              </details>
            )}

            {previewError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {previewError}
              </p>
            )}

            {previewUrl && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-ink">Preview</h3>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                      setPreviewType('');
                    }}
                    className="rounded-md p-1 text-ink-faint transition hover:bg-panel-sunken hover:text-ink"
                    aria-label="Close report preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 overflow-hidden rounded-xl border border-hairline bg-panel-muted">
                  {detailPreviewIsPdf ? (
                    <iframe
                      src={previewUrl}
                      title={`Preview of ${details.file_name}`}
                      className="h-[58vh] min-h-72 w-full"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt={`Preview of ${details.file_name}`}
                      className="mx-auto max-h-[58vh] w-auto object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            <MedicalDisclaimer
              title="About explanations"
              message="Any explanation shown here is informational only. It is not a diagnosis, does not replace a clinician's review, and should be discussed with a qualified healthcare professional."
              tone="neutral"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Info className="h-4 w-4" aria-hidden="true" />
            Select a report to view its details.
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete this report?"
        description="The report record and its private stored file will be removed. This cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              iconLeft={<Trash2 className="h-4 w-4" />}
            >
              Delete report
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30">
            <p className="text-sm font-semibold text-ink">
              {deleteTarget.report_title || deleteTarget.file_name}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              {fileTypeLabel(deleteTarget.file_name, deleteTarget.file_type)}
              {deleteTarget.report_date
                ? ` · ${formatDate(deleteTarget.report_date)}`
                : ''}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

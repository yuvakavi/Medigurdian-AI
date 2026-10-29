import apiClient from './httpClient';

/**
 * Medical report service.
 *
 * Metadata is stored in the patient-scoped Supabase table. Files are kept in
 * a private bucket and are only reachable through these authenticated API
 * methods — no storage path or public URL is returned to the browser.
 */

export async function uploadReport(
  file,
  { title = '', reportDate = '', onProgress, signal } = {},
) {
  const formData = new FormData();
  formData.append('file', file, file.name);

  if (title.trim()) {
    formData.append('title', title.trim());
  }

  if (reportDate) {
    formData.append('report_date', reportDate);
  }

  const { data } = await apiClient.post('/reports/upload', formData, {
    timeout: 120000,
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    },
    signal,
  });

  return data;
}

export async function fetchReports() {
  const { data } = await apiClient.get('/reports/me');
  return Array.isArray(data) ? data : [];
}

export async function fetchReport(reportId) {
  const { data } = await apiClient.get(`/reports/${reportId}`);
  return data;
}

export async function analyzeReport(reportId) {
  const { data } = await apiClient.post(`/reports/${reportId}/analyze`, null, {
    timeout: 180000,
  });
  return data;
}

function filenameFromDisposition(header, fallback) {
  if (!header) return fallback;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);

  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
    } catch {
      return fallback;
    }
  }

  const simple = /filename="?([^";]+)"?/i.exec(header);
  return simple?.[1]?.trim() || fallback;
}

export async function getReportFile(reportId, { inline = false } = {}) {
  const response = await apiClient.get(`/reports/${reportId}/download`, {
    params: inline ? { inline: true } : undefined,
    responseType: 'blob',
    timeout: 60000,
  });

  return {
    blob: response.data,
    filename: filenameFromDisposition(
      response.headers?.['content-disposition'],
      'medical-report',
    ),
  };
}

export async function deleteReport(reportId) {
  const { data } = await apiClient.delete(`/reports/${reportId}`);
  return data;
}

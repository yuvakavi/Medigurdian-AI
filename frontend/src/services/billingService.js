import apiClient from './httpClient';

/**
 * Billing service.
 *
 * Backend route (app/api/billing.py):
 *   GET /api/billing/ -> {
 *     success: boolean,
 *     implemented: boolean,
 *     message: string,
 *     patient_id: string,
 *     billing: Array<{
 *       id, patient_id, invoice_number, amount,
 *       payment_status, payment_method, description,
 *       billing_date, due_date, created_at
 *     }>
 *   }
 *
 * There is no payment-processing endpoint, so invoices are read-only.
 */

export async function fetchBilling() {
  const { data } = await apiClient.get('/billing/');
  return {
    ...data,
    billing: Array.isArray(data?.billing) ? data.billing : [],
  };
}

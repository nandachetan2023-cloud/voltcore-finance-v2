'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Shared company profile (logo + registered address + statutory + bank
 * details) — one source of truth, configured once in Settings › Branding
 * and Settings › Registered Address, consumed by every printable document
 * across Finance, Procurement, and Sales (invoices, payment advices,
 * credit notes, POs) instead of each screen hardcoding its own copy.
 *
 * Backed by the existing `CompanySettings` key-value table via /api/settings
 * — no new storage, no new endpoint.
 */
export interface CompanyProfile {
  logoUrl: string | null;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  /** Single-line address, ready to drop into a document header. */
  address: string;
  email: string;
  phone: string;
  pan: string;
  gstin: string;
  stateCode: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  /** Optional line under the company name in a document header, e.g. "Heavy Fabrication & Engineering". */
  tagline: string;
  /** Short line at the bottom of a document, e.g. "This is a computer-generated document. E. & O.E." */
  footerNote: string;
  /** Legal declaration paragraph on GST tax invoices. */
  declaration: string;
  /** Terms & Conditions, one per line — split into a list where a document renders them. */
  terms: string[];
  /** Label under the signature line, e.g. "Authorized Signatory". */
  signatoryLabel: string;
  loading: boolean;
  refresh: () => void;
}

export function useCompanyProfile(): CompanyProfile {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => { if (j.success) setSettings(j.data.settings || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onChanged = () => load();
    window.addEventListener('company-profile:changed', onChanged);
    return () => window.removeEventListener('company-profile:changed', onChanged);
  }, [load]);

  const g = (k: string) => settings[k] || '';
  const addressParts = [
    g('address_line1'),
    g('address_line2'),
    [g('city'), g('state')].filter(Boolean).join(', '),
    g('pincode'),
    g('country'),
  ].filter(Boolean);

  return {
    logoUrl: settings.logo_url || null,
    name: g('company_name'),
    addressLine1: g('address_line1'),
    addressLine2: g('address_line2'),
    city: g('city'),
    state: g('state'),
    pincode: g('pincode'),
    country: g('country'),
    address: addressParts.join(', '),
    email: g('admin_email') || g('hr_email'),
    phone: g('support_phone') || g('hr_phone'),
    pan: g('pan'),
    gstin: g('gst'),
    stateCode: g('gst').slice(0, 2),
    bankName: g('bank_name'),
    bankAccount: g('bank_account'),
    bankIfsc: g('bank_ifsc'),
    tagline: g('doc_tagline'),
    footerNote: g('doc_footer_note'),
    declaration: g('doc_declaration'),
    terms: g('doc_terms').split('\n').map((t) => t.trim()).filter(Boolean),
    signatoryLabel: g('doc_signatory_label') || 'Authorized Signatory',
    loading,
    refresh: load,
  };
}

/** Call after saving the logo or address so every open document/dashboard refetches. */
export function notifyCompanyProfileChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('company-profile:changed'));
  }
}

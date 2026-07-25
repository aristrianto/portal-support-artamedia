import React from 'react';
import OperationsLog, { STATUSES, PRIORITIES } from '@/components/OperationsLog';

const SHIFTS = ['Morning', 'Afternoon', 'Night'];

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  shift: 'Morning',
  officer: '',
  customer_id: null,
  site: '',
  issue: '',
  action_taken: '',
  status: 'Open',
  priority: 'Medium',
  notes_next_shift: '',
};

const columns = [
  { key: 'date', label: 'Tanggal', mono: true },
  { key: 'shift', label: 'Shift' },
  { key: 'officer', label: 'Petugas' },
  { key: 'customer_id', label: 'Pelanggan', render: (r, cmap) => cmap[r.customer_id] || (r.site || '-') },
  { key: 'issue', label: 'Kendala', render: (r) => <span className="line-clamp-1">{r.issue}</span> },
  { key: 'priority', label: 'Prioritas', type: 'priority' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { name: 'date', label: 'Tanggal', type: 'date', required: true },
  { name: 'shift', label: 'Shift', type: 'select', options: SHIFTS, required: true },
  { name: 'officer', label: 'Nama Petugas', required: true, full: true },
  { name: 'customer_id', label: 'Pelanggan', type: 'customer', full: true },
  { name: 'site', label: 'Site / Lokasi', full: true },
  { name: 'issue', label: 'Detail Kendala', type: 'textarea', required: true, full: true, rows: 3 },
  { name: 'action_taken', label: 'Tindakan Dilakukan', type: 'textarea', full: true, rows: 3 },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'priority', label: 'Prioritas', type: 'select', options: PRIORITIES },
  { name: 'notes_next_shift', label: 'Catatan untuk Shift Berikutnya', type: 'textarea', full: true, rows: 2 },
];

export default function ShiftHandover() {
  return (
    <OperationsLog
      moduleKey="shift"
      title="Shift Handover"
      description="Catatan serah terima antar shift NOC."
      endpoint="shift-handovers"
      columns={columns}
      empty={EMPTY}
      formFields={formFields}
    />
  );
}

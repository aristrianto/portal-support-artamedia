import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Download, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, Ticket, Timer, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import api, { formatApiError } from '@/lib/api';
import { PriorityBadge } from '@/components/StatusBadge';
import Breadcrumb from '@/components/Breadcrumb';
import ProviderFilter from '@/components/ProviderFilter';
import { useAuth } from '@/context/AuthContext';
import { useCounts } from '@/context/CountsContext';
import { CRUD } from '@/constants/testIds';
import { cn } from '@/lib/utils';
import { BROADBAND_STATUSES, TicketStatusBadge, WorkflowTracker, slaInfo, nowLocalIso } from './ticketCommon';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const ISSUE_CATEGORIES = ['Link Down', 'Slow Speed', 'Intermittent', 'Package Change', 'Billing', 'Installation', 'Lainnya'];
const MOD = 'crm-broadband';

const EMPTY = {
  ticket_number: '', customer_id: null, cid: '', partner_id: null, package: '',
  issue_category: 'Link Down', priority: 'Medium', status: 'Open', engineer: '',
  open_time: '', close_time: '', sla_target_minutes: 240, description: '',
  timeline: [], attachments: [],
};

const genTicketNumber = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `BB-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rnd}`;
};

export default function BroadbandTicket() {
  const { canWrite, canDelete, user } = useAuth();
  const { refresh: refreshCounts } = useCounts();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const cmap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const pmap = useMemo(() => Object.fromEntries(partners.map((p) => [p.id, p])), [partners]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (q) params.q = q;
      if (status !== 'all') params.status = status;
      const { data } = await api.get('/crm/broadband-tickets', { params });
      setItems(data.items || []); setTotal(data.total || 0);
    } catch (err) { toast.error(formatApiError(err)); } finally { setLoading(false); }
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/customers', { params: { page_size: 500 } }).then(({ data }) => setCustomers(data.items || []));
    api.get('/partners', { params: { category: 'Broadband', page_size: 500 } }).then(({ data }) => setPartners(data.items || []));
  }, []);

  const filteredByPrio = priority === 'all' ? items : items.filter((i) => i.priority === priority);
  const getProvider = (it) => (it.partner_id && pmap[it.partner_id]?.name) || null;
  const filteredItems = useMemo(() => {
    if (providerFilter === 'all') return filteredByPrio;
    if (providerFilter === '__none__') return filteredByPrio.filter((it) => !getProvider(it));
    return filteredByPrio.filter((it) => getProvider(it) === providerFilter);
  }, [filteredByPrio, providerFilter, pmap]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, ticket_number: genTicketNumber(), open_time: nowLocalIso() });
    setErrors({}); setOpenForm(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...EMPTY, ...row, customer_id: row.customer_id || null, partner_id: row.partner_id || null });
    setErrors({}); setOpenForm(true);
  };
  const openDetail = (row) => { setEditing(row); setForm({ ...EMPTY, ...row }); setOpenView(true); };

  const validate = () => {
    const e = {};
    if (!form.ticket_number?.trim()) e.ticket_number = 'Nomor tiket wajib';
    if (!form.customer_id) e.customer_id = 'Customer wajib';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // fill CID/package automatically if empty
      const cust = cmap[form.customer_id];
      const payload = {
        ...form,
        cid: form.cid || cust?.connected_services?.find?.((cs) => cs.category === 'Broadband')?.cid || '',
        sla_target_minutes: form.sla_target_minutes ? Number(form.sla_target_minutes) : null,
        open_time: form.open_time || null,
        close_time: form.close_time || null,
      };
      if (editing) { await api.put(`/crm/broadband-tickets/${editing.id}`, payload); toast.success('Tiket diperbarui'); }
      else { await api.post('/crm/broadband-tickets', payload); toast.success('Tiket dibuat'); }
      setOpenForm(false); load(); refreshCounts();
    } catch (err) { toast.error(formatApiError(err)); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await api.delete(`/crm/broadband-tickets/${deleteId}`); toast.success('Tiket dihapus'); setDeleteId(null); load(); refreshCounts(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const advanceStatus = async (nextStatus) => {
    if (!editing) return;
    const now = new Date().toISOString();
    const timeline = [...(form.timeline || []), { at: now, by: user?.email || 'system', event: `Status → ${nextStatus}`, detail: '' }];
    const payload = { ...form, status: nextStatus, timeline };
    if (nextStatus === 'Closed' && !form.close_time) payload.close_time = nowLocalIso();
    try {
      await api.put(`/crm/broadband-tickets/${editing.id}`, payload);
      setForm(payload);
      setEditing({ ...editing, ...payload });
      load(); toast.success(`Status → ${nextStatus}`);
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const addTimelineNote = async () => {
    if (!timelineNote.trim() || !editing) return;
    const now = new Date().toISOString();
    const timeline = [...(form.timeline || []), { at: now, by: user?.email || 'system', event: 'Note', detail: timelineNote.trim() }];
    const payload = { ...form, timeline };
    try {
      await api.put(`/crm/broadband-tickets/${editing.id}`, payload);
      setForm(payload); setTimelineNote('');
      toast.success('Catatan ditambahkan');
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran maks 2MB'); return; }
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
    setForm((f) => ({ ...f, attachments: [...(f.attachments || []), { name: file.name, type: file.type, size: file.size, base64: b64 }] }));
  };

  const exportCsv = () => {
    const headers = ['Ticket#', 'Customer', 'CID', 'Provider', 'Package', 'Category', 'Priority', 'Status', 'Engineer', 'Open', 'Close'];
    const rows = items.map((i) => [
      i.ticket_number, cmap[i.customer_id]?.company_name || '-', i.cid,
      pmap[i.partner_id]?.name || '-', i.package, i.issue_category, i.priority, i.status,
      i.engineer, i.open_time, i.close_time,
    ].map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `broadband-tickets-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'CRM' }, { label: 'Customer Broadband Ticket' }]} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Customer Broadband Ticket</h1>
          <p className="text-sm text-muted-foreground mt-1">Ticketing untuk pelanggan Broadband dengan workflow: Open → Progress → Monitoring → Resolved → Closed.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} data-testid={CRUD.export(MOD)}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
          {canWrite && <Button size="sm" onClick={openCreate} data-testid={CRUD.addBtn(MOD)}><Plus className="w-4 h-4 mr-1.5" /> Buat Tiket</Button>}
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid={CRUD.search(MOD)} placeholder="Cari ticket#, CID, engineer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9 h-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua Status</SelectItem>{BROADBAND_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v)}>
              <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua Prioritas</SelectItem>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <ProviderFilter items={items} getProvider={getProvider} value={providerFilter} onChange={setProviderFilter} testKey={MOD} />

          <div className="border border-border rounded-md overflow-x-auto">
            <Table data-testid={CRUD.table(MOD)}>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Ticket#</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">SLA</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
                {!loading && filteredItems.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground"><Ticket className="w-6 h-6 mx-auto mb-1 opacity-60" />Belum ada tiket.</TableCell></TableRow>}
                {!loading && filteredItems.map((it) => {
                  const sla = slaInfo(it.open_time, it.sla_target_minutes, it.status === 'Closed');
                  return (
                    <TableRow key={it.id} data-testid={CRUD.row(MOD, it.id)} className="hover:bg-accent/40 cursor-pointer" onClick={() => openDetail(it)}>
                      <TableCell className="font-mono text-xs">{it.ticket_number}</TableCell>
                      <TableCell className="text-sm"><div className="font-medium truncate">{cmap[it.customer_id]?.company_name || '-'}</div><div className="text-[10px] text-muted-foreground font-mono">{it.cid || '-'}</div></TableCell>
                      <TableCell className="text-sm truncate max-w-[140px]">{pmap[it.partner_id]?.name || '-'}</TableCell>
                      <TableCell className="text-xs">{it.issue_category || '-'}</TableCell>
                      <TableCell><PriorityBadge value={it.priority} /></TableCell>
                      <TableCell><TicketStatusBadge value={it.status} /></TableCell>
                      <TableCell className="text-xs">{sla ? <span className={cn('flex items-center gap-1', sla.color)}><Timer className="w-3 h-3" />{sla.label}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDetail(it)} data-testid={CRUD.viewBtn(MOD, it.id)}><Eye className="w-4 h-4" /></Button>
                          {canWrite && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)} data-testid={CRUD.editBtn(MOD, it.id)}><Pencil className="w-4 h-4" /></Button>}
                          {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setDeleteId(it.id)} data-testid={CRUD.deleteBtn(MOD, it.id)}><Trash2 className="w-4 h-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>Menampilkan {filteredItems.length} dari {total} tiket</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="tabular-nums">Hal. {page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <Sheet open={openForm} onOpenChange={setOpenForm}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit' : 'Buat'} Broadband Ticket</SheetTitle>
            <SheetDescription>Workflow: Open → Progress → Monitoring → Resolved → Closed</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <F label="Ticket Number *" error={errors.ticket_number}><Input value={form.ticket_number} onChange={(e) => setForm({ ...form, ticket_number: e.target.value })} className="font-mono" /></F>
            <F label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Customer *" full error={errors.customer_id}>
              <Select value={form.customer_id || 'none'} onValueChange={(v) => {
                const c = customers.find((x) => x.id === v);
                setForm({ ...form, customer_id: v === 'none' ? null : v, cid: (c?.connected_services || []).find?.((cs) => cs.category === 'Broadband')?.cid || form.cid });
              }}>
                <SelectTrigger><SelectValue placeholder="Pilih customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Pilih —</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.sid})</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="CID"><Input value={form.cid} onChange={(e) => setForm({ ...form, cid: e.target.value })} className="font-mono" /></F>
            <F label="Provider">
              <Select value={form.partner_id || 'none'} onValueChange={(v) => setForm({ ...form, partner_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Pilih provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada —</SelectItem>
                  {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Package"><Input value={form.package} placeholder="mis. Home 100M" onChange={(e) => setForm({ ...form, package: e.target.value })} /></F>
            <F label="Issue Category">
              <Select value={form.issue_category} onValueChange={(v) => setForm({ ...form, issue_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ISSUE_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Assigned Engineer"><Input value={form.engineer} onChange={(e) => setForm({ ...form, engineer: e.target.value })} /></F>
            <F label="SLA Target (menit)"><Input type="number" value={form.sla_target_minutes ?? ''} onChange={(e) => setForm({ ...form, sla_target_minutes: e.target.value })} /></F>
            <F label="Open Time"><Input type="datetime-local" value={form.open_time || ''} onChange={(e) => setForm({ ...form, open_time: e.target.value })} /></F>
            <F label="Close Time"><Input type="datetime-local" value={form.close_time || ''} onChange={(e) => setForm({ ...form, close_time: e.target.value })} /></F>
            <F label="Status" full>
              <WorkflowTracker statuses={BROADBAND_STATUSES} current={form.status} onSet={(s) => setForm({ ...form, status: s })} />
            </F>
            <F label="Deskripsi Issue" full><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></F>
            <F label="Lampiran (max 2MB per file)" full>
              <label>
                <input type="file" className="hidden" onChange={onFile} />
                <div className="cursor-pointer border border-dashed border-border rounded-md px-3 py-3 text-center text-xs text-muted-foreground hover:bg-accent/40 transition-colors flex items-center justify-center gap-2">
                  <Paperclip className="w-3.5 h-3.5" /> Tambah lampiran
                </div>
              </label>
              {form.attachments?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.attachments.map((a, i) => (
                    <li key={i} className="text-xs flex items-center justify-between p-1.5 rounded border border-border bg-muted/30">
                      <span className="truncate">{a.name} <span className="text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span></span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </F>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} data-testid={CRUD.saveBtn(MOD)}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Detail View */}
      <Sheet open={openView} onOpenChange={setOpenView}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono">{editing?.ticket_number}</SheetTitle>
            <SheetDescription>{cmap[editing?.customer_id]?.company_name} · CID {editing?.cid || '-'}</SheetDescription>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 py-4">
              <WorkflowTracker statuses={BROADBAND_STATUSES} current={editing.status} onSet={canWrite ? advanceStatus : null} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <I k="Priority" v={<PriorityBadge value={editing.priority} />} />
                <I k="Category" v={editing.issue_category || '-'} />
                <I k="Provider" v={pmap[editing.partner_id]?.name || '-'} />
                <I k="Package" v={editing.package || '-'} />
                <I k="Engineer" v={editing.engineer || '-'} />
                <I k="SLA" v={(() => { const s = slaInfo(editing.open_time, editing.sla_target_minutes, editing.status === 'Closed'); return s ? <span className={s.color}>{s.label}</span> : '-'; })()} />
                <I k="Open" v={editing.open_time || '-'} />
                <I k="Close" v={editing.close_time || '-'} />
              </div>
              {editing.description && <div className="p-3 rounded-md border border-border bg-muted/30 text-sm"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Deskripsi</div>{editing.description}</div>}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Timeline</div>
                {(editing.timeline || []).length === 0 ? <div className="text-xs text-muted-foreground py-2">Belum ada aktivitas.</div> : (
                  <ol className="relative border-l border-border pl-4 space-y-3">
                    {editing.timeline.map((t, i) => (
                      <li key={i} className="text-xs">
                        <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary/60" />
                        <div className="font-medium">{t.event}</div>
                        <div className="text-muted-foreground text-[11px]">{new Date(t.at).toLocaleString()} · {t.by}</div>
                        {t.detail && <div className="mt-0.5">{t.detail}</div>}
                      </li>
                    ))}
                  </ol>
                )}
                {canWrite && (
                  <div className="mt-3 flex gap-2">
                    <Input placeholder="Tambah catatan / update…" value={timelineNote} onChange={(e) => setTimelineNote(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" onClick={addTimelineNote} disabled={!timelineNote.trim()}>Tambah</Button>
                  </div>
                )}
              </div>
              {editing.attachments?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Lampiran</div>
                  <ul className="space-y-1.5">
                    {editing.attachments.map((a, i) => (
                      <li key={i} className="text-xs">
                        <a href={a.base64} download={a.name} className="text-primary hover:underline inline-flex items-center gap-1.5">
                          <Paperclip className="w-3 h-3" /> {a.name} <span className="text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus tiket ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid={CRUD.confirmDelete(MOD)} className="bg-rose-600 hover:bg-rose-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function F({ label, children, full, error }) {
  return (
    <div className={cn('space-y-1.5', full && 'col-span-2')}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {error && <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>}
    </div>
  );
}
function I({ k, v }) {
  return (<div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div><div className="text-sm mt-0.5">{v || '-'}</div></div>);
}

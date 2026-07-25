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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Search, Download, Pencil, Trash2, ChevronLeft, ChevronRight, Waypoints, ArrowRight, Check, Cable } from 'lucide-react';
import { toast } from 'sonner';
import api, { formatApiError } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import Breadcrumb from '@/components/Breadcrumb';
import { useAuth } from '@/context/AuthContext';
import { useCounts } from '@/context/CountsContext';
import { CRUD } from '@/constants/testIds';
import { cn } from '@/lib/utils';

const CONN_TYPES = ['Fiber Single-Mode', 'Fiber Multi-Mode', 'Copper UTP', 'DAC (Direct Attach)', 'Coaxial'];
const STATUSES = ['Active', 'Planned', 'Maintenance', 'Retired'];
const MOD = 'interconnection';

const EMPTY = {
  source_rack_id: null, source_device: '', source_port: '',
  dest_rack: '', dest_rack_id: null, dest_device: '', dest_port: '',
  connection_type: 'Fiber Single-Mode', cable_id: '',
  status: 'Active', description: '',
};

export default function MyInterconnection() {
  const { canWrite, canDelete } = useAuth();
  const { refresh: refreshCounts } = useCounts();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [racks, setRacks] = useState([]);
  const [devices, setDevices] = useState([]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const rmap = useMemo(() => Object.fromEntries(racks.map((r) => [r.id, r])), [racks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (q) params.q = q;
      if (status !== 'all') params.status = status;
      const { data } = await api.get('/interconnections', { params });
      setItems(data.items || []); setTotal(data.total || 0);
    } catch (err) { toast.error(formatApiError(err)); } finally { setLoading(false); }
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/racks', { params: { page_size: 500 } }).then(({ data }) => setRacks(data.items || []));
    api.get('/devices', { params: { page_size: 1000 } }).then(({ data }) => setDevices(data.items || []));
  }, []);

  const devicesByRack = (rackId) => devices.filter((d) => d.rack_id === rackId);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setOpenForm(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...EMPTY, ...row }); setErrors({}); setOpenForm(true); };

  const validate = () => {
    const e = {};
    if (!form.source_rack_id) e.source_rack_id = 'Source rack wajib';
    if (!form.dest_rack?.trim()) e.dest_rack = 'Destination rack wajib';
    if (!form.connection_type) e.connection_type = 'Tipe wajib';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) { await api.put(`/interconnections/${editing.id}`, form); toast.success('Interconnection diperbarui'); }
      else { await api.post('/interconnections', form); toast.success('Interconnection ditambahkan'); }
      setOpenForm(false); load(); refreshCounts();
    } catch (err) { toast.error(formatApiError(err)); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await api.delete(`/interconnections/${deleteId}`); toast.success('Interconnection dihapus'); setDeleteId(null); load(); refreshCounts(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const exportCsv = () => {
    const headers = ['Cable ID', 'Source Rack', 'Source Device', 'Source Port', 'Dest Rack', 'Dest Device', 'Dest Port', 'Tipe', 'Status', 'Deskripsi'];
    const rows = items.map((i) => [
      i.cable_id, rmap[i.source_rack_id]?.name || '-', i.source_device, i.source_port,
      i.dest_rack || rmap[i.dest_rack_id]?.name || '-', i.dest_device, i.dest_port, i.connection_type, i.status, i.description,
    ].map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `interconnections-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success('Data diekspor');
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'My DataCenter' }, { label: 'My Interconnection' }]} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>My Interconnection</h1>
          <p className="text-sm text-muted-foreground mt-1">Catatan interkoneksi internal antar rack, device, dan port di datacenter Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} data-testid={CRUD.export(MOD)}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
          {canWrite && <Button size="sm" onClick={openCreate} data-testid={CRUD.addBtn(MOD)}><Plus className="w-4 h-4 mr-1.5" /> Tambah Interconnection</Button>}
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid={CRUD.search(MOD)} placeholder="Cari cable id, device, port, tipe…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9 h-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44 h-9" data-testid={CRUD.filterStatus(MOD)}><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-md overflow-x-auto">
            <Table data-testid={CRUD.table(MOD)}>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Cable ID</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs"></TableHead>
                  <TableHead className="text-xs">Destination</TableHead>
                  <TableHead className="text-xs">Tipe</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
                {!loading && items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                  <Cable className="w-6 h-6 mx-auto mb-1 opacity-60" />
                  Belum ada interconnection tercatat.
                </TableCell></TableRow>}
                {!loading && items.map((it) => (
                  <TableRow key={it.id} data-testid={CRUD.row(MOD, it.id)} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs">{it.cable_id || '-'}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{rmap[it.source_rack_id]?.name || '—'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{it.source_device || '-'} : {it.source_port || '-'}</div>
                    </TableCell>
                    <TableCell><ArrowRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{it.dest_rack || rmap[it.dest_rack_id]?.name || '—'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{it.dest_device || '-'} : {it.dest_port || '-'}</div>
                    </TableCell>
                    <TableCell className="text-xs">{it.connection_type || '-'}</TableCell>
                    <TableCell><StatusBadge value={it.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {canWrite && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)} data-testid={CRUD.editBtn(MOD, it.id)}><Pencil className="w-4 h-4" /></Button>}
                        {canDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(it.id)} data-testid={CRUD.deleteBtn(MOD, it.id)}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>Menampilkan {items.length} dari {total} interconnection</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid={CRUD.pagePrev(MOD)}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="tabular-nums">Hal. {page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} data-testid={CRUD.pageNext(MOD)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Sheet open={openForm} onOpenChange={setOpenForm}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Interconnection' : 'Tambah Interconnection'}</SheetTitle>
            <SheetDescription>Rack source & destination diambil dari master My Rack.</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <F label="Cable ID"><Input value={form.cable_id} onChange={(e) => setForm({ ...form, cable_id: e.target.value })} placeholder="mis. XC-A12-B04-001" /></F>
            <F label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>

            <F label="Source Rack *" full error={errors.source_rack_id}>
              <RackPicker value={form.source_rack_id} onChange={(id) => setForm({ ...form, source_rack_id: id, source_device: '', source_port: '' })} racks={racks} testKey="src-rack" />
            </F>
            <F label="Source Device">
              <DevicePicker rackId={form.source_rack_id} devices={devicesByRack(form.source_rack_id)} value={form.source_device} onChange={(v) => setForm({ ...form, source_device: v })} />
            </F>
            <F label="Source Port"><Input value={form.source_port} placeholder="mis. Gi0/1" onChange={(e) => setForm({ ...form, source_port: e.target.value })} /></F>

            <F label="Destination Rack *" full error={errors.dest_rack}>
              <Input value={form.dest_rack} placeholder="Ketik nama rack tujuan (mis. Rack Client X, DC Jakarta 2)" onChange={(e) => setForm({ ...form, dest_rack: e.target.value })} data-testid="dst-rack-input" />
            </F>
            <F label="Destination Device"><Input value={form.dest_device} placeholder="mis. Router Client / Switch A" onChange={(e) => setForm({ ...form, dest_device: e.target.value })} /></F>
            <F label="Destination Port"><Input value={form.dest_port} placeholder="mis. Te1/1" onChange={(e) => setForm({ ...form, dest_port: e.target.value })} /></F>

            <F label="Connection Type *" full error={errors.connection_type}>
              <Select value={form.connection_type} onValueChange={(v) => setForm({ ...form, connection_type: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                <SelectContent>{CONN_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>

            <F label="Deskripsi" full><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Catatan / fungsi link ini" /></F>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)} data-testid={CRUD.cancelBtn(MOD)}>Batal</Button>
            <Button onClick={save} disabled={saving} data-testid={CRUD.saveBtn(MOD)}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus interconnection ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid={CRUD.confirmDelete(MOD)} className="bg-rose-600 hover:bg-rose-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RackPicker({ value, onChange, racks, testKey }) {
  const [open, setOpen] = useState(false);
  const current = racks.find((r) => r.id === value);
  // Group by datacenter
  const grouped = useMemo(() => {
    const g = {};
    racks.forEach((r) => {
      const key = r.datacenter || 'Lainnya';
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [racks]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline" role="combobox" data-testid={`${testKey}-picker`}
          className="w-full justify-between h-9 font-normal text-left"
        >
          {current ? (
            <span className="truncate"><span className="font-medium">{current.name}</span> <span className="text-muted-foreground text-xs">· {current.datacenter} · {current.capacity_u}U</span></span>
          ) : (
            <span className="text-muted-foreground">Pilih rack…</span>
          )}
          <Waypoints className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari nama rack, datacenter…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Rack tidak ditemukan.</CommandEmpty>
            {Object.entries(grouped).map(([dc, list]) => (
              <CommandGroup key={dc} heading={dc}>
                {list.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`${r.name} ${r.number} ${r.datacenter} ${r.room}`}
                    onSelect={() => { onChange(r.id); setOpen(false); }}
                  >
                    {value === r.id ? <Check className="w-3.5 h-3.5 mr-2 text-primary" /> : <span className="w-3.5 mr-2" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate font-medium">{r.name} <span className="text-muted-foreground font-mono text-[10px]">· {r.number}</span></div>
                      <div className="text-[11px] text-muted-foreground truncate">{r.room} · {r.capacity_u}U · {r.status}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DevicePicker({ rackId, devices, value, onChange }) {
  if (!rackId) return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Pilih rack dahulu" disabled />;
  if (devices.length === 0) return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ketik nama device manual" />;
  return (
    <Select value={value || '__manual__'} onValueChange={(v) => onChange(v === '__manual__' ? '' : v)}>
      <SelectTrigger><SelectValue placeholder="Pilih device" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__manual__">— Ketik manual —</SelectItem>
        {devices.map((d) => <SelectItem key={d.id} value={d.name}>{d.name} · U{d.position_u}</SelectItem>)}
      </SelectContent>
    </Select>
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

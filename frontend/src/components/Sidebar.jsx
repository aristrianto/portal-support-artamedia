import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, AlertOctagon, Wrench, ShieldCheck, Radio,
  ChevronsLeft, ChevronsRight, ChevronDown, ChevronRight,
  Wifi, Server, Cable, Zap, Network, Handshake, FileSignature, FileCheck2, ScrollText,
  PackageOpen, Boxes, Building2, Waypoints, Headphones, Globe, Router as RouterIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useCounts } from '@/context/CountsContext';
import { APP } from '@/constants/testIds';

// Customer Broadband removed per requirement — Broadband remains on Provider side only
const CUSTOMER_CATEGORIES = [
  { key: 'dedicated', label: 'Dedicated Internet', to: '/customers/dedicated', icon: Server, countKey: ['customers', 'Dedicated Internet'] },
  { key: 'crossconnect', label: 'Cross Connect', to: '/customers/cross-connect', icon: Cable, countKey: ['customers', 'Cross Connect'] },
  { key: 'darkfiber', label: 'Dark Fiber', to: '/customers/dark-fiber', icon: Zap, countKey: ['customers', 'Dark Fiber'] },
  { key: 'metroethernet', label: 'Metro Ethernet', to: '/customers/metro-ethernet', icon: Network, countKey: ['customers', 'Metro Ethernet'] },
];

const PARTNER_CATEGORIES = [
  { key: 'mitra-broadband', label: 'Broadband', to: '/partners/broadband', icon: Wifi, countKey: ['partners', 'Broadband'] },
  { key: 'mitra-dedicated', label: 'Dedicated Internet', to: '/partners/dedicated', icon: Server, countKey: ['partners', 'Dedicated Internet'] },
  { key: 'mitra-metro', label: 'Metro Ethernet', to: '/partners/metro-ethernet', icon: Network, countKey: ['partners', 'Metro Ethernet'] },
  { key: 'mitra-dark-fiber', label: 'Dark Fiber', to: '/partners/dark-fiber', icon: Zap, countKey: ['partners', 'Dark Fiber'] },
  { key: 'mitra-cross-connect', label: 'Cross Connect', to: '/partners/cross-connect', icon: Cable, countKey: ['partners', 'Cross Connect'] },
];

// Documents restructured: BA/SLA/Contract each split into Customer + Provider
const DOCUMENT_CATEGORIES = [
  { key: 'doc-ba-customer', label: 'BA Customer', to: '/documents/ba/customer', icon: FileCheck2, countKey: ['documents', 'BA_customer'] },
  { key: 'doc-ba-provider', label: 'BA Provider', to: '/documents/ba/provider', icon: FileCheck2, countKey: ['documents', 'BA_provider'] },
  { key: 'doc-sla-customer', label: 'SLA Customer', to: '/documents/sla/customer', icon: FileSignature, countKey: ['documents', 'SLA_customer'] },
  { key: 'doc-sla-provider', label: 'SLA Provider', to: '/documents/sla/provider', icon: FileSignature, countKey: ['documents', 'SLA_provider'] },
  { key: 'doc-kontrak-customer', label: 'Contract Customer', to: '/documents/kontrak/customer', icon: ScrollText, countKey: ['documents', 'Kontrak_customer'] },
  { key: 'doc-kontrak-provider', label: 'Contract Provider', to: '/documents/kontrak/provider', icon: ScrollText, countKey: ['documents', 'Kontrak_provider'] },
  { key: 'doc-teknis', label: 'Dokumen Teknis', to: '/documents/teknis', icon: FileText, countKey: ['documents', 'Teknis'] },
];

const DATACENTER = [
  { key: 'dc-rack', label: 'My Rack & Device', to: '/datacenter/rack-device', icon: Boxes, countKey: ['racks'] },
  { key: 'dc-interconnection', label: 'My Interconnection', to: '/datacenter/interconnection', icon: Waypoints, countKey: ['interconnections'] },
];

const CRM = [
  { key: 'crm-broadband', label: 'Customer Broadband Ticket', to: '/crm/broadband', icon: Wifi, countKey: ['crm', 'broadband'] },
  { key: 'crm-dedicated', label: 'Customer Dedicated Ticket', to: '/crm/dedicated', icon: Server, countKey: ['crm', 'dedicated'] },
  { key: 'crm-dashboard', label: 'CRM Dashboard', to: '/crm/dashboard', icon: LayoutDashboard, countKey: null },
];

const NETWORK = [
  { key: 'net-ipv4', label: 'Public IPv4 Management', to: '/network/ipv4', icon: Globe, countKey: null },
  { key: 'net-mikrotik', label: 'MikroTik Setup', to: '/network/mikrotik', icon: RouterIcon, countKey: null },
  { key: 'net-audit', label: 'IPAM Audit Log', to: '/network/audit', icon: ClipboardList, countKey: null },
];

const OPERATIONS = [
  { key: 'shift', label: 'Shift Handover', to: '/operations/shift-handover', icon: ClipboardList, countKey: ['shifts'] },
  { key: 'incidents', label: 'Incident Log', to: '/operations/incidents', icon: AlertOctagon, countKey: ['incidents'] },
  { key: 'maintenances', label: 'Maintenance Log', to: '/operations/maintenances', icon: Wrench, countKey: ['maintenances'] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { isAdmin } = useAuth();
  const { counts } = useCounts();
  const location = useLocation();

  const inGroup = (prefix) => location.pathname.startsWith(prefix);
  const [openCustomers, setOpenCustomers] = useState(() => inGroup('/customers'));
  const [openPartners, setOpenPartners] = useState(() => inGroup('/partners'));
  const [openDocuments, setOpenDocuments] = useState(() => inGroup('/documents'));
  const [openDC, setOpenDC] = useState(() => inGroup('/datacenter'));
  const [openCRM, setOpenCRM] = useState(() => inGroup('/crm'));
  const [openNetwork, setOpenNetwork] = useState(() => inGroup('/network'));
  const [openOps, setOpenOps] = useState(() => inGroup('/operations'));

  useEffect(() => { if (inGroup('/customers')) setOpenCustomers(true); }, [location.pathname]);
  useEffect(() => { if (inGroup('/partners')) setOpenPartners(true); }, [location.pathname]);
  useEffect(() => { if (inGroup('/documents')) setOpenDocuments(true); }, [location.pathname]);
  useEffect(() => { if (inGroup('/datacenter')) setOpenDC(true); }, [location.pathname]);
  useEffect(() => { if (inGroup('/crm')) setOpenCRM(true); }, [location.pathname]);
  useEffect(() => { if (inGroup('/network')) setOpenNetwork(true); }, [location.pathname]);
  useEffect(() => { if (inGroup('/operations')) setOpenOps(true); }, [location.pathname]);

  const getCount = (path) => {
    if (!counts || !path) return null;
    return path.reduce((acc, k) => (acc && k in acc ? acc[k] : null), counts);
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('h-14 flex items-center border-b border-border px-3', collapsed ? 'justify-center' : 'gap-2')}>
        <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 text-primary" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold text-foreground leading-tight" style={{ fontFamily: 'Manrope' }}>NOC Support</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">System</div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} testKey="dashboard" />

          {/* Data Pelanggan */}
          <GroupItem
            open={openCustomers} onToggle={() => setOpenCustomers((o) => !o)}
            icon={Users} label="Data Pelanggan" collapsed={collapsed}
            badge={getCount(['customers', '_total'])} active={inGroup('/customers')} testKey="customers"
          />
          {!collapsed && openCustomers && CUSTOMER_CATEGORIES.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {/* Mitra / Provider */}
          <GroupItem
            open={openPartners} onToggle={() => setOpenPartners((o) => !o)}
            icon={Handshake} label="Mitra / Provider" collapsed={collapsed}
            badge={getCount(['partners', '_total'])} active={inGroup('/partners')} testKey="partners"
          />
          {!collapsed && openPartners && PARTNER_CATEGORIES.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {/* Dokumen & Arsip (no PO/SO, split Customer/Provider) */}
          <GroupItem
            open={openDocuments} onToggle={() => setOpenDocuments((o) => !o)}
            icon={FileText} label="Dokumen & Arsip" collapsed={collapsed}
            badge={getCount(['documents', '_total'])} active={inGroup('/documents')} testKey="documents"
          />
          {!collapsed && openDocuments && DOCUMENT_CATEGORIES.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {/* My DataCenter */}
          <GroupItem
            open={openDC} onToggle={() => setOpenDC((o) => !o)}
            icon={Building2} label="My DataCenter" collapsed={collapsed}
            badge={(getCount(['racks']) || 0) + (getCount(['interconnections']) || 0)}
            active={inGroup('/datacenter')} testKey="datacenter"
          />
          {!collapsed && openDC && DATACENTER.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {/* CRM */}
          <GroupItem
            open={openCRM} onToggle={() => setOpenCRM((o) => !o)}
            icon={Headphones} label="CRM" collapsed={collapsed}
            badge={(getCount(['crm', 'broadband']) || 0) + (getCount(['crm', 'dedicated']) || 0)}
            active={inGroup('/crm')} testKey="crm"
          />
          {!collapsed && openCRM && CRM.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {/* Network */}
          <GroupItem
            open={openNetwork} onToggle={() => setOpenNetwork((o) => !o)}
            icon={Globe} label="Network" collapsed={collapsed}
            active={inGroup('/network')} testKey="network"
          />
          {!collapsed && openNetwork && NETWORK.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {/* Operasional NOC */}
          <GroupItem
            open={openOps} onToggle={() => setOpenOps((o) => !o)}
            icon={PackageOpen} label="Operasional NOC" collapsed={collapsed}
            badge={(getCount(['incidents_active']) || 0) + (getCount(['maintenances_active']) || 0)}
            active={inGroup('/operations')} testKey="operations"
          />
          {!collapsed && openOps && OPERATIONS.map((c) => (
            <SubItem key={c.key} to={c.to} icon={c.icon} label={c.label} badge={getCount(c.countKey)} testKey={c.key} />
          ))}

          {isAdmin && (
            <NavItem to="/users" icon={ShieldCheck} label="User & Hak Akses" collapsed={collapsed} testKey="users" />
          )}
        </ul>
      </nav>

      <button
        onClick={onToggle}
        data-testid={APP.sidebarToggle}
        className={cn(
          'h-11 border-t border-border flex items-center gap-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
          collapsed && 'justify-center px-0'
        )}
      >
        {collapsed ? <ChevronsRight className="w-4 h-4" /> : <><ChevronsLeft className="w-4 h-4" /><span>Collapse</span></>}
      </button>
    </aside>
  );
}

function NavItem({ to, end, icon: Icon, label, collapsed, badge, testKey }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        data-testid={APP.sidebarLink(testKey)}
        className={({ isActive }) => cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          isActive && 'bg-primary/10 text-primary font-medium hover:bg-primary/10',
          collapsed && 'justify-center px-0'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        {!collapsed && <span className="truncate flex-1">{label}</span>}
        {!collapsed && badge != null && badge > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">{badge}</span>
        )}
      </NavLink>
    </li>
  );
}

function GroupItem({ open, onToggle, icon: Icon, label, collapsed, badge, active, testKey }) {
  return (
    <li>
      <button
        onClick={onToggle}
        data-testid={APP.sidebarLink(`group-${testKey}`)}
        className={cn(
          'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          active && 'text-foreground',
          collapsed && 'justify-center px-0'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left">{label}</span>
            {badge != null && badge > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">{badge}</span>
            )}
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </>
        )}
      </button>
    </li>
  );
}

function SubItem({ to, icon: Icon, label, badge, testKey }) {
  return (
    <li className="ml-3 pl-3 border-l border-border">
      <NavLink
        to={to}
        data-testid={APP.sidebarLink(testKey)}
        className={({ isActive }) => cn(
          'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          isActive && 'bg-primary/10 text-primary font-medium hover:bg-primary/10'
        )}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        <span className="truncate flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">{badge}</span>
        )}
      </NavLink>
    </li>
  );
}

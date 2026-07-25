import React, { useState } from 'react';
import { Search, Bell, Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { APP, AUTH } from '@/constants/testIds';

const ROLE_LABEL = {
  admin: 'Administrator',
  supervisor: 'Supervisor NOC',
  engineer: 'NOC Engineer',
  viewer: 'Viewer',
};

export default function Header({ onSearch }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [q, setQ] = useState('');

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card flex items-center px-4 gap-3">
      <div className="flex-1 max-w-xl relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid={APP.globalSearch}
          value={q}
          onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }}
          placeholder="Cari pelanggan, dokumen, incident…"
          className="pl-9 h-9 bg-background border-border"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          data-testid={APP.themeToggle}
          onClick={toggle}
          aria-label="Toggle theme"
          className="h-9 w-9"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon" data-testid={APP.notifBell} className="h-9 w-9 relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid={APP.userMenu} className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-md hover:bg-accent transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                {(user?.name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-semibold text-foreground">{user?.name}</div>
                <div className="text-[10px] text-muted-foreground">{ROLE_LABEL[user?.role] || user?.role}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs">
              <User className="w-3.5 h-3.5 mr-2" /> {ROLE_LABEL[user?.role] || user?.role}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid={AUTH.logoutBtn} onClick={logout} className="text-rose-600 dark:text-rose-400 focus:text-rose-700">
              <LogOut className="w-3.5 h-3.5 mr-2" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Home, Search, Plus, Bell, User, LogOut, Menu, X, Zap, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useFriendStore } from '@/stores/friendStore';
import { useNotificationRealtime } from '@/hooks/useRealtime';
import { Avatar } from '@/components/ui/Avatar';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Search },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/create', label: 'Create', icon: Plus },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { profile, signOut } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { pendingInCount, fetchFriends } = useFriendStore();

  useEffect(() => {
    if (profile?.id) {
      fetchNotifications(profile.id);
      fetchFriends(profile.id);
    }
  }, [profile?.id, fetchNotifications, fetchFriends]);

  const handleNewNotification = useCallback(() => {
    if (profile?.id) fetchNotifications(profile.id);
  }, [profile?.id, fetchNotifications]);

  useNotificationRealtime(profile?.id ?? '', handleNewNotification);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-lg text-text hidden sm:block">MatchD</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text hover:bg-surface-alt'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {label === 'Friends' && pendingInCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center">
                      {pendingInCount > 9 ? '9+' : pendingInCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-alt transition-colors"
              >
                <Avatar src={profile?.avatar_url} name={profile?.username} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-text">{profile?.username}</span>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-medium text-sm text-text">{profile?.username}</p>
                      <p className="text-xs text-text-muted capitalize">{profile?.account_type}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface-alt transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                      {profile?.account_type === 'venue' && (
                        <Link
                          href="/venues/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface-alt transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          Venue Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-surface-alt transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-alt transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <nav className="px-4 py-2 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                    ${active ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text hover:bg-surface-alt'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {label === 'Friends' && pendingInCount > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center">
                      {pendingInCount > 9 ? '9+' : pendingInCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

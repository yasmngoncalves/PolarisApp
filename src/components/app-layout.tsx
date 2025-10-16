"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, LineChart, User, Pill, Target } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback } from './ui/avatar';
import { LogoIcon } from './logo-icon';

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/journal', label: 'Diário', icon: BookOpen },
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/medication', label: 'Medicação', icon: Pill },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/profile', label: 'Perfil', icon: User },
];

function LoadingSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LogoIcon className="w-16 h-16 animate-pulse" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user && !pathname.startsWith('/auth')) {
      router.push('/auth/login');
    }
  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading) {
    return <LoadingSkeleton />;
  }

  if (!user && !pathname.startsWith('/auth')) {
    // We are redirecting, render a loading state
    return <LoadingSkeleton />;
  }
  
  if (isMobile === undefined) {
     return <LoadingSkeleton />;
  }
  
  const isAuthPage = pathname.startsWith('/auth');

  if(isAuthPage) {
    return <main>{children}</main>
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {isMobile ? <MobileBottomNav /> : <DesktopSidebar />}
      <main className={cn(
        "flex-1 overflow-y-auto",
        isMobile ? "pb-16" : "pl-64"
      )}>
        {children}
      </main>
    </div>
  );
}

function getInitials(name: string | null | undefined) {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
}

function DesktopSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex-col border-r bg-card">
      <div className="flex h-full flex-col p-4">
        <div className="mb-8 flex items-center gap-2 px-2">
          <LogoIcon className="w-8 h-8" />
          <h1 className="text-xl font-bold text-foreground">PolarisApp</h1>
        </div>
        <nav className="flex-1 space-y-2">
            {user && (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold truncate">{user.displayName}</span>
                </div>
            )}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent",
                pathname === item.href && "bg-accent text-primary font-semibold"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
            <div className="text-center text-xs text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} PolarisApp</p>
            </div>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  // Filter out items that shouldn't be in the mobile nav if needed
  const mobileNavItems = navItems.filter(item => ['/', '/journal', '/dashboard', '/profile'].includes(item.href));


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card">
      <div className={`grid h-16 grid-cols-${mobileNavItems.length} items-center`}>
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors",
              pathname === item.href ? "text-primary" : "hover:text-primary"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

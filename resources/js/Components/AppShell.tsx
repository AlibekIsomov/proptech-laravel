import { useEffect, useState } from 'react';
import Sidebar from '@/Components/Sidebar';
import PMSidebar from '@/Components/PMSidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [isPm, setIsPm] = useState(false);

    useEffect(() => {
        setIsPm(window.location.pathname.startsWith('/pm') || window.location.pathname.startsWith('/dispatcher') || window.location.pathname.startsWith('/resident') || window.location.pathname.startsWith('/vendor'));
    }, []);

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
            {isPm ? <PMSidebar /> : <Sidebar />}
            <div className="flex flex-col flex-1" style={{ marginLeft: '14rem' }}>
                <main className="p-6 md:p-8 flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

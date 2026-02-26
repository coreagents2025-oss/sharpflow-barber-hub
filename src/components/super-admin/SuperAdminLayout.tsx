import { ReactNode } from 'react';
import { SuperAdminSidebar } from './SuperAdminSidebar';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

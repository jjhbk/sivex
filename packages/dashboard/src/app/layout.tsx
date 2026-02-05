'use client';

import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <a href="/" className="text-xl font-bold text-primary">Sivex</a>
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Overview</a>
            <a href="/tasks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tasks</a>
            <a href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Agents</a>
            <a href="/review" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Review</a>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

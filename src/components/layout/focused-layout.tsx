"use client";

import React from "react";

export function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
        <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-4xl">
                {children}
            </div>
        </main>
    </div>
  )
}

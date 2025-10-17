
"use client";

import { useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function TaxonomiaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new repository page, and select the 'taxonomia' tab
    router.replace(`/repositorio?tab=taxonomia`);
  }, [router]);

  // Render a loading state or null while redirecting
  return (
    <div className="w-full h-96 flex items-center justify-center">
      <p>Redirecionando para a nova página de taxonomia...</p>
    </div>
  );
}

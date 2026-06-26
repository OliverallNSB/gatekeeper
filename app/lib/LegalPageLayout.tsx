'use client';

import { useRouter, usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/sms-consent', label: 'SMS Consent' },
  { href: 'mailto:support@appgatekeeper.net', label: 'Support' },
];

export default function LegalPageLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/landing');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <button
            onClick={goBack}
            className="text-sm text-gray-600 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
          >
            &larr; Back
          </button>
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Bottom nav */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <button
              onClick={scrollToTop}
              className="text-gray-600 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
            >
              &uarr; Back to Top
            </button>
            <button
              onClick={goBack}
              className="text-gray-600 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
            >
              &larr; Back
            </button>
          </div>

          <nav aria-label="Legal pages" className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {LEGAL_LINKS.map((link, i) => {
              const isCurrent = pathname === link.href;
              return (
                <span key={link.href} className="flex items-center gap-3">
                  {i > 0 && <span className="text-gray-300" aria-hidden>|</span>}
                  {isCurrent ? (
                    <span className="text-gray-900 font-medium" aria-current="page">
                      {link.label}
                    </span>
                  ) : (
                    <a
                      href={link.href}
                      className="text-gray-500 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                    >
                      {link.label}
                    </a>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      </footer>
    </div>
  );
}

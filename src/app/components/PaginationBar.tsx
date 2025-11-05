'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

const MAX_PAGES_VISIBLE = 5;

export default function PaginationBar({
  totalPages,
  currentPage,
}: {
  totalPages: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const getPagesToDisplay = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= MAX_PAGES_VISIBLE + 2) {
      // No need for ellipsis
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const showLeftDots = currentPage > 3;
    const showRightDots = currentPage < totalPages - 2;

    if (!showLeftDots && showRightDots) {
      // Start section: 1 2 3 4 5 ... N
      for (let i = 1; i <= MAX_PAGES_VISIBLE; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (showLeftDots && !showRightDots) {
      // End section: 1 ... N-4 N-3 N-2 N-1 N
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - (MAX_PAGES_VISIBLE - 1); i <= totalPages; i++) pages.push(i);
    } else if (showLeftDots && showRightDots) {
      // Middle section: 1 ... C-1 C C+1 ... N
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pagesToDisplay = getPagesToDisplay();

  // If there's only one page, don't show pagination
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex flex-col items-center mt-8 space-y-4" aria-label="Pagination">
      {/* Page info */}
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing page <span className="font-medium">{currentPage}</span> of{' '}
        <span className="font-medium">{totalPages}</span> pages
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1">
        {/* Previous */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            currentPage <= 1
              ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
              : 'text-gray-700 bg-white dark:text-gray-300 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <span className="sr-only">Previous</span>
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Page Numbers */}
        {pagesToDisplay.map((page, idx) =>
          page === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(Number(page))}
              aria-current={currentPage === page ? 'page' : undefined}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                currentPage === page
                  ? 'bg-blue-400 text-white z-10' // Active page styles
                  : 'text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            currentPage >= totalPages
              ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
              : 'text-gray-700 bg-white dark:text-gray-300 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <span className="sr-only">Next</span>
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Jump to page */}
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-700 dark:text-gray-300">Jump to page:</span>
        <select
          value={currentPage}
          onChange={(e) => handlePageChange(Number(e.target.value))}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-1 pl-2 pr-8 text-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-meat_brown"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}

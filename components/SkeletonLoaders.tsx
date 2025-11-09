import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-slate-300 rounded animate-pulse ${className}`} />
);

export const HomePageSkeleton: React.FC = () => (
  <>
    {/* Fake Header */}
    <header className="bg-slate-400">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
        <Skeleton className="h-12 w-36 !bg-slate-500" />
        <div className="hidden md:flex items-center space-x-4">
            <Skeleton className="h-5 w-16 !bg-slate-500" />
            <Skeleton className="h-5 w-24 !bg-slate-500" />
            <Skeleton className="h-5 w-28 !bg-slate-500" />
        </div>
        <div className="md:hidden h-6 w-6 !bg-slate-500 rounded"></div>
      </div>
    </header>

    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Search Bar */}
      <Skeleton className="h-10 w-full" />

      {/* Squad Sections */}
      {[1, 2].map(squad => (
        <div key={squad}>
          <div className="flex justify-between items-baseline mb-4">
            <Skeleton className="h-8 w-32" />
            <div className="text-right">
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="bg-white shadow-md rounded-lg p-4 space-y-4 divide-y divide-slate-200">
            {[1, 2, 3].map(item => (
              <div key={item} className="pt-4 first:pt-0 flex justify-between items-center">
                <div className="flex-1">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  </>
);


export const BoyMarksPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="mb-6 pb-4 border-b border-slate-200">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-6 w-48 mt-2" />
      <Skeleton className="h-5 w-56 mt-1" />
    </div>

    <div className="bg-white shadow-md rounded-lg divide-y divide-slate-200">
      {[1, 2, 3, 4, 5].map(item => (
        <div key={item} className="p-4 flex justify-between items-center">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
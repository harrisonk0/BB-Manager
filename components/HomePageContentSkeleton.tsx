import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-slate-300 rounded animate-pulse ${className}`} />
);

export const HomePageContentSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header section - mimicking controls */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-9 w-48" />
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-28" />
      </div>
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
  </div>
);
import React from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`skeleton-shimmer ${className}`} />
}

export function SkeletonSubtle({ className = '' }: { className?: string }) {
    return <div className={`skeleton-shimmer-subtle ${className}`} />
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-7 w-full">
            {/* Header Skeleton con movimiento */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2.5">
                    <Skeleton className="h-8 w-52 rounded-2xl" />
                    <SkeletonSubtle className="h-4 w-80 max-w-full rounded-xl" />
                </div>
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-36 rounded-2xl" />
                    <Skeleton className="h-9 w-32 rounded-2xl" />
                </div>
            </div>

            {/* 4 KPI Cards con brillo en movimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="p-5 sm:p-6 rounded-[24px] bg-[#f8fafc] border border-slate-200/80 shadow-xs space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24 rounded-lg" />
                            <Skeleton className="w-8 h-8 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-28 rounded-xl" />
                            <SkeletonSubtle className="h-3 w-36 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle Grid con barras animadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                <div className="p-6 sm:p-7 rounded-[24px] bg-[#f8fafc] border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-44 rounded-lg" />
                        <Skeleton className="h-4 w-20 rounded-lg" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/70 space-y-2.5 shadow-xs">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-3/5 rounded-lg" />
                                    <Skeleton className="h-4 w-12 rounded-lg" />
                                </div>
                                <SkeletonSubtle className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 sm:p-7 rounded-[24px] bg-[#f8fafc] border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-24 rounded-lg" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/70 space-y-2.5 shadow-xs">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-2/3 rounded-lg" />
                                    <Skeleton className="h-4 w-12 rounded-lg" />
                                </div>
                                <SkeletonSubtle className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function MetasSkeleton() {
    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48 rounded-2xl" />
                    <SkeletonSubtle className="h-4 w-72 max-w-full rounded-xl" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-28 rounded-2xl" />
                    <Skeleton className="h-9 w-32 rounded-2xl" />
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="p-4 sm:p-5 rounded-[24px] bg-[#f8fafc] border border-slate-200/80 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Skeleton className="h-10 rounded-2xl" />
                    <Skeleton className="h-10 rounded-2xl" />
                    <Skeleton className="h-10 rounded-2xl" />
                    <Skeleton className="h-10 rounded-2xl" />
                </div>
            </div>

            {/* List Skeleton Items con shimmer */}
            <div className="rounded-[24px] bg-white border border-slate-200/80 shadow-xs p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                        key={i}
                        className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-200/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                        <div className="space-y-2 w-full sm:w-2/3">
                            <div className="flex gap-2">
                                <Skeleton className="h-4 w-16 rounded-md" />
                                <SkeletonSubtle className="h-4 w-28 rounded-md" />
                            </div>
                            <Skeleton className="h-4 w-full rounded-lg" />
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="space-y-1 text-right hidden sm:block">
                                <Skeleton className="h-3 w-16 rounded-md" />
                                <SkeletonSubtle className="h-3 w-12 rounded-md" />
                            </div>
                            <Skeleton className="h-7 w-24 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

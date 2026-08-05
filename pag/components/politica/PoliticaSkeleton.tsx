import React from 'react'

export function DashboardSkeleton() {
    return (
        <div className="space-y-7 w-full animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200/80 rounded-2xl" />
                    <div className="h-4 w-72 bg-slate-100 rounded-xl" />
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-36 bg-slate-200/80 rounded-2xl" />
                    <div className="h-9 w-32 bg-slate-100 rounded-2xl" />
                </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 sm:p-6 rounded-[24px] bg-slate-50 border border-slate-200/70 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-24 bg-slate-200 rounded-lg" />
                            <div className="w-8 h-8 rounded-full bg-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-9 w-20 bg-slate-300 rounded-xl" />
                            <div className="h-3 w-32 bg-slate-200 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                <div className="p-6 sm:p-7 rounded-[24px] bg-slate-50 border border-slate-200/70 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-5 w-40 bg-slate-200 rounded-lg" />
                        <div className="h-4 w-16 bg-slate-200 rounded-lg" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/60 space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-4 w-3/4 bg-slate-200 rounded-lg" />
                                    <div className="h-4 w-10 bg-slate-200 rounded-lg" />
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 sm:p-7 rounded-[24px] bg-slate-50 border border-slate-200/70 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-5 w-36 bg-slate-200 rounded-lg" />
                        <div className="h-4 w-24 bg-slate-200 rounded-lg" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/60 space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-4 w-2/3 bg-slate-200 rounded-lg" />
                                    <div className="h-4 w-10 bg-slate-200 rounded-lg" />
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full" />
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
        <div className="space-y-6 w-full animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-44 bg-slate-200 rounded-2xl" />
                    <div className="h-4 w-64 bg-slate-100 rounded-xl" />
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-28 bg-slate-100 rounded-2xl" />
                    <div className="h-9 w-32 bg-slate-200 rounded-2xl" />
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="p-4 sm:p-5 rounded-[24px] bg-slate-50 border border-slate-200/70 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="h-10 bg-white rounded-2xl border border-slate-200" />
                    <div className="h-10 bg-white rounded-2xl border border-slate-200" />
                    <div className="h-10 bg-white rounded-2xl border border-slate-200" />
                    <div className="h-10 bg-white rounded-2xl border border-slate-200" />
                </div>
            </div>

            {/* List Skeleton */}
            <div className="rounded-[24px] bg-white border border-slate-200/70 p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                        <div className="space-y-2 w-2/3">
                            <div className="h-3 w-24 bg-slate-200 rounded-lg" />
                            <div className="h-4 w-full bg-slate-300 rounded-lg" />
                        </div>
                        <div className="h-6 w-20 bg-slate-200 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-gradient-to-r from-daylight-sky to-turquoise text-white',
            secondary: 'bg-gradient-to-r from-tiffany to-teal text-white',
            outline: 'border-2 border-daylight-sky text-daylight-sky bg-transparent',
            success: 'bg-gradient-to-r from-teal to-verdigris text-white',
        }

        return (
            <div
                ref={ref}
                className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200',
                    variants[variant],
                    className
                )}
                {...props}
            />
        )
    }
)
Badge.displayName = 'Badge'

export { Badge }

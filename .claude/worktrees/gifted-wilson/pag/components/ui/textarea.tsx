import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    'flex min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-outer-space transition-all duration-200',
                    'placeholder:text-slate/50',
                    'focus:outline-none focus:ring-2 focus:ring-daylight-sky focus:border-transparent',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'hover:border-daylight-sky/50',
                    'resize-none',
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = 'Textarea'

export { Textarea }

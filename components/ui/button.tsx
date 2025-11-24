import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-daylight-sky focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary:
                    'bg-gradient-to-r from-daylight-sky to-turquoise text-white shadow-lg shadow-daylight-sky/30 hover:shadow-xl hover:shadow-daylight-sky/40 hover:scale-105',
                secondary:
                    'bg-gradient-to-r from-tiffany to-teal text-white shadow-md hover:shadow-lg hover:scale-105',
                outline:
                    'border-2 border-daylight-sky text-daylight-sky hover:bg-daylight-sky hover:text-white',
                ghost: 'text-egyptian hover:bg-sky/20 hover:text-daylight-sky',
                link: 'text-daylight-sky underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-9 px-4 text-xs',
                md: 'h-11 px-6 text-sm',
                lg: 'h-14 px-8 text-base',
                xl: 'h-16 px-10 text-lg',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

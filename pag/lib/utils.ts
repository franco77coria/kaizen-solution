import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export function formatWhatsAppUrl(number: string, message?: string): string {
    const cleanNumber = number.replace(/\D/g, '')
    const encodedMessage = message ? encodeURIComponent(message) : ''
    return `https://wa.me/${cleanNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

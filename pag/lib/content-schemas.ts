import { z } from 'zod'

/**
 * Schemas de los contenidos editables desde /admin.
 *
 * Viven acá y no en los route.ts porque Next solo permite exportar handlers y
 * su config desde un archivo de ruta: cualquier otro export rompe el build.
 */

export const serviceSchema = z.object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(1000),
    icon: z.string().max(60).nullish(),
    category: z.string().max(80).default('general'),
    features: z.array(z.string().max(200)).max(20).default([]),
    order: z.coerce.number().int().min(0).max(9999).default(0),
    isActive: z.boolean().default(true),
})

export const projectSchema = z.object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(1000),
    category: z.string().trim().min(1).max(80),
    imageUrl: z.union([z.string().url().max(500), z.literal(''), z.null()]).optional(),
    clientName: z.string().max(150).nullish(),
    results: z.string().max(500).nullish(),
    tags: z.array(z.string().max(60)).max(20).default([]),
    order: z.coerce.number().int().min(0).max(9999).default(0),
    isActive: z.boolean().default(true),
})

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient, PolTipoMeta, PolPeriodicidad, PolRol, PolTipoPermiso, PolOrigenEvidencia } from '@prisma/client'

const prisma = new PrismaClient()

function cleanStr(val: any): string {
    if (val == null) return ''
    return String(val).trim()
}

function normalizeKey(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
}

function cleanDigits(val: any): string {
    if (val == null) return ''
    return String(val).replace(/\D/g, '')
}

function parseDecimal(val: any): number | null {
    if (val == null || val === '') return null
    if (typeof val === 'number') return isNaN(val) ? null : val
    const s = String(val).trim().replace(',', '.')
    const parsed = parseFloat(s)
    return isNaN(parsed) ? null : parsed
}

async function main() {
    const excelPath = process.argv[2] || 'C:\\Users\\Usuario\\Downloads\\Base PPM Anapoima.xlsx'
    const slug = process.argv[3] || 'anapoima'

    if (!fs.existsSync(excelPath)) {
        console.error(`❌ Archivo Excel no encontrado en: ${excelPath}`)
        process.exit(1)
    }

    console.log(`🚀 Iniciando importación para municipio "${slug}" desde "${excelPath}"...`)

    const wb = XLSX.readFile(excelPath)
    const getSheet = (name: string) => wb.Sheets[name] ? XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[name]) : []

    const rowsEstructura = getSheet('Estructura')
    const rowsIndicadores = getSheet('Indicadores')
    const rowsFormulario = getSheet('Formulario')
    const rowsUsuarios = getSheet('usuarios')
    const rowsPermisos = getSheet('control_permisos')
    const rowsIngresos = getSheet('control_ingresos')

    const anomalías: string[] = ['Categoría,Fila,Mensaje,Detalle']

    // 1. Municipio
    const municipio = await prisma.polMunicipio.upsert({
        where: { slug },
        update: {
            nombre: 'Anapoima',
            departamento: 'Cundinamarca',
            lema: 'Renovación en Marcha',
            periodoInicio: 2024,
            periodoFin: 2027,
        },
        create: {
            slug,
            nombre: 'Anapoima',
            departamento: 'Cundinamarca',
            lema: 'Renovación en Marcha',
            periodoInicio: 2024,
            periodoFin: 2027,
        },
    })
    console.log(`✅ Municipio [${municipio.nombre}] ID: ${municipio.id}`)

    // 2. Políticas
    const politicasMap = new Map<string, string>() // nombre -> id
    const politicasNombres = new Set<string>()

    for (const r of rowsEstructura) {
        const pNombre = cleanStr(r['PoliticaPublica'])
        if (pNombre) politicasNombres.add(pNombre)
    }
    for (const r of rowsIndicadores) {
        const pNombre = cleanStr(r['PPM'])
        if (pNombre) politicasNombres.add(pNombre)
    }

    let pIndex = 1
    for (const pNombre of Array.from(politicasNombres)) {
        const p = await prisma.polPolitica.upsert({
            where: {
                municipioId_nombre: { municipioId: municipio.id, nombre: pNombre },
            },
            update: { orden: pIndex },
            create: {
                municipioId: municipio.id,
                nombre: pNombre,
                orden: pIndex,
                anioInicio: 2024,
                anioFin: 2027,
            },
        })
        politicasMap.set(pNombre.toLowerCase(), p.id)
        pIndex++
    }
    console.log(`✅ Políticas importadas: ${politicasMap.size}`)

    // 3. Ejes y Líneas
    const ejesMap = new Map<string, string>() // key `${politicaId}_${ejeNombre}` -> id
    const lineasMap = new Map<string, string>() // key `${ejeId}_${lineaNombre}` -> id

    for (const r of rowsEstructura) {
        const pNombre = cleanStr(r['PoliticaPublica'])
        const pId = politicasMap.get(pNombre.toLowerCase())
        if (!pId) continue

        const ejeCodigo = cleanStr(r['Codigo_Eje'])
        const ejeNombre = cleanStr(r['Eje']) || 'Eje General'
        const ejeKey = `${pId}_${normalizeKey(ejeNombre)}`

        let ejeId = ejesMap.get(ejeKey)
        if (!ejeId) {
            const eje = await prisma.polEje.upsert({
                where: {
                    politicaId_nombre: { politicaId: pId, nombre: ejeNombre },
                },
                update: { codigo: ejeCodigo || undefined },
                create: {
                    politicaId: pId,
                    codigo: ejeCodigo || undefined,
                    nombre: ejeNombre,
                },
            })
            ejeId = eje.id
            ejesMap.set(ejeKey, ejeId)
        }

        const lineaNombre = cleanStr(r['Linea de Accion']) || cleanStr(r['Linea de estrategica']) || 'Línea General'
        const lineaEstrategica = cleanStr(r['Linea de estrategica'])
        const lineaKey = `${ejeId}_${normalizeKey(lineaNombre)}`

        if (!lineasMap.has(lineaKey)) {
            const linea = await prisma.polLinea.upsert({
                where: {
                    ejeId_nombre: { ejeId, nombre: lineaNombre },
                },
                update: { lineaEstrategica: lineaEstrategica || undefined },
                create: {
                    ejeId,
                    nombre: lineaNombre,
                    lineaEstrategica: lineaEstrategica || undefined,
                },
            })
            lineasMap.set(lineaKey, linea.id)
        }
    }
    console.log(`✅ Ejes: ${ejesMap.size}, Líneas: ${lineasMap.size}`)

    // 4. Dependencias
    const dependenciasMap = new Map<string, string>() // normalizeKey -> id
    const depNombres = new Set<string>()

    for (const r of rowsEstructura) {
        const d = cleanStr(r['DEPENDENCIA'])
        if (d) depNombres.add(d)
    }
    for (const r of rowsUsuarios) {
        const d = cleanStr(r['DEPENDENCIA'])
        if (d) depNombres.add(d)
    }
    for (const r of rowsFormulario) {
        const d = cleanStr(r['DEPENDENCIA'])
        if (d) depNombres.add(d)
    }

    for (const dNombre of Array.from(depNombres)) {
        const dep = await prisma.polDependencia.upsert({
            where: {
                municipioId_nombre: { municipioId: municipio.id, nombre: dNombre },
            },
            update: {},
            create: {
                municipioId: municipio.id,
                nombre: dNombre,
            },
        })
        dependenciasMap.set(normalizeKey(dNombre), dep.id)
    }
    console.log(`✅ Dependencias importadas: ${dependenciasMap.size}`)

    // 5. Indicadores y Metas por año
    const indicadoresMap = new Map<string, string>() // codigo -> id

    for (const r of rowsIndicadores) {
        const codigo = cleanStr(r['ID_INDICADOR'])
        if (!codigo) continue

        const pNombre = cleanStr(r['PPM'])
        const pId = politicasMap.get(pNombre.toLowerCase())

        const nombre = cleanStr(r['INDICADOR DEL EJE']) || codigo
        const fuente = cleanStr(r['FUENTE DEL INDICADOR '])
        const unidadMedida = cleanStr(r['UNIDAD DE MEDIDA'])
        const formula = cleanStr(r['FORMULA DE INDICADOR MEJORADA']) || cleanStr(r['FORMULA DE INDICADOR'])
        const menorEsMejor = cleanStr(r['MEJOR ES MENOR']).toLowerCase() === 'si' || cleanStr(r['MEJOR ES MENOR']).toLowerCase() === 'sí'
        const comentarios = cleanStr(r['COMENTARIOS'])

        const ind = await prisma.polIndicador.upsert({
            where: {
                municipioId_codigo: { municipioId: municipio.id, codigo },
            },
            update: {
                politicaId: pId || undefined,
                nombre,
                nombreOrigen: cleanStr(r['INDICADOR DEL EJE']),
                fuente: fuente || undefined,
                unidadMedida: unidadMedida || undefined,
                formula: formula || undefined,
                menorEsMejor,
                comentarios: comentarios || undefined,
            },
            create: {
                municipioId: municipio.id,
                politicaId: pId || undefined,
                codigo,
                nombre,
                nombreOrigen: cleanStr(r['INDICADOR DEL EJE']),
                fuente: fuente || undefined,
                unidadMedida: unidadMedida || undefined,
                formula: formula || undefined,
                menorEsMejor,
                comentarios: comentarios || undefined,
            },
        })
        indicadoresMap.set(codigo, ind.id)

        // Metas multianuales
        const meta2024 = parseDecimal(r['META_NUMERICA_2024'])
        const meta2025 = parseDecimal(r['META_NUMERICA_2025'])
        const meta2026 = parseDecimal(r['META_NUMERICA_2026'])

        const real2024 = parseDecimal(r['REAL_2024'])
        const real2025 = parseDecimal(r['REAL_2025'])

        const metasData = [
            { anio: 2024, meta: meta2024, real: real2024 },
            { anio: 2025, meta: meta2025, real: real2025 },
            { anio: 2026, meta: meta2026, real: null },
        ]

        for (const m of metasData) {
            if (m.meta != null || m.real != null) {
                await prisma.polIndicadorMeta.upsert({
                    where: {
                        indicadorId_anio: { indicadorId: ind.id, anio: m.anio },
                    },
                    update: { meta: m.meta, real: m.real },
                    create: { indicadorId: ind.id, anio: m.anio, meta: m.meta, real: m.real },
                })
            }
        }
    }
    console.log(`✅ Indicadores importados: ${indicadoresMap.size}`)

    // 6. Actividades
    const actividadesMap = new Map<string, string>() // claveDedupe -> id
    let actIndex = 0

    for (const r of rowsEstructura) {
        actIndex++
        const nombreActividad = cleanStr(r['Actividad '])
        if (!nombreActividad) {
            anomalías.push(`Estructura,${actIndex},"Fila sin nombre de actividad","${JSON.stringify(r)}"`)
            continue
        }

        const pNombre = cleanStr(r['PoliticaPublica'])
        const pId = politicasMap.get(pNombre.toLowerCase())

        const ejeNombre = cleanStr(r['Eje']) || 'Eje General'
        const ejeKey = pId ? `${pId}_${normalizeKey(ejeNombre)}` : ''
        const ejeId = ejesMap.get(ejeKey)

        const lineaNombre = cleanStr(r['Linea de Accion']) || cleanStr(r['Linea de estrategica']) || 'Línea General'
        const lineaKey = ejeId ? `${ejeId}_${normalizeKey(lineaNombre)}` : ''
        const lineaId = lineasMap.get(lineaKey)

        const depNombre = cleanStr(r['DEPENDENCIA'])
        const dependenciaId = dependenciasMap.get(normalizeKey(depNombre))

        const indCodigo = cleanStr(r['ID_INDICADOR'])
        const indicadorId = indicadoresMap.get(indCodigo)

        const rawTipoMeta = cleanStr(r['Tipo_de_Meta']).toLowerCase()
        let tipoMeta: PolTipoMeta = PolTipoMeta.SIN_DEFINIR
        let metaNumero: number | null = null
        let metaBooleana: boolean | null = null

        if (rawTipoMeta.includes('numé') || rawTipoMeta.includes('nume') || rawTipoMeta.includes('núm')) {
            tipoMeta = PolTipoMeta.NUMERO
            metaNumero = parseDecimal(r['Meta'])
        } else if (rawTipoMeta.includes('bool') || rawTipoMeta.includes('realiz') || rawTipoMeta.includes('cumpl')) {
            tipoMeta = PolTipoMeta.BOOLEANO
            metaBooleana = true
        }

        const rawPeriodicidad = cleanStr(r['Periodicidad'])
        let periodicidad: PolPeriodicidad = PolPeriodicidad.SIN_DEFINIR
        if (rawPeriodicidad.toLowerCase().includes('anual')) periodicidad = PolPeriodicidad.ANUAL
        else if (rawPeriodicidad.toLowerCase().includes('cuatren') || rawPeriodicidad.toLowerCase().includes('cuatrin')) periodicidad = PolPeriodicidad.CUATRIENIO
        else if (rawPeriodicidad.toLowerCase().includes('decen')) periodicidad = PolPeriodicidad.DECENIO

        const rawPlaneado = cleanStr(r['Planeado'])
        const presupuestoPlaneado = parseDecimal(r['Planeado'])
        const presupuestoPendiente = rawPlaneado.toUpperCase() === 'PENDIENTE'

        // Clave dedupe basada en el nombre normalizado + tipoMeta + meta
        const normNombre = normalizeKey(nombreActividad)
        const metaKeyPart = metaNumero != null ? `num_${metaNumero}` : metaBooleana ? 'bool_1' : 'sin_meta'
        const claveDedupe = `${normNombre}_${metaKeyPart}`

        let actId = actividadesMap.get(claveDedupe)

        if (!actId) {
            const act = await prisma.polActividad.upsert({
                where: {
                    municipioId_claveDedupe: { municipioId: municipio.id, claveDedupe },
                },
                update: {
                    codigo: cleanStr(r['CODIGO_ACTIVIDAD']) || undefined,
                    nombre: nombreActividad,
                    lineaId: lineaId || undefined,
                    dependenciaId: dependenciaId || undefined,
                    indicadorId: indicadorId || undefined,
                    tipoMeta,
                    metaNumero,
                    metaBooleana,
                    periodicidad,
                    periodicidadRaw: rawPeriodicidad || undefined,
                    presupuestoPlaneado,
                    presupuestoPendiente,
                },
                create: {
                    municipioId: municipio.id,
                    lineaId: lineaId || undefined,
                    dependenciaId: dependenciaId || undefined,
                    indicadorId: indicadorId || undefined,
                    codigo: cleanStr(r['CODIGO_ACTIVIDAD']) || undefined,
                    nombre: nombreActividad,
                    tipoMeta,
                    metaNumero,
                    metaBooleana,
                    periodicidad,
                    periodicidadRaw: rawPeriodicidad || undefined,
                    presupuestoPlaneado,
                    presupuestoPendiente,
                    claveDedupe,
                },
            })
            actId = act.id
            actividadesMap.set(claveDedupe, actId)
        }

        // Asociar a la política
        if (pId && actId) {
            await prisma.polActividadPolitica.upsert({
                where: {
                    actividadId_politicaId: { actividadId: actId, politicaId: pId },
                },
                update: {},
                create: { actividadId: actId, politicaId: pId },
            })
        }
    }
    console.log(`✅ Actividades deduplicadas e importadas: ${actividadesMap.size}`)

    // 7. Usuarios y Permisos
    const usuariosMap = new Map<string, string>() // key -> usuarioId
    let uIndex = 0

    for (const r of rowsUsuarios) {
        uIndex++
        const nombre = cleanStr(r['NOMBRE'])
        const telRaw = cleanStr(r['TELEFONO'])
        const telDigits = cleanDigits(telRaw)
        const depNombre = cleanStr(r['DEPENDENCIA'])
        const depId = dependenciasMap.get(normalizeKey(depNombre))

        if (!nombre && !telDigits) continue

        if (telDigits.length < 7) {
            anomalías.push(`Usuarios,${uIndex},"Teléfono corto o irregular","${nombre} - ${telRaw}"`)
        }

        const claveDedupe = telDigits ? `tel_${telDigits}` : `nom_${normalizeKey(nombre)}`

        // Determinar rol inicial
        let rol: PolRol = PolRol.REPORTA
        if (nombre.toLowerCase().includes('sofia moreno') || nombre.toLowerCase().includes('superadmin')) {
            rol = PolRol.SUPERADMIN
        } else if (nombre.toLowerCase().includes('planeacion') || nombre.toLowerCase().includes('admin')) {
            rol = PolRol.ADMIN
        }

        const u = await prisma.polUsuario.upsert({
            where: {
                municipioId_claveDedupe: { municipioId: municipio.id, claveDedupe },
            },
            update: {
                nombre,
                telefono: telDigits || undefined,
                telefonoRaw: telRaw || undefined,
                dependenciaId: depId || undefined,
                rol,
            },
            create: {
                municipioId: municipio.id,
                dependenciaId: depId || undefined,
                nombre,
                telefono: telDigits || undefined,
                telefonoRaw: telRaw || undefined,
                rol,
                claveDedupe,
            },
        })
        usuariosMap.set(claveDedupe, u.id)
        if (telDigits) usuariosMap.set(`tel_${telDigits}`, u.id)
        usuariosMap.set(`nom_${normalizeKey(nombre)}`, u.id)
    }

    // Permisos especiales
    for (const r of rowsPermisos) {
        const telRaw = cleanStr(r['Telefono'])
        const uNombre = cleanStr(r['Usuario'])
        const tipoStr = cleanStr(r['TipoPermiso']).toUpperCase()

        const uId = usuariosMap.get(`tel_${cleanDigits(telRaw)}`) || usuariosMap.get(`nom_${normalizeKey(uNombre)}`)
        if (!uId) continue

        let tipo: PolTipoPermiso = PolTipoPermiso.TODO
        if (tipoStr.includes('POLITICA')) tipo = PolTipoPermiso.POLITICA
        else if (tipoStr.includes('DEPENDENCIA')) tipo = PolTipoPermiso.DEPENDENCIA

        await prisma.polPermiso.upsert({
            where: { usuarioId: uId },
            update: { tipo, valorRaw: tipoStr },
            create: { usuarioId: uId, tipo, valorRaw: tipoStr },
        })
    }
    console.log(`✅ Usuarios cargados: ${usuariosMap.size}`)

    // 8. Avances y Evidencias
    let avIndex = 0
    let conciliadosCount = 0
    let noConciliadosCount = 0

    for (const r of rowsFormulario) {
        avIndex++
        const depNombre = cleanStr(r['DEPENDENCIA'])
        const pNombre = cleanStr(r['Politica'])
        const actNombre = cleanStr(r['Actividad'])
        const fechaEjecucion = cleanStr(r['Fecha de ejecucion'])
        const avanceRaw = cleanStr(r['Avance'])
        const observaciones = cleanStr(r['Observaciones'])
        const checkEvidencia = cleanStr(r['CHECK'])

        if (!actNombre && !avanceRaw && !observaciones) continue

        // Buscar coincidencia de actividad
        const normActNombre = normalizeKey(actNombre)
        let matchedActId: string | null = null

        for (const [clave, id] of Array.from(actividadesMap.entries())) {
            if (clave.startsWith(normActNombre)) {
                matchedActId = id
                break
            }
        }

        const isConciliado = matchedActId != null
        if (isConciliado) conciliadosCount++
        else {
            noConciliadosCount++
            anomalías.push(`Formulario,${avIndex},"Avance sin conciliar","${actNombre} (Dep: ${depNombre}, Pol: ${pNombre})"`)
        }

        // Parsear valores
        const valorNumero = parseDecimal(avanceRaw)
        const valorBooleano = avanceRaw.toLowerCase() === 'realizado' || avanceRaw === '1' || avanceRaw.toLowerCase() === 'si' || avanceRaw.toLowerCase() === 'sí'

        const av = await prisma.polAvance.upsert({
            where: {
                municipioId_origenFila: { municipioId: municipio.id, origenFila: avIndex },
            },
            update: {
                actividadId: matchedActId || undefined,
                periodoTexto: fechaEjecucion || undefined,
                valorNumero,
                valorBooleano,
                valorRaw: avanceRaw || undefined,
                observaciones: observaciones || undefined,
                conciliado: isConciliado,
                actividadTexto: isConciliado ? undefined : actNombre,
            },
            create: {
                municipioId: municipio.id,
                actividadId: matchedActId || undefined,
                periodoTexto: fechaEjecucion || undefined,
                valorNumero,
                valorBooleano,
                valorRaw: avanceRaw || undefined,
                observaciones: observaciones || undefined,
                conciliado: isConciliado,
                actividadTexto: isConciliado ? undefined : actNombre,
                origenFila: avIndex,
            },
        })

        // Evidencia si viene URL
        if (checkEvidencia && (checkEvidencia.startsWith('http://') || checkEvidencia.startsWith('https://'))) {
            await prisma.polEvidencia.create({
                data: {
                    avanceId: av.id,
                    url: checkEvidencia,
                    origen: PolOrigenEvidencia.DRIVE,
                    nombre: 'Evidencia Google Drive',
                },
            })
        }
    }
    console.log(`✅ Avances importados: ${conciliadosCount} conciliados, ${noConciliadosCount} sin conciliar`)

    // 9. Auditoría de ingresos anteriores
    let audIndex = 0
    for (const r of rowsIngresos) {
        audIndex++
        const fechaStr = cleanStr(r['Fecha'])
        const uNombre = cleanStr(r['Usuario'])
        const telRaw = cleanStr(r['Telefono'])
        const accion = cleanStr(r['Accion']) || 'Login'
        const detalle = cleanStr(r['Detalle'])

        const uId = usuariosMap.get(`tel_${cleanDigits(telRaw)}`) || usuariosMap.get(`nom_${normalizeKey(uNombre)}`)

        await prisma.polAuditoria.upsert({
            where: {
                municipioId_origenFila: { municipioId: municipio.id, origenFila: audIndex },
            },
            update: {
                usuarioId: uId || undefined,
                accion,
                detalle: detalle || undefined,
                usuarioText: uNombre,
            },
            create: {
                municipioId: municipio.id,
                usuarioId: uId || undefined,
                accion,
                detalle: detalle || undefined,
                usuarioText: uNombre,
                origenFila: audIndex,
            },
        })
    }
    console.log(`✅ Auditoría: ${rowsIngresos.length} registros cargados`)

    // Write CSV report
    const csvPath = path.join(process.cwd(), 'scripts', 'politica', 'reporte-importacion.csv')
    fs.writeFileSync(csvPath, anomalías.join('\n'), 'utf-8')
    console.log(`📊 Reporte de anomalías guardado en: ${csvPath}`)
    console.log(`🎉 Importación completada con éxito.`)
}

main()
    .catch((e) => {
        console.error('❌ Error durante la importación:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

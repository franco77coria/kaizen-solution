import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const filePath = process.argv[2] || 'C:\\Users\\Usuario\\Downloads\\Base PPM Anapoima.xlsx'

if (!fs.existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`)
    process.exit(1)
}

const workbook = XLSX.readFile(filePath)
console.log('Hojas encontradas:', workbook.SheetNames)

for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet)
    console.log(`Hoja: "${sheetName}" - Total filas: ${data.length}`)
    if (data.length > 0) {
        console.log(`  Columnas:`, Object.keys(data[0] as object))
    }
}

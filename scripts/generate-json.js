import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.resolve(__dirname, '../src/assets/data.csv')
const outputPath = path.resolve(__dirname, '../src/assets/data.json')

function parseCsvRow(row) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < row.length; i += 1) {
        const ch = row[i]
        if (ch === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"'
                i += 1
            } else {
                inQuotes = !inQuotes
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim().replace(/\t/g, ''))
            current = ''
        } else {
            current += ch
        }
    }
    result.push(current.trim().replace(/\t/g, ''))
    return result
}

function parseCSV(text) {
    const rows = text.split('\n').slice(4)
    const idSet = new Set()
    const list = []

    rows.forEach((row, index) => {
        if (!row.trim()) return
        const cols = parseCsvRow(row)
        // Basic column count check
        if (cols.length < 24) {
            console.warn(
                `[Warning] Row ${index + 5}: Insufficient columns (${cols.length}/24). Skipping.`,
            )
            return
        }

        const id = cols[0] || ''
        const jp_char = cols[2] || ''
        const cn_char = cols[19] || ''

        // Validation: Required fields
        if (!id || (!jp_char && !cn_char)) {
            console.warn(
                `[Warning] Row ${index + 5}: Missing ID or Characters. ID: ${id}, JP: ${jp_char}, CN: ${cn_char}. Skipping.`,
            )
            return
        }

        // Validation: Duplicate ID
        if (idSet.has(id)) {
            console.warn(
                `[Warning] Row ${index + 5}: Duplicate ID detected "${id}". Skipping duplicate.`,
            )
            return
        }
        idSet.add(id)

        const jpOnList = [cols[3], cols[4], cols[5], cols[6]]
            .filter(Boolean)
            .map((s) => (s === '—' || s === '-' ? '' : s))
            .filter(Boolean)
        const jpKunList = [
            cols[7],
            cols[8],
            cols[9],
            cols[10],
            cols[11],
            cols[12],
            cols[13],
            cols[14],
            cols[15],
            cols[16],
        ]
            .filter(Boolean)
            .map((s) => (s === '—' || s === '-' ? '' : s))
            .filter(Boolean)
        const cnPinyinList = [cols[20], cols[21], cols[22]]
            .filter(Boolean)
            .map((s) => (s === '—' || s === '-' ? '' : s))
            .filter(Boolean)

        list.push({
            id,
            jp_char,
            jp_on: jpOnList.join(',') || '',
            jp_kun: jpKunList.join(',') || '',
            jp_ex: cols[17] || '',
            level: cols[18] || '',
            cn_char,
            cn_pinyin: cnPinyinList.join(',') || '',
            is_diff: (cols[23] || '').trim() || '否',
        })
    })
    return list
}

try {
    const csvText = fs.readFileSync(inputPath, 'utf-8')
    const data = parseCSV(csvText)
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`Successfully generated data.json with ${data.length} entries.`)
} catch (e) {
    console.error('Failed to generate JSON:', e)
    process.exit(1)
}

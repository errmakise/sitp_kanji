import { describe, it, expect } from 'vitest'
import { loadCharDB, searchKanji, getCharById } from './kanji'

describe('Kanji Service Performance (Optimized)', () => {
    it('measures cold start (data access)', async () => {
        // In the new architecture, data is imported at module level.
        // This test measures the time to access it via the API.
        // The heavy lifting (parsing) is done at build/load time.
        const start = performance.now()
        const db = await loadCharDB()
        const end = performance.now()
        console.log(`[Optimized] Data Access Time: ${(end - start).toFixed(2)}ms`)
        expect(db.length).toBeGreaterThan(0)
    })

    it('measures general search performance (O(N) Filter)', async () => {
        await loadCharDB()

        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
            searchKanji('水')
        }
        const end = performance.now()
        console.log(`[Optimized] 1000 General Searches: ${(end - start).toFixed(2)}ms`)
    })

    it('measures instant lookup performance (O(1) Map)', async () => {
        const db = await loadCharDB()
        const targetId = db[0].id

        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
            getCharById(targetId)
        }
        const end = performance.now()
        console.log(`[Optimized] 1000 ID Lookups: ${(end - start).toFixed(2)}ms`)
    })
})

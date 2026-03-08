import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { createNextExercise, checkAnswer } from '../logic/exercise'

export const useUserStore = defineStore('user', () => {
    // --- State: Collections ---
    // Format: { "默认收藏": ["id1", "id2"], "MyFolder": [...] }
    const collectionsByFolder = ref({})

    // Legacy support (optional, but good to have for migration)
    const legacyCollection = ref([])

    // --- State: Exercise ---
    const exerciseSession = ref(null)
    const currentExercise = ref(null)
    const wrongSet = ref([])
    // 练习历史记录：[{ timestamp: 123, score: 80, total: 100 }, ...]
    const exerciseHistory = ref([])

    // --- Actions: Init ---
    function init() {
        try {
            // Load Collections
            const rawFolders = localStorage.getItem('kanjiCollectionsByFolder')
            if (rawFolders) {
                collectionsByFolder.value = JSON.parse(rawFolders)
            } else {
                collectionsByFolder.value = { "默认收藏": [] }
            }

            // Load Legacy
            const rawLegacy = localStorage.getItem('kanjiCollection')
            if (rawLegacy) {
                legacyCollection.value = JSON.parse(rawLegacy)
                // Auto-migrate if needed
                if (legacyCollection.value.length > 0 && (!collectionsByFolder.value['默认收藏'] || collectionsByFolder.value['默认收藏'].length === 0)) {
                    collectionsByFolder.value['默认收藏'] = [...new Set(legacyCollection.value)]
                }
            }

            // Load Wrong Set
            const rawWrong = localStorage.getItem('kanjiWrongSet')
            if (rawWrong) {
                wrongSet.value = JSON.parse(rawWrong)
            }

            // Load History
            const rawHistory = localStorage.getItem('kanjiExerciseHistory')
            if (rawHistory) {
                exerciseHistory.value = JSON.parse(rawHistory)
            }
        } catch (e) {
            console.error('Failed to load user data', e)
        }
    }

    // --- Watchers for Persistence ---
    watch(collectionsByFolder, (newVal) => {
        localStorage.setItem('kanjiCollectionsByFolder', JSON.stringify(newVal))
    }, { deep: true })

    watch(wrongSet, (newVal) => {
        localStorage.setItem('kanjiWrongSet', JSON.stringify(newVal))
    }, { deep: true })

    watch(exerciseHistory, (newVal) => {
        localStorage.setItem('kanjiExerciseHistory', JSON.stringify(newVal))
    }, { deep: true })

    // --- Actions: Collections ---
    function ensureFolder(name) {
        if (!collectionsByFolder.value[name]) {
            collectionsByFolder.value[name] = []
        }
    }

    function toggleCollect(id, folderName = '默认收藏') {
        ensureFolder(folderName)
        const arr = collectionsByFolder.value[folderName]
        const index = arr.indexOf(id)
        if (index > -1) {
            arr.splice(index, 1) // Remove
        } else {
            arr.push(id) // Add
        }
    }

    function isCollected(id) {
        return Object.values(collectionsByFolder.value).some(arr => arr.includes(id)) || legacyCollection.value.includes(id)
    }

    function getFolderNames() {
        return Object.keys(collectionsByFolder.value)
    }

    function createFolder(name) {
        ensureFolder(name)
    }

    function renameFolder(oldName, newName) {
        if (!oldName || !newName || !collectionsByFolder.value[oldName]) return

        // Merge if target exists
        if (collectionsByFolder.value[newName]) {
            const merged = new Set([
                ...collectionsByFolder.value[newName],
                ...collectionsByFolder.value[oldName]
            ])
            collectionsByFolder.value[newName] = Array.from(merged)
        } else {
            collectionsByFolder.value[newName] = collectionsByFolder.value[oldName]
        }
        delete collectionsByFolder.value[oldName]
    }

    function deleteFolder(name, mergeToDefault = true) {
        if (!name || !collectionsByFolder.value[name]) return

        if (mergeToDefault) {
            // Merge to default
            ensureFolder('默认收藏')
            const merged = new Set([
                ...collectionsByFolder.value['默认收藏'],
                ...collectionsByFolder.value[name]
            ])
            collectionsByFolder.value['默认收藏'] = Array.from(merged)
        }

        delete collectionsByFolder.value[name]
    }

    function getFoldersOfId(id) {
        const result = []
        Object.keys(collectionsByFolder.value).forEach(name => {
            if (collectionsByFolder.value[name].includes(id)) {
                result.push(name)
            }
        })
        return result
    }

    function setFoldersForId(id, targetFolders) {
        if (!id) return
        const targets = targetFolders || ['默认收藏']

        // Setup expected folders
        targets.forEach(name => ensureFolder(name))

        // Remove from others
        Object.keys(collectionsByFolder.value).forEach(name => {
            const arr = collectionsByFolder.value[name]
            const index = arr.indexOf(id)
            if (index > -1 && !targets.includes(name)) {
                arr.splice(index, 1)
            }
        })

        // Add to targets
        targets.forEach(name => {
            const arr = collectionsByFolder.value[name]
            if (!arr.includes(id)) {
                arr.push(id)
            }
        })
    }

    function removeIdFromAllFolders(id) {
        Object.keys(collectionsByFolder.value).forEach(name => {
            const arr = collectionsByFolder.value[name]
            const index = arr.indexOf(id)
            if (index > -1) arr.splice(index, 1)
        })
    }
    function startExercise() {
        // Reset session
        exerciseSession.value = { index: 0, total: 10, score: 0, log: [] }
        nextQuestion()
    }

    function nextQuestion() {
        const { session, exercise, finished } = createNextExercise(exerciseSession.value)

        if (finished) {
            // End state: record history logic moved to submitAnswer/saveHistory
            // But if we skipped questions or something?
            // Actually createNextExercise returns finished if index >= total.
            // If we are here, it means we asked for next but there are none.
            currentExercise.value = null
        } else {
            exerciseSession.value = session // update index
            currentExercise.value = exercise
        }
    }

    function submitAnswer(isCorrect) {
        if (!exerciseSession.value || !currentExercise.value) return { finished: false }

        const { session, finished } = checkAnswer(exerciseSession.value, currentExercise.value, isCorrect)
        exerciseSession.value = session

        // Record wrong answer for repetition
        if (!isCorrect && currentExercise.value.type === 'writing') {
            const id = currentExercise.value.entry.id
            if (id && !wrongSet.value.includes(id)) {
                wrongSet.value.push(id)
            }
        }

        if (finished) {
            saveHistory()
        }

        return { finished }
    }

    function saveHistory() {
        if (!exerciseSession.value) return

        const finalScore = exerciseSession.value.score
        const maxScore = (exerciseSession.value.total || 10) * 10
        const log = exerciseSession.value.log || []

        exerciseHistory.value.unshift({
            timestamp: Date.now(),
            score: finalScore,
            total: maxScore,
            correctCount: log.filter(x => x.correct).length,
            totalCount: exerciseSession.value.total,
            // Save detailed log for history review
            details: log.map(item => ({
                id: item.id,
                entry: item.entry,
                correct: item.correct
            }))
        })

        // Keep history limit
        if (exerciseHistory.value.length > 50) {
            exerciseHistory.value.pop()
        }
    }

    function quitExercise() {
        exerciseSession.value = null
        currentExercise.value = null
    }

    // --- Actions: Import/Export ---
    function exportData() {
        return JSON.stringify({
            collectionsByFolder: collectionsByFolder.value,
            wrongSet: wrongSet.value,
            exerciseHistory: exerciseHistory.value,
            version: 1,
            timestamp: Date.now()
        }, null, 2)
    }

    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString)

            // Check basic structure
            if (!data || typeof data !== 'object') {
                 return { success: false, message: '无效的数据格式' }
            }

            // 1. Restore Collections
            if (data.collectionsByFolder) {
                // Merge strategy:
                Object.keys(data.collectionsByFolder).forEach(folderName => {
                    if (!collectionsByFolder.value[folderName]) {
                        collectionsByFolder.value[folderName] = []
                    }
                    const existingSet = new Set(collectionsByFolder.value[folderName])
                    const newItems = data.collectionsByFolder[folderName]
                    if (Array.isArray(newItems)) {
                        newItems.forEach(id => existingSet.add(id))
                    }
                    collectionsByFolder.value[folderName] = Array.from(existingSet)
                })
            }

            // 2. Restore Wrong Set
            if (data.wrongSet && Array.isArray(data.wrongSet)) {
                const existingWrong = new Set(wrongSet.value)
                data.wrongSet.forEach(id => existingWrong.add(id))
                wrongSet.value = Array.from(existingWrong)
            }

            // 3. Restore History
            if (data.exerciseHistory && Array.isArray(data.exerciseHistory)) {
                // Merge history: unique by timestamp to avoid duplicates if importing same file
                const existingTimestamps = new Set(exerciseHistory.value.map(x => x.timestamp))
                const newHistory = data.exerciseHistory.filter(x => !existingTimestamps.has(x.timestamp))

                exerciseHistory.value = [...newHistory, ...exerciseHistory.value]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    // Optional: increase limit if user wants to keep all imported history
                    .slice(0, 100)
            }

            return { success: true, message: '数据导入成功' }
        } catch (e) {
            console.error('Import failed', e)
            return { success: false, message: '数据解析失败，请检查文件格式' }
        }
    }

    function clearAllData() {
        collectionsByFolder.value = { "默认收藏": [] }
        legacyCollection.value = []
        wrongSet.value = []
        exerciseHistory.value = []

        localStorage.removeItem('kanjiCollectionsByFolder')
        localStorage.removeItem('kanjiCollection')
        localStorage.removeItem('kanjiWrongSet')
        localStorage.removeItem('kanjiExerciseHistory')
    }

    return {
        // State
        collectionsByFolder,
        exerciseSession,
        currentExercise,
        wrongSet,
        exerciseHistory,

        // Actions
        init,
        toggleCollect,
        isCollected,
        getFolderNames,
        createFolder,
        renameFolder,
        deleteFolder,
        getFoldersOfId,
        setFoldersForId,
        removeIdFromAllFolders,

        startExercise,
        nextQuestion,
        submitAnswer,
        quitExercise,

        exportData,
        importData,
        clearAllData
    }
})

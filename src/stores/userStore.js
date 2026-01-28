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

    function deleteFolder(name) {
        if (!name || !collectionsByFolder.value[name]) return

        // Merge to default
        ensureFolder('默认收藏')
        const merged = new Set([
            ...collectionsByFolder.value['默认收藏'],
            ...collectionsByFolder.value[name]
        ])
        collectionsByFolder.value['默认收藏'] = Array.from(merged)
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

        // If createNextExercise returns a modified session, update it?
        // Actually our createNextExercise logic mutates the passed session object or returns a new one.
        // Let's assume it returns updated state.

        if (finished) {
            // End state
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

        return { finished }
    }

    function quitExercise() {
        exerciseSession.value = null
        currentExercise.value = null
    }

    return {
        // State
        collectionsByFolder,
        exerciseSession,
        currentExercise,
        wrongSet,

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
        quitExercise
    }
})

import { loadCharDB } from '../api/kanji'

/**
 * random integer [0, max)
 */
function randomInt(max) {
    return Math.floor(Math.random() * max)
}

function pickExerciseEntry() {
    const charDB = loadCharDB()
    if (!charDB.length) return null
    // Filter for diff entries first
    const diffEntries = charDB.filter((e) => e.is_diff === '否')
    const pool = diffEntries.length > 0 ? diffEntries : charDB
    return pool[randomInt(pool.length)]
}

export function createNextExercise(currentSession) {
    const session = currentSession || {
        index: 0,
        total: 10,
        score: 0,
        log: [],
    }

    // If done
    if (session.index >= session.total) {
        // Reset or return existing finished state
        return { session, exercise: null, finished: true }
    }

    session.index += 1
    const entry = pickExerciseEntry()
    if (!entry) {
        throw new Error('没有可用的练习数据')
    }

    const mainJpChar = (entry.jp_char || '').split('（')[0]
    const mode = Math.random() > 0.5 ? 'shape' : 'writing'
    let exercise = null

    if (mode === 'shape') {
        const askJapanese = Math.random() > 0.5
        let questionText
        let displayChar
        let displayLang
        let answer
        let revealChar
        let revealLang

        if (askJapanese) {
            questionText = '这是《常用漢字表》中的日文汉字吗？'
            const showCorrect = Math.random() > 0.5
            if (showCorrect) {
                displayChar = mainJpChar
                displayLang = 'jp'
                answer = true
                revealChar = mainJpChar
                revealLang = 'jp'
            } else {
                displayChar = entry.cn_char
                displayLang = 'cn'
                answer = false
                revealChar = mainJpChar
                revealLang = 'jp'
            }
        } else {
            questionText = '这是《通用规范汉字表》中的中文汉字吗？'
            const showCorrect = Math.random() > 0.5
            if (showCorrect) {
                displayChar = entry.cn_char
                displayLang = 'cn'
                answer = true
                revealChar = entry.cn_char
                revealLang = 'cn'
            } else {
                displayChar = mainJpChar
                displayLang = 'jp'
                answer = false
                revealChar = entry.cn_char
                revealLang = 'cn'
            }
        }
        exercise = {
            type: 'shape',
            entry,
            questionText,
            displayChar,
            displayLang,
            answer,
            revealChar,
            revealLang,
        }
    } else {
        const firstOn = (entry.jp_on || '').split(',')[0] || '—'
        exercise = {
            type: 'writing',
            entry,
            questionText: '请根据提示在纸上写出对应的日文汉字：',
            displayChar: entry.cn_char,
            displayLang: 'cn',
            reading: firstOn,
            revealChar: mainJpChar || '?',
            revealLang: 'jp',
        }
    }
    return { session, exercise, finished: false }
}

export function checkAnswer(session, exercise, isCorrect) {
    const newSession = { ...session }

    if (isCorrect) {
        newSession.score += 10
    }

    newSession.log.push({
        id: exercise.entry.id,
        entry: exercise.entry,
        type: exercise.type,
        correct: !!isCorrect
    })

    const finished = newSession.index >= newSession.total
    return { session: newSession, finished }
}

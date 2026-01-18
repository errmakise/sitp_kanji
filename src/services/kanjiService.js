import dataUrl from '../assets/data.csv?url'

const isTestEnv =
  typeof globalThis !== 'undefined' &&
  globalThis.process &&
  globalThis.process.env &&
  typeof globalThis.process.env.VITEST !== 'undefined'

let charDB = []
let legacyCollection = []
let collectionsByFolder = {}
let exerciseSession = null
let currentExercise = null

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
  const list = rows
    .map((row) => {
      if (!row.trim()) return null
      const cols = parseCsvRow(row)
      if (cols.length < 24) return null
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
      return {
        id: cols[0] || '',
        jp_char: cols[2] || '',
        jp_on: jpOnList.join(',') || '',
        jp_kun: jpKunList.join(',') || '',
        jp_ex: cols[17] || '',
        level: cols[18] || '',
        cn_char: cols[19] || '',
        cn_pinyin: cnPinyinList.join(',') || '',
        is_diff: (cols[23] || '').trim() || '否',
      }
    })
    .filter((entry) => entry && entry.id && (entry.jp_char || entry.cn_char))
  return list
}

export async function loadCharDB() {
  if (charDB.length > 0) return charDB
  try {
    const response = await fetch(dataUrl)
    if (!response.ok) {
      throw new Error(`加载 data.csv 失败，状态码 ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    const decoder = new TextDecoder('utf-8')
    const csvText = decoder.decode(buffer)
    charDB = parseCSV(csvText)
    return charDB
  } catch (e) {
    if (typeof window === 'undefined' || isTestEnv) {
      charDB = []
      return charDB
    }
    throw e
  }
}

export function getCharDB() {
  return charDB
}

export function searchKanji(query) {
  const q = query.trim()
  if (!q) return []
  return charDB.filter((entry) => {
    const mainJpChar = (entry.jp_char || '').split('（')[0].trim()
    const cnChar = (entry.cn_char || '').trim()
    return (
      mainJpChar === q ||
      cnChar === q ||
      mainJpChar.startsWith(q) ||
      cnChar.startsWith(q)
    )
  })
}

function getLegacyCollection() {
  try {
    const raw = localStorage.getItem('kanjiCollection')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function saveLegacyCollection() {
  localStorage.setItem('kanjiCollection', JSON.stringify(legacyCollection))
}

function getCollectionsByFolderFromStorage() {
  try {
    const raw = localStorage.getItem('kanjiCollectionsByFolder')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
    return {}
  } catch {
    return {}
  }
}

function saveCollectionsByFolder() {
  localStorage.setItem(
    'kanjiCollectionsByFolder',
    JSON.stringify(collectionsByFolder),
  )
}

function ensureFolder(name) {
  if (!collectionsByFolder[name]) {
    collectionsByFolder[name] = []
    saveCollectionsByFolder()
  }
}

function migrateLegacyCollection() {
  if (
    legacyCollection.length > 0 &&
    Object.keys(collectionsByFolder).length === 0
  ) {
    collectionsByFolder['默认收藏'] = [...new Set(legacyCollection)]
    saveCollectionsByFolder()
  }
  ensureFolder('默认收藏')
}

export function isCollectedId(id) {
  if (!id) return false
  if (legacyCollection && legacyCollection.includes(id)) return true
  return Object.values(collectionsByFolder || {}).some((arr) =>
    (arr || []).includes(id),
  )
}

function getSnapshotForFolder(folderName) {
  const names = Object.keys(collectionsByFolder)
  const folder = folderName && names.includes(folderName) ? folderName : '默认收藏'
  ensureFolder(folder)
  const ids = collectionsByFolder[folder] || []
  const entries = ids
    .map((id) => charDB.find((entry) => entry.id === id))
    .filter(Boolean)
  return {
    folderNames: names.length ? names : ['默认收藏'],
    currentFolder: folder,
    currentFolderEntries: entries,
  }
}

export function initCollections() {
  legacyCollection = getLegacyCollection()
  collectionsByFolder = getCollectionsByFolderFromStorage()
  migrateLegacyCollection()
  return getSnapshotForFolder('默认收藏')
}

export function changeCurrentFolder(folderName) {
  return getSnapshotForFolder(folderName)
}

export function toggleCollectInFolder(folderName, id) {
  if (!id) return getSnapshotForFolder(folderName)
  const folder =
    folderName && Object.keys(collectionsByFolder).includes(folderName)
      ? folderName
      : '默认收藏'
  ensureFolder(folder)
  const arr = collectionsByFolder[folder]
  const index = arr.indexOf(id)
  if (index > -1) {
    arr.splice(index, 1)
  } else {
    arr.push(id)
  }
  saveCollectionsByFolder()
  const legacyIndex = legacyCollection.indexOf(id)
  if (legacyIndex > -1 && !isCollectedId(id)) {
    legacyCollection.splice(legacyIndex, 1)
    saveLegacyCollection()
  }
  return getSnapshotForFolder(folder)
}

export function getFoldersOfId(id) {
  const result = []
  Object.keys(collectionsByFolder || {}).forEach((name) => {
    const arr = collectionsByFolder[name] || []
    if (arr.includes(id)) result.push(name)
  })
  return result
}

export function getAllFolderNames() {
  const names = Object.keys(collectionsByFolder)
  if (!names.length) {
    ensureFolder('默认收藏')
    return ['默认收藏']
  }
  return names
}

export function setFoldersForId(id, folders) {
  if (!id) return
  const list = Array.isArray(folders) && folders.length ? folders : ['默认收藏']
  const target = Array.from(
    new Set(
      list.filter((name) => typeof name === 'string' && name.trim().length),
    ),
  )
  if (!target.length) {
    target.push('默认收藏')
  }
  target.forEach((name) => {
    ensureFolder(name)
  })
  Object.keys(collectionsByFolder || {}).forEach((name) => {
    const arr = collectionsByFolder[name] || []
    const index = arr.indexOf(id)
    if (index > -1 && !target.includes(name)) {
      arr.splice(index, 1)
    }
  })
  target.forEach((name) => {
    const arr = collectionsByFolder[name] || []
    if (!arr.includes(id)) {
      arr.push(id)
      collectionsByFolder[name] = arr
    }
  })
  saveCollectionsByFolder()
  const legacyIndex = legacyCollection.indexOf(id)
  if (legacyIndex > -1 && !isCollectedId(id)) {
    legacyCollection.splice(legacyIndex, 1)
    saveLegacyCollection()
  }
}

export function removeIdFromAllFolders(id) {
  if (!id) return
  Object.keys(collectionsByFolder || {}).forEach((name) => {
    const arr = collectionsByFolder[name] || []
    const index = arr.indexOf(id)
    if (index > -1) {
      arr.splice(index, 1)
    }
  })
  saveCollectionsByFolder()
  const legacyIndex = legacyCollection.indexOf(id)
  if (legacyIndex > -1) {
    legacyCollection.splice(legacyIndex, 1)
    saveLegacyCollection()
  }
}

export function renameFolder(oldName, newName) {
  if (!oldName || !newName || !collectionsByFolder[oldName]) {
    return getSnapshotForFolder('默认收藏')
  }
  if (collectionsByFolder[newName]) {
    const merged = Array.from(
      new Set([
        ...(collectionsByFolder[newName] || []),
        ...(collectionsByFolder[oldName] || []),
      ]),
    )
    collectionsByFolder[newName] = merged
    delete collectionsByFolder[oldName]
  } else {
    collectionsByFolder[newName] = collectionsByFolder[oldName]
    delete collectionsByFolder[oldName]
  }
  saveCollectionsByFolder()
  return getSnapshotForFolder(newName)
}

export function deleteFolder(name) {
  if (!name || !collectionsByFolder[name]) {
    return getSnapshotForFolder('默认收藏')
  }
  ensureFolder('默认收藏')
  const merged = Array.from(
    new Set([
      ...(collectionsByFolder['默认收藏'] || []),
      ...(collectionsByFolder[name] || []),
    ]),
  )
  collectionsByFolder['默认收藏'] = merged
  delete collectionsByFolder[name]
  saveCollectionsByFolder()
  return getSnapshotForFolder('默认收藏')
}

export function createFolder(name) {
  if (!name) return getSnapshotForFolder('默认收藏')
  ensureFolder(name)
  return getSnapshotForFolder(name)
}

function pickExerciseEntry() {
  const diffEntries = charDB.filter((e) => e.is_diff === '否')
  const pool = diffEntries.length > 0 ? diffEntries : charDB
  if (!pool.length) return null
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}

export function resetExercise() {
  exerciseSession = null
  currentExercise = null
}

export function createNextExercise() {
  if (!charDB.length) {
    throw new Error('字符数据库尚未加载')
  }
  if (!exerciseSession || exerciseSession.index >= exerciseSession.total) {
    exerciseSession = { index: 0, total: 10, score: 0, log: [] }
  }
  exerciseSession.index += 1
  const entry = pickExerciseEntry()
  if (!entry) {
    throw new Error('没有可用的练习数据')
  }
  const mainJpChar = (entry.jp_char || '').split('（')[0]
  const mode = Math.random() > 0.5 ? 'shape' : 'writing'
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
    currentExercise = {
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
    currentExercise = {
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
  return { session: { ...exerciseSession }, exercise: currentExercise }
}

export function getCurrentExercise() {
  return currentExercise
}

export function getExerciseSession() {
  return exerciseSession
}

export function answerCurrentExercise(correct) {
  if (!exerciseSession || !currentExercise) {
    return { session: null, finished: false }
  }
  if (correct) {
    exerciseSession.score += 10
  } else if (currentExercise.type === 'writing') {
    try {
      const key = 'kanjiWrongSet'
      const raw = localStorage.getItem(key)
      const set = raw ? JSON.parse(raw) : []
      const id = currentExercise.entry && currentExercise.entry.id
      if (id && !set.includes(id)) {
        set.push(id)
        localStorage.setItem(key, JSON.stringify(set))
      }
    } catch {
      return { session: { ...exerciseSession }, finished: false }
    }
  }
  exerciseSession.log.push({
    id: currentExercise.entry.id,
    entry: currentExercise.entry,
    type: currentExercise.type,
    correct: !!correct,
  })
  const finished = exerciseSession.index >= exerciseSession.total
  return { session: { ...exerciseSession }, finished }
}

export function getExerciseResultData() {
  if (!exerciseSession) return null
  const right = []
  const wrong = []
  ;(exerciseSession.log || []).forEach((item) => {
    if (item.correct) right.push(item)
    else wrong.push(item)
  })
  return {
    score: exerciseSession.score,
    totalScore: (exerciseSession.total || 0) * 10,
    right,
    wrong,
  }
}

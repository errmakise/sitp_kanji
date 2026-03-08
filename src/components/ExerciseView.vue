<template>
  <!-- 自主练习视图：在本地随机生成练习题，包含形状判断和写字题 -->
  <section id="exercise-view" class="view">
    <h2 class="section-title">
      自主练习
    </h2>
    <!-- 练习历史 (在未开始练习时显示) -->
    <div v-if="showHistoryPanel" class="history-overlay" @click.self="closeHistoryPanel">
      <div class="history-panel">
        <div class="history-header-row">
          <h3 v-if="!selectedHistoryRecord">练习历史</h3>
          <h3 v-else>
            <button class="btn-back" @click="selectedHistoryRecord = null">←</button>
            练习详情
          </h3>
          <button @click="closeHistoryPanel" class="btn-close">×</button>
        </div>

        <!-- 列表模式 -->
        <div v-if="!selectedHistoryRecord" class="history-list-scroll">
          <div v-if="exerciseHistory.length === 0" class="empty-history">暂无记录</div>
          <div
            v-for="record in exerciseHistory"
            :key="record.timestamp"
            class="history-card"
            @click="selectedHistoryRecord = record"
          >
            <div class="history-date">{{ new Date(record.timestamp).toLocaleString() }}</div>
            <div class="history-main-row">
              <div class="history-score">
                <span class="score-num">{{ record.score }}</span>
                <span class="score-total">/ {{ record.total }}</span>
              </div>
              <div class="history-detail">
                答对 {{ record.correctCount }} / {{ record.totalCount }}
              </div>
            </div>
          </div>
        </div>

        <!-- 详情模式 -->
        <div v-else class="history-detail-scroll">
           <!-- Reuse result summary card logic but read-only -->
           <div class="result-summary-card compact">
              <div class="score-circle-wrapper small">
                 <div class="score-value">{{ selectedHistoryRecord.score }}</div>
                 <div class="score-label">总分</div>
              </div>
              <div class="stat-row">
                <div class="stat-item correct">
                  <span class="stat-label">答对</span>
                  <span class="stat-val">{{ selectedHistoryRecord.correctCount }}</span>
                </div>
                <div class="stat-item wrong">
                  <span class="stat-label">答错</span>
                  <span class="stat-val">{{ selectedHistoryRecord.totalCount - selectedHistoryRecord.correctCount }}</span>
                </div>
              </div>
           </div>

           <!-- 历史详情列表 -->
           <div v-if="selectedHistoryRecord.details && selectedHistoryRecord.details.length > 0" class="history-grid-container">
             <div class="mini-cards-grid">
               <div
                  v-for="item in selectedHistoryRecord.details"
                  :key="item.id"
                  class="mini-card"
                  :class="{ 'correct-card': item.correct }"
                  @click="showDetailModal(item.entry)"
               >
                 <div class="mini-card-char">{{ item.entry.jp_char?.split('（')[0] }}</div>
               </div>
             </div>
           </div>
           <div v-else class="history-note">
             (该记录无详细题目数据)
           </div>
        </div>
      </div>
    </div>

    <!-- 首页开始按钮与历史入口 - 已移除，现在自动开始练习 -->
    <div v-if="!showResult && !exerciseSession" class="start-screen">
      <!-- 临时加载状态，理论上 init 会自动开始，不会长时间停留在此 -->
      <div class="loading-text" style="text-align: center; color: var(--secondary-color);">正在加载练习...</div>
    </div>

    <!-- 顶部状态：题号 / 总题数 / 当前得分 -->
    <div
      v-if="!showResult && exerciseSession"
      id="exercise-status"
      class="exercise-status"
    >
      <div class="status-left">{{ exerciseStatusText }}</div>
      <div class="status-right">
        <button class="btn-exit-exercise" @click="restartExercise" style="margin-right: 10px;">
          重新开始
        </button>
        <button class="btn-exit-exercise" @click="exitExercise">
          练习历史
        </button>
      </div>
    </div>
    <!-- 当前题目文案 -->
    <div
      v-if="!showResult"
      id="exercise-question"
      class="exercise-question"
    >
      {{ currentExercise ? currentExercise.questionText : '...' }}
    </div>
      <!-- 翻转卡片：正面显示题目，背面显示答案 -->
    <div
      v-if="!showResult"
      id="flip-container"
      class="flip-container"
      :class="{ flipped: showReveal, 'shake': shakeAnimation }"
    >
      <div class="flipper">
        <div class="flip-side flip-front" :class="{ 'correct-bg': feedbackState === 'correct', 'wrong-bg': feedbackState === 'wrong' }">
          <div id="exercise-glyph">
            <!-- 读音按钮：任何题型都应该显示，只要有读音 -->
            <!-- 修复逻辑：字段名是 jp_on 或 jp_kun，不是 jp_readings -->
            <div
              class="audio-btn-corner"
              v-if="currentExercise && (currentExercise.reading || (currentExercise.entry && (currentExercise.entry.jp_on || currentExercise.entry.jp_kun)))"
              title="播放日文音读"
              @click.stop="speak(currentExercise.reading || (currentExercise.entry ? (currentExercise.entry.jp_on || currentExercise.entry.jp_kun || '').split(/[,、，\s]/)[0] : ''), 'ja-JP')"
            >
              🔊
            </div>

            <div
              v-if="currentExercise && currentExercise.type === 'shape'"
              :class="currentExercise.displayLang === 'jp' ? 'glyph-jp' : 'glyph-cn'"
            >
              {{ currentExercise.displayChar }}
            </div>
            <div
              v-else-if="currentExercise && currentExercise.type === 'writing'"
              class="writing-block"
            >
              <div class="glyph-cn">
                {{ currentExercise.displayChar }}
              </div>
            </div>
            <div v-else>
              ?
            </div>
          </div>
        </div>
        <div class="flip-side flip-back" :class="{ 'correct-bg': feedbackState === 'correct', 'wrong-bg': feedbackState === 'wrong' }">
          <div id="exercise-reveal">
            <!-- 修复：这里只显示揭示的大字，不再嵌入可能会显示异常状态的复杂组件 -->
            <div
              v-if="currentExercise && showReveal"
              :class="currentExercise.revealLang === 'jp' ? 'glyph-jp' : 'glyph-cn'"
            >
              <span>{{ currentExercise.revealChar }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏弹窗：在练习中对条目进行收藏/取消收藏 -->
    <CollectionPopup
      v-model="showCollectionPopup"
      :target-id="popupTargetId"
      @updated="handleCollectionUpdated"
    />

    <!-- 作答按钮区 -->
    <div
      v-if="!showResult"
      class="choice-buttons"
    >
      <button
        v-if="currentExercise && currentExercise.type === 'shape'"
        id="choice-yes"
        type="button"
        @click="handleShapeAnswer(true)"
      >
        是
      </button>
      <button
        v-if="currentExercise && currentExercise.type === 'shape'"
        id="choice-no"
        type="button"
        @click="handleShapeAnswer(false)"
      >
        否
      </button>
      <button
        v-if="currentExercise && currentExercise.type === 'writing' && !showReveal"
        id="choice-done"
        type="button"
        @click="revealWritingAnswer"
      >
        写完了
      </button>
      <button
        v-if="currentExercise && currentExercise.type === 'writing' && showReveal"
        id="choice-correct"
        type="button"
        @click="handleWritingScore(true)"
      >
        写对了
      </button>
      <button
        v-if="currentExercise && currentExercise.type === 'writing' && showReveal"
        id="choice-wrong"
        type="button"
        @click="handleWritingScore(false)"
      >
        写错了
      </button>
    </div>

    <!-- 当前题目的中日对比揭示卡片 (答题后显示) -->
    <transition name="fade-slide">
      <div
        v-if="!showResult && showReveal"
        id="exercise-reveal-card"
        class="exercise-reveal-card"
        ref="revealCardRef"
      >
        <KanjiComparisonCard
          v-if="currentExercise && currentExercise.entry"
          :entry="currentExercise.entry"
          :collected="userStore.isCollected(currentExercise.entry.id)"
          :show-details="true"
          :show-collection-button="true"
          @toggle-collection="toggleCollection"
        />
      </div>
    </transition>

    <!-- 底部反馈与下一个按钮 -->
    <div v-if="!showResult" class="bottom-actions">
      <!-- 反馈 -->
      <div id="exercise-feedback" class="exercise-feedback">
        <span v-if="lastAnswerCorrect === true" id="feedback-correct">{{ exerciseFeedback }}</span>
        <span v-else-if="lastAnswerCorrect === false" id="feedback-wrong">{{ exerciseFeedback }}</span>
      </div>

      <!-- 下一个按钮 -->
      <button
        v-if="canGoNext"
        id="next-exercise-btn"
        type="button"
        class="next-exercise-btn"
        @click="nextExercise"
      >
        下一个
      </button>
    </div>

    <!-- 最终结果：总分 + 答对/答错列表 -->
    <div v-if="showResult && exerciseResult" id="exercise-result" class="exercise-result">
      <div class="result-summary-card">
        <div class="summary-left">
          <div class="score-circle-wrapper">
             <!-- SVG 圆环：半径45，周长=2*PI*45 ≈ 282.74 -->
             <!-- 旋转 -90deg 使起点的 3 点钟方向转到 12 点钟方向 -->
             <svg class="score-circle-svg" viewBox="0 0 100 100">
               <!-- 背景圆：灰色 -->
               <circle class="circle-bg" cx="50" cy="50" r="45"></circle>
               <!-- 进度圆：彩色，初始 stroke-dasharray="0, 282.74" -->
               <circle class="circle-progress" cx="50" cy="50" r="45" ref="scoreCircleRef"></circle>
             </svg>
             <div class="score-circle-content">
               <div class="score-value">{{ exerciseResult.score }}</div>
               <div class="score-label">总分</div>
             </div>
          </div>
        </div>
        <div class="summary-right">
          <div class="stat-row">
            <div class="stat-item correct">
              <span class="stat-label">答对</span>
              <span class="stat-val">{{ exerciseResult.right.length }}</span>
            </div>
            <div class="stat-item wrong">
              <span class="stat-label">答错</span>
              <span class="stat-val">{{ exerciseResult.wrong.length }}</span>
            </div>
          </div>
          <div class="result-actions">
            <button
              id="exercise-restart"
              type="button"
              class="btn-round btn-restart"
              @click="restartExercise"
            >
              再来一组
            </button>
            <button
              id="exercise-history-btn"
              type="button"
              class="btn-round btn-secondary"
              @click="showHistoryPanel = true"
            >
              练习历史
            </button>
          </div>
        </div>
      </div>

      <div class="result-list-container">
        <h3 class="list-title" v-if="exerciseResult.wrong.length > 0">错题回顾</h3>
        <div class="mini-cards-grid">
           <div
            v-for="item in exerciseResult.wrong"
            :key="`w-${item.id}`"
            class="mini-card"
            @click="showDetailModal(item.entry)"
          >
            <div class="mini-card-char">{{ item.entry.jp_char?.split('（')[0] }}</div>
          </div>
        </div>

        <h3 class="list-title" v-if="exerciseResult.right.length > 0" style="margin-top: 30px;">答对记录</h3>
        <div class="mini-cards-grid">
           <div
            v-for="item in exerciseResult.right"
            :key="`r-${item.id}`"
            class="mini-card correct-card"
            @click="showDetailModal(item.entry)"
          >
            <div class="mini-card-char">{{ item.entry.jp_char?.split('（')[0] }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情模态框 -->
    <div v-if="detailModalEntry" class="detail-overlay" @click.self="detailModalEntry = null">
      <div class="detail-panel">
        <button class="btn-close-detail" @click="detailModalEntry = null">×</button>
        <KanjiComparisonCard
          :entry="detailModalEntry"
          :collected="userStore.isCollected(detailModalEntry.id)"
          :show-details="true"
          :show-collection-button="true"
          @toggle-collection="toggleCollection"
        />
      </div>
    </div>

    <div v-if="loadError" class="error">
      {{ loadError }}
    </div>
  </section>
</template>


<script setup>
// 依赖：Vue 响应式、服务层练习与收藏 API、朗读能力、复用的展示与收藏弹窗组件
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { loadCharDB } from '@/api/kanji'
import { useSpeechSynthesis } from '../composables/useSpeechSynthesis'
import KanjiComparisonCard from './KanjiComparisonCard.vue'
import CollectionPopup from './CollectionPopup.vue'

const userStore = useUserStore()

// 页面加载与状态
const loading = ref(true)
const loadError = ref('')

// 最近一次作答反馈文本与标志
const exerciseFeedback = ref('')
const showReveal = ref(false)
const showResult = ref(false)
const lastAnswerCorrect = ref(null)
// 当前题目是否可以进入下一题（控制“下一个”按钮显示）
const canGoNext = ref(false)

// 视觉反馈状态
const feedbackState = ref('') // '' | 'correct' | 'wrong'
const shakeAnimation = ref(false)
const revealCardRef = ref(null)

// 练习历史弹窗
const showHistoryPanel = ref(false)
const selectedHistoryRecord = ref(null)

// 监听关闭
watch(showHistoryPanel, (newVal) => {
  if (!newVal) {
    selectedHistoryRecord.value = null
  }
})

// 结果页面 Tab 状态
const resultTab = ref('wrong')

// 收藏弹窗开关与目标条目 id
const showCollectionPopup = ref(false)
const popupTargetId = ref('')
const detailModalEntry = ref(null)

// 朗读
const { speak } = useSpeechSynthesis()

// Getter helpers for template
const currentExercise = computed(() => userStore.currentExercise)
const exerciseSession = computed(() => userStore.exerciseSession)
const exerciseHistory = computed(() => userStore.exerciseHistory)

// 顶部状态文案
const exerciseStatusText = computed(() => {
  if (loading.value) return '准备中...'
  if (!exerciseSession.value) return '请开始练习'
  return `第 ${exerciseSession.value.index}/${exerciseSession.value.total} 题｜当前得分 ${exerciseSession.value.score}`
})

// 总结结果计算
const exerciseResult = computed(() => {
    if (!showResult.value || !exerciseSession.value) return null
    const right = []
    const wrong = []
    const log = exerciseSession.value.log || []
    log.forEach(item => {
        if (item.correct) right.push(item)
        else wrong.push(item)
    })
    return {
        score: exerciseSession.value.score,
        totalScore: (exerciseSession.value.total || 0) * 10,
        right,
        wrong
    }
})

const scoreCircleRef = ref(null)

// 监听结果显示，触发动画
watch(showResult, (newVal) => {
  if (newVal && exerciseResult.value) {
    // 延迟一点点等待 DOM 渲染
    setTimeout(() => {
        if (scoreCircleRef.value) {
            const score = exerciseResult.value.score
            const total = exerciseResult.value.totalScore || 100
            const percentage = Math.min(Math.max(score / total, 0), 1)
            const circumference = 2 * Math.PI * 45

            // 顺时针填充逻辑：
            // stroke-dasharray = "当前长度, 剩余长度"
            // stroke-dashoffset = 0 (默认从起点开始画)
            // 目标长度 = circumference * percentage

            const targetLength = circumference * percentage

            // 初始状态：长度为 0
            scoreCircleRef.value.style.strokeDasharray = `0 ${circumference}`
            scoreCircleRef.value.style.strokeDashoffset = 0

            // 强制重绘
            scoreCircleRef.value.getBoundingClientRect()

            // 动画过渡到目标长度
            scoreCircleRef.value.style.transition = 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            scoreCircleRef.value.style.strokeDasharray = `${targetLength} ${circumference}`
        }
    }, 100)
  }
})

function showDetailModal(entry) {
  detailModalEntry.value = entry
}

// 初始化
async function init() {
  try {
    loadCharDB() // Ensure loaded
    startExercise() // Auto start as requested
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

const isExiting = ref(false)

// 退出练习（进入历史）
function exitExercise() {
  // 不再标记 isExiting，仅打开历史弹窗
  // 这样关闭历史时，会保持原状，不会自动重启或重置
  showHistoryPanel.value = true
}

// 关闭历史弹窗
function closeHistoryPanel() {
  showHistoryPanel.value = false
  // 仅当没有会话时才尝试自动开始（比如异常情况）
  // 正常查看历史后关闭，不做任何操作，保持当前练习状态
  if (!userStore.exerciseSession) {
    restartExercise()
  }
}

// 开始下一题（或第一题）
function startExercise() {
  userStore.startExercise()
  resetLocalState()
}

function resetLocalState() {
  exerciseFeedback.value = ''
  showReveal.value = false
  showResult.value = false
  lastAnswerCorrect.value = null
  canGoNext.value = false
  feedbackState.value = ''
  shakeAnimation.value = false
}

// 触发视觉反馈
function triggerFeedback(correct) {
  if (correct) {
    feedbackState.value = 'correct'
    // 播放正确音效（可选）
  } else {
    feedbackState.value = 'wrong'
    shakeAnimation.value = true
    setTimeout(() => { shakeAnimation.value = false }, 500)
    // 播放错误音效（可选）
  }
}

// 形状题作答
function handleShapeAnswer(userAnswer) {
  if (!currentExercise.value || currentExercise.value.type !== 'shape') return
  const correct = userAnswer === currentExercise.value.answer

  triggerFeedback(correct)
  const { finished } = userStore.submitAnswer(correct)

  lastAnswerCorrect.value = correct
  exerciseFeedback.value = correct ? '正确！(+10)' : '错误！(+0)'
  showReveal.value = true

  // 滚动到揭示卡片
  setTimeout(() => {
    if (revealCardRef.value) {
      revealCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 300)

  canGoNext.value = !finished
  if (finished) {
    setTimeout(() => { showResult.value = true }, 1500)
  }
}

// 写字题：翻面
function revealWritingAnswer() {
  if (!currentExercise.value || currentExercise.value.type !== 'writing') return
  showReveal.value = true

  // 滚动到揭示卡片
  setTimeout(() => {
    if (revealCardRef.value) {
      revealCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 300)
}

// 写字题自评
function handleWritingScore(correct) {
  if (!currentExercise.value || currentExercise.value.type !== 'writing') return

  triggerFeedback(correct)
  const { finished } = userStore.submitAnswer(correct)

  lastAnswerCorrect.value = correct
  exerciseFeedback.value = correct
    ? '自评：写对了！(+10)'
    : '自评：写错了。(+0)'

  // 滚动到揭示卡片
  setTimeout(() => {
    if (revealCardRef.value) {
      revealCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 300)

  canGoNext.value = !finished
  if (finished) {
    setTimeout(() => { showResult.value = true }, 1500)
  }
}

// 切换下一题
function nextExercise() {
  if (!userStore.exerciseSession) return
  // Check if session finished logic is handled in store or here?
  // Our store `nextQuestion` updates state.
  // But wait, if we are at the end, `nextQuestion` might return finished.
  const session = userStore.exerciseSession
  if (session.index >= session.total) {
      showResult.value = true
      return
  }
  userStore.nextQuestion()
  resetLocalState()
}

// 重新开始
function restartExercise() {
  userStore.startExercise() // Resets session
  resetLocalState()
}

// 点击星标
function toggleCollection(id) {
  if (!id) return
  popupTargetId.value = id
  showCollectionPopup.value = true
}

// 弹窗回调
function handleCollectionUpdated() {
  // No explicit refresh needed as we use computed properties, but result might need reactive trigger
  // Since `exerciseResult` is computed from `exerciseSession`, and store state is reactive, it should work.
}

onMounted(() => {
  init()
})
</script>

<style scoped>
.error {
  margin-top: 12px;
  color: var(--highlight-color);
}

/* 首页样式 */
.start-screen {
  margin-bottom: 30px;
}

.start-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px; /* Horizontal gap */
}

/* 练习状态栏 */
.exercise-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 1rem;
  color: var(--secondary-color);
  font-weight: 600;
}

.btn-exit-exercise {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--secondary-color);
  font-family: 'Noto Serif SC', serif;
}

.btn-exit-exercise:hover {
  background: var(--card-bg);
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.btn-history {
  padding: 8px 20px;
  background: transparent;
  color: var(--secondary-color);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-family: 'Noto Serif SC', serif;
}

.btn-history:hover {
  background: var(--card-bg);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* 历史记录弹窗 */
.history-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.history-panel {
  background: var(--card-bg);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.history-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.history-header-row h3 {
  margin: 0;
  color: var(--primary-color);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.history-list-scroll {
  overflow-y: auto;
  flex: 1;
}

.history-card {
  margin-bottom: 10px;
  cursor: pointer; /* make clickable */
  transition: all 0.2s;
}

.history-card:hover {
  background-color: #f9f9f9;
}

.empty-history {
  text-align: center;
  color: #999;
  padding: 30px;
}

/* 历史详情相关 */
.btn-back {
  background: none;
  border: none;
  font-size: 1.2rem;
  margin-right: 10px;
  cursor: pointer;
  color: var(--secondary-color);
}

.history-detail-scroll {
  padding: 20px;
  text-align: center;
}

.result-summary-card.compact {
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  animation: none;
  box-shadow: none;
  border: 1px dashed var(--border-color);
}

.score-circle-wrapper.small {
  width: 100px;
  height: 100px;
}

.history-note {
  margin-top: 20px;
  color: #999;
  font-size: 0.85rem;
}

/* 练习题目卡片 */
.flip-container {
  perspective: 1000px;
  margin: 15px auto;
  width: 100%;
  max-width: 300px;
  height: 240px;
  position: relative;
  z-index: 1;
}

/* 读音按钮优化：改为右上角悬浮 */
.audio-btn-corner {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--secondary-color);
  opacity: 0.6;
  transition: all 0.2s;
  z-index: 10;
}

.audio-btn-corner:hover {
  opacity: 1;
  transform: scale(1.1);
  color: var(--primary-color);
}

.flipper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: 0.6s;
}

.flip-side {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden; /* Safari */
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--shadow-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box; /* 防止 padding 撑大 */
}

#exercise-glyph {
  font-family: 'Noto Serif JP', 'Noto Serif SC', serif;
  font-size: 6rem; /* 进一步缩小字体 */
  font-weight: bold;
  color: var(--primary-color);
  margin: 0;
  min-height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.writing-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.writing-block .glyph-cn {
  font-size: 6rem; /* 同步缩小 */
  line-height: 1;
  margin-bottom: 5px; /* 减小间距 */
}

.writing-block .audio-btn {
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--accent-color);
  transition: transform 0.2s;
  margin-top: 5px;
}

/* 选项按钮容器优化 */
.choice-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px; /* 稍微增加一点间距，防止贴太紧 */
  gap: 15px;
  position: relative; /* 确保层级 */
  z-index: 2; /* 高于卡片容器 */
}

.exercise-question {
  font-size: 1.2rem; /* 字体稍微调小 */
  font-weight: 500;
  margin-bottom: 15px; /* 减小题目文字与卡片的间距 */
  color: var(--primary-color);
}

.choice-buttons button {
  font-size: 1.1rem;
  padding: 10px 30px;
  cursor: pointer;
  border-radius: 30px;
  border: 1px solid var(--secondary-color);
  background-color: var(--card-bg);
  color: var(--secondary-color);
  font-weight: 600;
  font-family: 'Noto Serif SC', serif;
  transition: all 0.2s;
  box-shadow: var(--shadow-soft);
}

/* 底部操作区 */
.bottom-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 25px;
  position: relative;
  min-height: 50px; /* 预留高度 */
}

.exercise-feedback {
  font-size: 1.3rem;
  font-weight: bold;
  /* 绝对定位居中，或者 flex 居中 */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  text-align: center;
  margin-top: 0; /* reset */
}

.next-exercise-btn {
  font-size: 1.1rem;
  padding: 10px 30px;
  cursor: pointer;
  border-radius: 30px;
  border: none;
  background-color: var(--primary-color);
  color: #fff;
  font-weight: 600;
  font-family: 'Noto Serif SC', serif;
  box-shadow: var(--shadow-soft);
  transition: all 0.2s;

  /* 靠右 */
  margin-left: auto; /* Push to right in flex container if needed, but here we want absolute or specific placement */
  position: absolute;
  right: 0;
  margin-top: 0; /* reset */
}

/* 揭示卡片容器 */
.exercise-reveal-card {
  margin-top: 15px;
  /* 移除边框和额外内边距，使其更紧凑 */
  padding-top: 0;
  border-top: none;
}

/* 揭示卡片动画 */
.fade-slide-enter-active {
  transition: all 0.5s ease-out;
}

.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* 视觉反馈动画 */
.correct-bg {
  background-color: #e6ffed !important;
  border-color: #28a745 !important;
  transition: background-color 0.3s, border-color 0.3s;
}

.wrong-bg {
  background-color: #ffe6e6 !important;
  border-color: #dc3545 !important;
  transition: background-color 0.3s, border-color 0.3s;
}

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* 练习历史 */
.history-section {
  margin-top: 20px;
  text-align: left;
}

.history-title {
  font-size: 1.1rem;
  color: var(--primary-color);
  margin-bottom: 10px;
  padding-left: 5px;
  border-left: 3px solid var(--accent-color);
}

.history-list {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.history-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-soft);
}

.history-date {
  font-size: 0.8rem;
  color: var(--secondary-color);
  margin-bottom: 5px;
}

.history-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score-num {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--primary-color);
}

.score-total {
  font-size: 0.9rem;
  color: #999;
}

.history-detail {
  font-size: 0.85rem;
  color: #666;
}

/* 练习结果页面优化 */
.result-summary-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  background: var(--card-bg);
  padding: 30px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  margin-bottom: 30px;
  border: 1px solid var(--border-color);
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.summary-left {
  flex-shrink: 0;
  position: relative;
  width: 140px;
  height: 140px;
}

.score-circle-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-circle-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg); /* 12点钟开始 */
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 8;
}

.circle-progress {
  fill: none;
  stroke: var(--primary-color);
  stroke-width: 8;
  stroke-linecap: round;
  /* 移除 transition 默认值，在 JS 中控制 */
}
/* ... */
.mini-card-overlay {
  display: none; /* 彻底移除悬停浮层样式 */
}

.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s;
}

.detail-panel {
  background: var(--card-bg);
  padding: 30px;
  border-radius: var(--radius-lg);
  max-width: 90%;
  width: 400px;
  position: relative;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  animation: slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-close-detail {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  z-index: 10;
}

@keyframes slideUpModal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.score-circle-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-color);
  line-height: 1;
}

.score-label {
  font-size: 0.9rem;
  color: var(--secondary-color);
  margin-top: 5px;
}

.summary-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.stat-row {
  display: flex;
  gap: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--secondary-color);
  margin-bottom: 4px;
}

.stat-val {
  font-size: 1.8rem;
  font-weight: 700;
}

.stat-item.correct .stat-val { color: #27ae60; }
.stat-item.wrong .stat-val { color: var(--accent-color); }

.list-title {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin-bottom: 15px;
  text-align: left;
  border-left: 4px solid var(--primary-color);
  padding-left: 10px;
}

.mini-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 15px;
}

.mini-card {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-card.correct-card {
  border-color: #e0e0e0;
  opacity: 0.8;
}

.mini-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  border-color: var(--primary-color);
  opacity: 1;
  z-index: 10;
}

.mini-card-char {
  font-size: 2.5rem;
  font-family: 'Noto Serif JP', serif;
  color: var(--primary-color);
}

.mini-card-overlay {
  display: block; /* 始终渲染，通过 opacity 和 visibility 控制 */
  visibility: hidden;
  opacity: 0;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  width: 320px;
  padding-top: 10px;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); /* 平滑过渡 */
  pointer-events: none; /* 隐藏时不响应鼠标 */
}

.mini-card:hover .mini-card-overlay {
  visibility: visible;
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

/* 结果页面按钮组 */
.result-actions {
  display: flex;
  flex-direction: row; /* 改为水平排列 */
  gap: 10px;
  width: 100%;
  align-items: center;
  justify-content: center; /* 居中 */
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--secondary-color);
}

.btn-secondary:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--card-bg);
}

/* 移动端适配 */
@media (max-width: 600px) {
  .result-summary-card {
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }

  .mini-card-overlay {
    width: 280px;
  }
}

.flip-container.flipped .flipper {
  transform: rotateY(180deg);
}

.flip-back {
  transform: rotateY(180deg);
}

#feedback-correct {
  color: #27ae60;
}

#feedback-wrong {
  color: var(--accent-color);
}

/* .next-exercise-btn definition moved to .bottom-actions group */

.next-exercise-btn:hover {
  background-color: #34495e;
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

#exercise-reveal .glyph-jp,
#exercise-reveal .glyph-cn {
  font-size: 6rem;
  font-family: 'Noto Serif JP', 'Noto Serif SC', serif;
}
</style>

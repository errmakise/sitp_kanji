<template>
  <!-- 自主练习视图：在本地随机生成练习题，包含形状判断和写字题 -->
  <section id="exercise-view" class="view">
    <h2 class="section-title">
      自主练习
    </h2>
    <!-- 顶部状态：题号 / 总题数 / 当前得分 -->
    <div
      v-if="!showResult"
      id="exercise-status"
      class="exercise-status"
    >
      {{ exerciseStatusText }}
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
      :class="{ flipped: showReveal }"
    >
      <div class="flipper">
        <div class="flip-side flip-front">
          <div id="exercise-glyph">
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
              <div
              class="audio-btn"
              title="播放日文音读"
              @click="speak(currentExercise.reading, 'ja-JP')"
            >
              🔊
            </div>
          </div>
          <div v-else>
            ?
          </div>
        </div>
        </div>
        <div class="flip-side flip-back">
          <div id="exercise-reveal">
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
    <!-- 最近一次作答的文字反馈 -->
    <div
      v-if="!showResult"
      id="exercise-feedback"
      class="exercise-feedback"
    >
      <span v-if="lastAnswerCorrect === true" id="feedback-correct">{{ exerciseFeedback }}</span>
      <span v-else-if="lastAnswerCorrect === false" id="feedback-wrong">{{ exerciseFeedback }}</span>
    </div>
    <!-- 当前题目的中日对比揭示卡片 -->
    <div
      v-if="!showResult"
      id="exercise-reveal-card"
      class="exercise-reveal-card"
    >
      <KanjiComparisonCard
        v-if="currentExercise && lastAnswerCorrect !== null"
        :entry="currentExercise.entry"
        :collected="isCollectedId(currentExercise.entry.id)"
        @toggle-collection="toggleCollection"
      />
    </div>
    <!-- 跳到下一题（或在最后一题时触发结果展示） -->
    <button
      v-if="!showResult && canGoNext"
      id="next-exercise-btn"
      type="button"
      class="next-exercise-btn"
      @click="nextExercise"
    >
      下一个
    </button>
    <!-- 最终结果：总分 + 答对/答错列表 -->
    <div v-if="showResult && exerciseResult" id="exercise-result" class="exercise-result">
      <div class="score">
        {{ exerciseResult.score }} / {{ exerciseResult.totalScore }}
      </div>
      <div class="lists">
        <div class="list">
          <h3 class="list-title correct-title">
            答对
          </h3>
          <div
            v-if="exerciseResult.right.length === 0"
            class="meta"
          >
            （无）
          </div>
          <div
            v-for="item in exerciseResult.right"
            :key="`r-${item.id}`"
            class="list-item"
          >
            <KanjiComparisonCard
              :entry="item.entry"
              :collected="isCollectedId(item.entry.id)"
              @toggle-collection="toggleCollection"
            />
          </div>
        </div>
        <div class="list">
          <h3 class="list-title wrong-title">
            答错
          </h3>
          <div
            v-if="exerciseResult.wrong.length === 0"
            class="meta"
          >
            （无）
          </div>
          <div
            v-for="item in exerciseResult.wrong"
            :key="`w-${item.id}`"
            class="list-item"
          >
            <KanjiComparisonCard
              :entry="item.entry"
              :collected="isCollectedId(item.entry.id)"
              @toggle-collection="toggleCollection"
            />
          </div>
        </div>
      </div>
      <div class="exercise-restart">
        <button
          id="exercise-restart"
          type="button"
          class="btn-round"
          @click="restartExercise"
        >
          再来一组
        </button>
      </div>
    </div>
    <div v-if="loadError" class="error">
      {{ loadError }}
    </div>
  </section>
</template>


<script setup>
// 依赖：Vue 响应式、服务层练习与收藏 API、朗读能力、复用的展示与收藏弹窗组件
import { computed, onMounted, ref } from 'vue'
import {
  answerCurrentExercise,
  getExerciseResultData,
  getExerciseSession,
  loadCharDB,
  createNextExercise,
  resetExercise,
  isCollectedId,
} from '../services/kanjiService'
import { useSpeechSynthesis } from '../composables/useSpeechSynthesis'
import KanjiComparisonCard from './KanjiComparisonCard.vue'
import CollectionPopup from './CollectionPopup.vue'

// 页面加载与状态
const loading = ref(true)
const loadError = ref('')
// 当前练习会话（题号、总题数、得分、日志）
const exerciseSession = ref(null)
// 当前题目对象：包含题型、题面字、答案字、语言等
const currentExercise = ref(null)
// 最近一次作答反馈文本与标志
const exerciseFeedback = ref('')
const showReveal = ref(false)
const showResult = ref(false)
const lastAnswerCorrect = ref(null)
// 当前题目是否可以进入下一题（控制“下一个”按钮显示）
const canGoNext = ref(false)
// 总结结果：包含 right/wrong 列表与总分
const exerciseResult = ref(null)
// 收藏弹窗开关与目标条目 id
const showCollectionPopup = ref(false)
const popupTargetId = ref('')

// 朗读：用于写字题中的“播放日文音读”
const { speak } = useSpeechSynthesis()

// 顶部状态文案：加载中/未开始/题号与得分
const exerciseStatusText = computed(() => {
  if (loading.value) return '准备中...'
  if (!exerciseSession.value) return '请开始练习'
  return `第 ${exerciseSession.value.index}/${exerciseSession.value.total} 题｜当前得分 ${exerciseSession.value.score}`
})

// 初始化：加载字符库 + 开始第一题
async function init() {
  try {
    await loadCharDB()
    startExercise()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// 开始下一题（或第一题）：生成题目与重置反馈
function startExercise() {
  const { session, exercise } = createNextExercise()
  exerciseSession.value = session
  currentExercise.value = exercise
  exerciseFeedback.value = ''
  showReveal.value = false
  showResult.value = false
  lastAnswerCorrect.value = null
  exerciseResult.value = null
   canGoNext.value = false
}

// 形状题作答：“是/否”，立即判分并可能在最后一题后生成结果
function handleShapeAnswer(userAnswer) {
  if (!currentExercise.value || currentExercise.value.type !== 'shape') return
  const correct = userAnswer === currentExercise.value.answer
  const { session, finished } = answerCurrentExercise(correct)
  exerciseSession.value = session
  lastAnswerCorrect.value = correct
  exerciseFeedback.value = correct ? '正确！(+10)' : '错误！(+0)'
  showReveal.value = true
  canGoNext.value = !finished
  if (finished) {
    showResult.value = true
    exerciseResult.value = getExerciseResultData()
  }
}

// 写字题：先“写完了”翻面揭示答案
function revealWritingAnswer() {
  if (!currentExercise.value || currentExercise.value.type !== 'writing') return
  showReveal.value = true
}

// 写字题自评：“写对了/写错了”，在最后一题后生成结果
function handleWritingScore(correct) {
  if (!currentExercise.value || currentExercise.value.type !== 'writing') return
  const { session, finished } = answerCurrentExercise(correct)
  exerciseSession.value = session
  lastAnswerCorrect.value = correct
  exerciseFeedback.value = correct
    ? '自评：写对了！(+10)'
    : '自评：写错了。(+0)'
  canGoNext.value = !finished
  if (finished) {
    showResult.value = true
    exerciseResult.value = getExerciseResultData()
  }
}

// 切换下一题；如果已经到末尾，则显示结果
function nextExercise() {
  if (!exerciseSession.value) return
  const session = getExerciseSession()
  if (session && session.index >= session.total) {
    showResult.value = true
    exerciseResult.value = getExerciseResultData()
    return
  }
  startExercise()
}

// 重新开始一组练习
function restartExercise() {
  resetExercise()
  startExercise()
}

// 点击星标：弹出收藏夹选择弹窗
function toggleCollection(id) {
  if (!id) return
  popupTargetId.value = id
  showCollectionPopup.value = true
}

// 弹窗完成操作：浅拷贝结果促使列表刷新
function handleCollectionUpdated() {
  if (exerciseResult.value) {
    exerciseResult.value = { ...exerciseResult.value }
  }
}

// 页面挂载后执行初始化
onMounted(() => {
  init()
})

</script>

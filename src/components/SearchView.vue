<script setup>
// 依赖：Vue 响应式能力与汉字服务函数
import { computed, onMounted, ref } from 'vue'
import { loadCharDB, searchKanji, analyzeText } from '@/api/kanji'
import { useUserStore } from '@/stores/userStore'
import KanjiComparisonCard from './KanjiComparisonCard.vue'
import CollectionPopup from './CollectionPopup.vue'

const userStore = useUserStore()

// 加载状态与错误信息
const loading = ref(true)
const loadError = ref('')
// 搜索关键字与结果列表
const searchQuery = ref('')
const results = ref([])
// 文本分析模式标志
const isAnalysisMode = ref(false)

// 收藏弹窗控制与当前点击的条目 id
const showCollectionPopup = ref(false)
const popupTargetId = ref('')

// 搜索历史
const searchHistory = ref([])
const showHistory = ref(false)

// 是否已经输入了有效搜索关键字
const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)

// 初始化：加载字典数据
function init() {
  try {
    loadCharDB()
    loadSearchHistory()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// 加载搜索历史
function loadSearchHistory() {
  const history = localStorage.getItem('search_history')
  if (history) {
    try {
      searchHistory.value = JSON.parse(history)
    } catch (e) {
      console.error('Failed to parse search history', e)
    }
  }
}

// 保存搜索历史
function saveSearchHistory(query) {
  if (!query || query.trim().length === 0) return

  // 移除已存在的相同记录，确保最新的在前面
  const newHistory = searchHistory.value.filter(item => item !== query)
  newHistory.unshift(query)

  // 限制历史记录数量（例如最近 10 条）
  if (newHistory.length > 10) {
    newHistory.pop()
  }

  searchHistory.value = newHistory
  localStorage.setItem('search_history', JSON.stringify(newHistory))
}

// 清除搜索历史
function clearSearchHistory() {
  searchHistory.value = []
  localStorage.removeItem('search_history')
}

// 使用历史记录进行搜索
function useHistory(query) {
  searchQuery.value = query
  handleSearch()
}

// 详情弹窗
const selectedEntry = ref(null)

function showDetail(entry) {
  selectedEntry.value = entry
}

function closeDetail() {
  selectedEntry.value = null
}

// 输入框变更时，根据关键字检索中日字形
function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    results.value = []
    isAnalysisMode.value = false
    showHistory.value = true
    return
  }

  showHistory.value = false

  // 长度大于1时，尝试文本提取模式
  // 使用 Array.from 正确处理 Unicode 代理对（如某些生僻汉字）
  const charLength = Array.from(q).length

  if (charLength > 1) {
    // 优先尝试文本分析
    const analysisResults = analyzeText(q)
    if (analysisResults.length > 0) {
      results.value = analysisResults
      isAnalysisMode.value = true
      saveSearchHistory(q)
      return
    }
  }

  // 单字或者文本分析无结果时，回退到普通搜索
  results.value = searchKanji(q)
  isAnalysisMode.value = false

  if (results.value.length > 0) {
    saveSearchHistory(q)
  }
}

// 点击星标时，打开收藏弹窗选择收藏夹
function toggleCollection(id) {
  if (!id) return
  popupTargetId.value = id
  showCollectionPopup.value = true
}

// 弹窗回调：目前搜索结果本身不依赖收藏状态，无需额外刷新
function handleCollectionUpdated() {
}

// 输入框聚焦时显示历史记录
function onFocus() {
  if (!hasSearchQuery.value) {
    showHistory.value = true
  }
}

// 失去焦点时隐藏历史记录（稍微延迟，以便点击事件能先触发）
function onBlur() {
  setTimeout(() => {
    showHistory.value = false
  }, 200)
}

// 组件挂载时启动初始化
onMounted(() => {
  init()
})
</script>

<template>
  <!-- 搜索视图：输入汉字并展示中日对比卡片 -->
  <section id="search-view" class="view active">
    <!-- 搜索输入区域 -->
    <div class="search-wrapper">
      <div class="search-container">
        <input
          id="search-input"
          v-model="searchQuery"
          type="search"
          placeholder="输入简体字或日本汉字进行检索..."
          autocomplete="off"
          @input="handleSearch"
          @focus="onFocus"
          @blur="onBlur"
        >

        <!-- 搜索历史面板 -->
        <div v-if="showHistory && searchHistory.length > 0 && !hasSearchQuery" class="search-history">
          <div class="history-header">
            <span>搜索历史</span>
            <button @mousedown.prevent="clearSearchHistory" class="btn-clear-history">清除</button>
          </div>
          <div class="history-list">
            <span
              v-for="item in searchHistory"
              :key="item"
              class="history-item"
              @mousedown.prevent="useHistory(item)"
            >
              {{ item }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载提示 / 结果区域 -->
    <div v-if="loading" id="loading">
      正在加载汉字数据库...
    </div>
    <div v-else id="search-results">
      <!-- 加载失败时提示 -->
      <div v-if="loadError" class="placeholder error-msg">
        <p>{{ loadError }}</p>
      </div>
      <!-- 未输入关键字时的占位提示 -->
      <div v-else-if="!hasSearchQuery" class="placeholder empty-tip">
        <p>请输入汉字开始检索。</p>
      </div>
      <!-- 无结果提示 -->
      <div v-else-if="results.length === 0" class="placeholder">
        <p>未找到结果。</p>
      </div>
      <!-- 检索结果：使用复用的对比卡片组件 -->
      <div v-else class="results-container">
        <!-- 只有1个结果时，直接展示详情 -->
        <div v-if="results.length === 1">
          <KanjiComparisonCard
            :entry="results[0]"
            :collected="userStore.isCollected(results[0].id)"
            @toggle-collection="toggleCollection"
          />
        </div>

        <!-- 多个结果时，显示网格概览 -->
        <div v-else class="results-grid-view">
           <div v-if="isAnalysisMode" class="analysis-info">
              已识别 {{ results.length }} 个汉字
           </div>
           <div v-else class="analysis-info">
              找到 {{ results.length }} 个结果
           </div>

           <div class="mini-cards-grid">
             <div
               v-for="entry in results"
               :key="entry.id"
               class="mini-result-card"
               @click="showDetail(entry)"
             >
               <div class="mini-char-jp">{{ entry.jp_char?.split('（')[0] }}</div>
               <div class="mini-char-cn">{{ entry.cn_char }}</div>
             </div>
           </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="selectedEntry" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-panel">
        <button class="btn-close-detail" @click="closeDetail">×</button>
        <KanjiComparisonCard
          :entry="selectedEntry"
          :collected="userStore.isCollected(selectedEntry.id)"
          @toggle-collection="toggleCollection"
        />
      </div>
    </div>
    <!-- 收藏弹窗：选择要加入的收藏夹 -->
    <!-- 移动到 Teleport 中，确保层级高于 detail-overlay -->
    <Teleport to="body">
      <CollectionPopup
        v-model="showCollectionPopup"
        :target-id="popupTargetId"
        @updated="handleCollectionUpdated"
      />
    </Teleport>
  </section>
</template>

<style scoped>
.analysis-info {
  background: #e8f4fd;
  color: #003366;
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 600;
  border: 1px solid #b6d4fe;
}

/* 搜索框与历史容器 */
.search-wrapper {
  max-width: 600px;
  margin: 0 auto 30px;
  position: relative;
}

.search-container {
  position: relative;
  width: 100%;
}

#search-input {
  width: 100%;
  padding: 12px 20px;
  font-size: 1.1rem;
  border: 1px solid var(--border-color);
  border-radius: 25px;
  box-shadow: var(--shadow-soft);
  outline: none;
  transition: all 0.2s;
}

#search-input:focus {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-hover);
}

.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-hover);
  padding: 12px;
  margin-top: 5px;
  z-index: 100;
  text-align: left;
  box-sizing: border-box;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: var(--secondary-color);
  padding: 0 5px;
}

.btn-clear-history {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px 8px;
}

.btn-clear-history:hover {
  color: var(--accent-color);
}

/* 占位与错误提示 */
.placeholder {
  text-align: center;
  margin-top: 50px;
  color: #999;
}

.empty-tip {
  margin-top: 100px; /* 下移提示语 */
  font-size: 1.1rem;
}

.error-msg {
  color: var(--accent-color);
}

/* 搜索结果布局 */
.results-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.results-grid-view {
  width: 100%;
}

.mini-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
  width: 100%;
}

.mini-result-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-soft);
  height: 100px;
}

.mini-result-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  border-color: var(--primary-color);
  background: #fcfcfc;
}

.mini-char-jp {
  font-size: 2rem;
  font-family: 'Noto Serif JP', serif;
  color: var(--primary-color);
  line-height: 1.1;
  margin-bottom: 4px;
}

.mini-char-cn {
  font-size: 1rem;
  color: var(--secondary-color);
  font-family: 'Noto Serif SC', serif;
}

/* 详情弹窗样式 (复用自 ExerciseView) */
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
  padding: 60px 30px 30px; /* 增加顶部内边距，避免关闭按钮与内容重叠 */
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
  line-height: 1;
}

@keyframes slideUpModal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ... */

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-item {
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.history-item:hover {
  background: #e0e0e0;
}
</style>

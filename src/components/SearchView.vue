<script setup>
// 依赖：Vue 响应式能力与汉字服务函数
import { computed, onMounted, ref } from 'vue'
import {
  isCollectedId,
  loadCharDB,
  searchKanji,
} from '../services/kanjiService'
import KanjiComparisonCard from './KanjiComparisonCard.vue'
import CollectionPopup from './CollectionPopup.vue'

// 加载状态与错误信息
const loading = ref(true)
const loadError = ref('')
// 搜索关键字与结果列表
const searchQuery = ref('')
const results = ref([])
// 收藏弹窗控制与当前点击的条目 id
const showCollectionPopup = ref(false)
const popupTargetId = ref('')

// 是否已经输入了有效搜索关键字
const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)

// 初始化：加载字典数据
async function init() {
  try {
    await loadCharDB()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// 输入框变更时，根据关键字检索中日字形
function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    results.value = []
    return
  }
  results.value = searchKanji(q)
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

// 组件挂载时启动初始化
onMounted(() => {
  init()
})
</script>

<template>
  <!-- 搜索视图：输入汉字并展示中日对比卡片 -->
  <section id="search-view" class="view active">
    <!-- 搜索输入区域 -->
    <div class="search-container">
      <input
        id="search-input"
        v-model="searchQuery"
        type="search"
        placeholder="输入简体字或日本汉字进行检索..."
        @input="handleSearch"
      >
    </div>
    <!-- 加载提示 / 结果区域 -->
    <div v-if="loading" id="loading">
      正在加载汉字数据库...
    </div>
    <div v-else id="search-results">
      <!-- 加载失败时提示 -->
      <div v-if="loadError" class="placeholder">
        <p>{{ loadError }}</p>
      </div>
      <!-- 未输入关键字时的占位提示 -->
      <div v-else-if="!hasSearchQuery" class="placeholder">
        <p>请输入汉字开始检索。</p>
      </div>
      <!-- 无结果提示 -->
      <div v-else-if="results.length === 0" class="placeholder">
        <p>未找到结果。</p>
      </div>
      <!-- 检索结果：使用复用的对比卡片组件 -->
      <div v-else class="results-grid">
        <KanjiComparisonCard
          v-for="entry in results"
          :key="entry.id"
          :entry="entry"
          :collected="isCollectedId(entry.id)"
          @toggle-collection="toggleCollection"
        />
      </div>
    </div>
    <!-- 收藏弹窗：选择要加入的收藏夹 -->
    <CollectionPopup
      v-model="showCollectionPopup"
      :target-id="popupTargetId"
      @updated="handleCollectionUpdated"
    />
  </section>
</template>

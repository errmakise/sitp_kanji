<script setup>
// 依赖：Vue 响应式能力与收藏服务函数
import { onMounted, ref } from 'vue'
import {
  changeCurrentFolder,
  createFolder,
  initCollections,
  isCollectedId,
  renameFolder,
  deleteFolder as deleteFolderService,
  loadCharDB,
} from '../services/kanjiService'
import CollectionPopup from './CollectionPopup.vue'
import KanjiComparisonCard from './KanjiComparisonCard.vue'

// 收藏夹名称列表与当前选择的收藏夹
const folderNames = ref([])
const selectedFolder = ref('默认收藏')
// 当前收藏夹中的条目列表
const collectionEntries = ref([])
// 收藏弹窗控制与当前条目 id
const showCollectionPopup = ref(false)
const popupTargetId = ref('')
// 当前展开详情的条目 id 列表
const expandedIds = ref([])

// 根据服务层快照更新本地状态
function loadFolderState(state) {
  folderNames.value = state.folderNames
  selectedFolder.value = state.currentFolder
  collectionEntries.value = state.currentFolderEntries
  expandedIds.value = []
}

// 挂载时初始化收藏数据
onMounted(async () => {
  await loadCharDB()
  const state = initCollections()
  loadFolderState(state)
})

// 切换当前收藏夹
function onFolderChange(event) {
  const value = event.target.value
  const state = changeCurrentFolder(value)
  loadFolderState(state)
}

// 点击星标：弹出收藏弹窗编辑该条目所在收藏夹
function toggleCollection(id) {
  if (!id) return
  popupTargetId.value = id
  showCollectionPopup.value = true
}

// 弹窗完成：重新拉取当前收藏夹快照
function handleCollectionUpdated() {
  const state = changeCurrentFolder(selectedFolder.value)
  loadFolderState(state)
}

// 切换某个条目的详情展开/收起
function toggleDetail(id) {
  if (!id) return
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter((x) => x !== id)
  } else {
    expandedIds.value = [...expandedIds.value, id]
  }
}

// 当前条目是否已展开详情
function isExpanded(id) {
  return expandedIds.value.includes(id)
}

// 新建收藏夹（使用浏览器 prompt）
function promptAddFolder() {
  const name = window.prompt('新建收藏夹名称：')
  if (!name || !name.trim()) return
  const trimmed = name.trim()
  const state = createFolder(trimmed)
  loadFolderState(state)
}

// 重命名当前收藏夹
function promptRenameFolder() {
  const oldName = selectedFolder.value
  const name = window.prompt('重命名收藏夹：', oldName)
  if (!name || !name.trim() || name === oldName) return
  const trimmed = name.trim()
  const state = renameFolder(oldName, trimmed)
  loadFolderState(state)
}

// 删除当前收藏夹；条目会并入“默认收藏”
function promptDeleteFolder() {
  const name = selectedFolder.value
  if (name === '默认收藏') return
  const ok = window.confirm(`确定要删除收藏夹「${name}」吗？条目会并入「默认收藏」。`)
  if (!ok) return
  const state = deleteFolderService(name)
  loadFolderState(state)
}
</script>

<template>
  <!-- 我的收藏视图：按收藏夹查看、管理已收藏的字形 -->
  <section id="collection-view" class="view">
    <h2 class="section-title">
      我的收藏
    </h2>
    <!-- 收藏夹选择与增删改操作 -->
    <div class="folder-controls">
      <label for="folder-select">收藏夹：</label>
      <select
        id="folder-select"
        class="select-strong"
        :value="selectedFolder"
        @change="onFolderChange"
      >
        <option
          v-for="name in folderNames"
          :key="name"
          :value="name"
        >
          {{ name }}
        </option>
      </select>
      <button type="button" class="btn-strong" @click="promptAddFolder">
        新建收藏夹
      </button>
      <button type="button" class="btn-strong" @click="promptRenameFolder">
        重命名
      </button>
      <button type="button" class="btn-strong" @click="promptDeleteFolder">
        删除
      </button>
    </div>
    <!-- 收藏条目列表 -->
    <div id="collection-results">
      <!-- 当前收藏夹为空时的提示 -->
      <div
        v-if="collectionEntries.length === 0"
        class="placeholder"
      >
        <p>你还没有收藏任何汉字。</p>
      </div>
      <!-- 有收藏条目时，使用表头 + 条形条目 + 可展开详情 -->
      <div v-else>
        <div class="collection-header">
          <div class="glyphs">
            <div class="glyph">
              日文汉字
            </div>
            <div class="glyph">
              中文汉字
            </div>
          </div>
          <div class="right-controls">
            操作
          </div>
        </div>
        <div
          v-for="entry in collectionEntries"
          :key="entry.id"
        >
          <div class="collection-item">
            <div class="glyphs">
              <div class="glyph glyph-jp">
                <span lang="ja">
                  {{ (entry.jp_char || '').split('（')[0] || '?' }}
                </span>
              </div>
              <div class="glyph glyph-cn">
                <span lang="zh-Hans">
                  {{ entry.cn_char || '?' }}
                </span>
              </div>
            </div>
            <div class="right-controls">
              <span
                class="collection-btn"
                :class="{ collected: isCollectedId(entry.id) }"
                title="选择收藏夹"
                @click="toggleCollection(entry.id)"
              >
                {{ isCollectedId(entry.id) ? '★' : '☆' }}
              </span>
              <button
                type="button"
                class="btn-round"
                @click="toggleDetail(entry.id)"
              >
                {{ isExpanded(entry.id) ? '▲ 收起' : '▼ 展开' }}
              </button>
            </div>
          </div>
          <KanjiComparisonCard
            v-if="isExpanded(entry.id)"
            class="collection-detail-card"
            :entry="entry"
            :collected="isCollectedId(entry.id)"
            :show-details="true"
            :show-collection-button="false"
            :show-diff-badge="entry.is_diff === '否'"
            @toggle-collection="toggleCollection"
          />
        </div>
      </div>
    </div>
    <!-- 收藏弹窗：编辑某个条目所在的收藏夹集合 -->
    <CollectionPopup
      v-model="showCollectionPopup"
      :target-id="popupTargetId"
      @updated="handleCollectionUpdated"
    />
  </section>
</template>

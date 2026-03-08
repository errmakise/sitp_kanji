<script setup>
// 依赖：Vue 响应式能力与收藏服务函数
import { onMounted, ref, watch } from 'vue'
import { loadCharDB, getCharById } from '@/api/kanji'
import { useUserStore } from '@/stores/userStore'
import CollectionPopup from './CollectionPopup.vue'
import KanjiComparisonCard from './KanjiComparisonCard.vue'
import BaseModal from './BaseModal.vue'

const userStore = useUserStore()

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

// 模态框状态
const isModalOpen = ref(false)
const modalTitle = ref('')
const modalMessage = ref('')
const isModalPrompt = ref(false)
const modalInputValue = ref('')
const modalAction = ref(null)
// 新增：删除收藏夹时是否合并的选项
const isDeleteFolderMode = ref(false)
const mergeToDefault = ref(true)

// 刷新数据
function refresh() {
  folderNames.value = userStore.getFolderNames()
  if (!userStore.collectionsByFolder[selectedFolder.value]) {
    selectedFolder.value = '默认收藏'
  }
  const ids = userStore.collectionsByFolder[selectedFolder.value] || []
  collectionEntries.value = ids.map(id => getCharById(id)).filter(Boolean)
}

// 挂载时初始化收藏数据
onMounted(() => {
  // DB already loaded in App init ideally, but ensure it
  loadCharDB()
  refresh()
})

// 监听 store 变化自动刷新
watch(() => userStore.collectionsByFolder, () => {
  refresh()
}, { deep: true })

// 切换当前收藏夹
function onFolderChange(event) {
  selectedFolder.value = event.target.value
  refresh()
}

// 点击星标：弹出收藏弹窗编辑该条目所在收藏夹
function toggleCollection(id) {
  if (!id) return
  popupTargetId.value = id
  showCollectionPopup.value = true
}

// 弹窗回调
function handleCollectionUpdated() {
  refresh()
}

// 切换某个条目的详情展开/收起
function toggleDetail(id) {
  if (!id) return
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter((x) => x !== id)
  } else {
    expandedIds.value = [...expandedIds.value, id]
    // 展开时自动滚动
    setTimeout(() => {
      const el = document.getElementById(`detail-${id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }
}

// 当前条目是否已展开详情
function isExpanded(id) {
  return expandedIds.value.includes(id)
}

// 新建收藏夹（使用自定义 Modal）
function promptAddFolder() {
  modalTitle.value = '新建收藏夹'
  modalMessage.value = '请输入新收藏夹的名称：'
  isModalPrompt.value = true
  modalInputValue.value = ''
  modalAction.value = (name) => {
    if (!name || !name.trim()) return
    const trimmed = name.trim()
    userStore.createFolder(trimmed)
    selectedFolder.value = trimmed
    refresh()
  }
  isModalOpen.value = true
}

// 重命名当前收藏夹
function promptRenameFolder() {
  const oldName = selectedFolder.value
  modalTitle.value = '重命名收藏夹'
  modalMessage.value = `请输入"${oldName}"的新名称：`
  isModalPrompt.value = true
  modalInputValue.value = oldName
  modalAction.value = (name) => {
    if (!name || !name.trim() || name === oldName) return
    const trimmed = name.trim()
    userStore.renameFolder(oldName, trimmed)
    selectedFolder.value = trimmed
    refresh()
  }
  isModalOpen.value = true
}

// 删除当前收藏夹；条目会并入“默认收藏”
function promptDeleteFolder() {
  const name = selectedFolder.value
  if (name === '默认收藏') return

  isDeleteFolderMode.value = true
  mergeToDefault.value = true // 默认选中

  modalTitle.value = '删除收藏夹'
  modalMessage.value = `确定要删除收藏夹「${name}」吗？`
  isModalPrompt.value = false

  modalAction.value = () => {
    // 传递第二个参数：是否合并到默认收藏
    userStore.deleteFolder(name, mergeToDefault.value)
    selectedFolder.value = '默认收藏' // 强制切回默认
    refresh()
    isDeleteFolderMode.value = false
  }
  isModalOpen.value = true
}

function handleModalConfirm(value) {
  if (modalAction.value) {
    modalAction.value(value)
  }
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
        新建
      </button>
      <button type="button" class="btn-strong" @click="promptRenameFolder">
        重命名
      </button>
      <button type="button" class="btn-strong" @click="promptDeleteFolder">
        删除
      </button>
    </div>

    <!-- 数据管理区域 - 已迁移至全局侧边栏，此处移除 -->

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
        <!-- Grid Header -->
        <div class="collection-grid-header">
           <div class="header-cell">日文汉字</div>
           <div class="header-cell">中文汉字</div>
           <div class="header-cell">操作</div>
        </div>

        <div
          v-for="entry in collectionEntries"
          :key="entry.id"
          class="collection-group"
        >
          <div class="collection-item-row" :class="{ 'expanded': isExpanded(entry.id) }">
             <div class="cell-jp">{{ (entry.jp_char || '').split('（')[0] || '?' }}</div>
             <div class="cell-cn">{{ entry.cn_char || '?' }}</div>
             <div class="cell-actions">
               <span
                  class="collection-btn"
                  :class="{ collected: userStore.isCollected(entry.id) }"
                  title="选择收藏夹"
                  @click="toggleCollection(entry.id)"
                >
                  {{ userStore.isCollected(entry.id) ? '★' : '☆' }}
                </span>
                <button class="btn-expand" @click="toggleDetail(entry.id)">
                  {{ isExpanded(entry.id) ? '▲' : '▼' }}
                </button>
             </div>
          </div>

          <KanjiComparisonCard
            v-if="isExpanded(entry.id)"
            class="collection-detail-card"
            :id="`detail-${entry.id}`"
            :entry="entry"
            :collected="userStore.isCollected(entry.id)"
            :show-details="true"
            :show-collection-button="false"
            :show-diff-badge="entry.is_diff === '否'"
            @toggle-collection="toggleCollection"
          />
        </div>
      </div>
    </div>
    <!-- 收藏弹窗：编辑某个条目所在的收藏夹集合 -->
    <Teleport to="body">
      <CollectionPopup
        v-model="showCollectionPopup"
        :target-id="popupTargetId"
        @updated="handleCollectionUpdated"
      />
    </Teleport>

    <!-- 通用模态框 -->
    <Teleport to="body">
      <BaseModal
        v-model:isOpen="isModalOpen"
        v-model:inputValue="modalInputValue"
        :title="modalTitle"
        :message="modalMessage"
        :is-prompt="isModalPrompt"
        :is-delete="isDeleteFolderMode"
      :confirm-text="isDeleteFolderMode ? '删除' : '确定'"
      @confirm="handleModalConfirm"
    >
      <!-- 自定义插槽：删除时的复选框 -->
      <div v-if="isDeleteFolderMode" class="delete-options">
        <label class="checkbox-label">
          <input type="checkbox" v-model="mergeToDefault">
          将内容合并到“默认收藏”
        </label>
        <p class="hint-text" v-if="!mergeToDefault">
          注意：如果不合并，该收藏夹内的条目将直接被清空！
        </p>
      </div>
    </BaseModal>
    </Teleport>
  </section>
</template>

<style scoped>
/* 收藏列表 Grid 布局 */
.collection-grid-header {
  display: grid;
  grid-template-columns: 100px 100px 1fr; /* 前两列固定宽度，操作栏占据剩余空间 */
  align-items: center;
  padding: 10px 15px;
  background: var(--card-bg);
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
  color: var(--secondary-color);
  margin-bottom: 10px;
}

.collection-item-row {
  display: grid;
  grid-template-columns: 100px 100px 1fr; /* 保持与表头一致 */
  align-items: center;
  padding: 15px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
  transition: all 0.2s;
}

.collection-item-row:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  border-color: var(--primary-color);
}

.header-cell {
  text-align: left; /* 靠左 */
}
/* 最后的操作栏表头也可以靠左或居中，视需求而定，这里默认继承 left 或手动设为 center */
.header-cell:last-child {
    text-align: right;
    padding-right: 20px;
}

.cell-jp {
  font-family: 'Noto Serif JP', serif;
  font-size: 1.8rem;
  color: var(--primary-color);
  text-align: left; /* 靠左 */
  padding-left: 10px;
}

.cell-cn {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.8rem;
  color: var(--secondary-color);
  text-align: left; /* 靠左 */
  padding-left: 10px;
}

.cell-actions {
  display: flex;
  justify-content: flex-end; /* 靠右 */
  gap: 15px;
  align-items: center;
  padding-right: 10px;
}

/* 收藏按钮样式 - 复用自 Search/Exercise 但微调 */
.collection-btn {
  font-size: 1.5rem;
  cursor: pointer;
  color: #ccc;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}

.collection-btn:hover,
.collection-btn.collected {
  color: #f0c14b;
}

.btn-expand {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 15px;
  padding: 4px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--secondary-color);
  transition: all 0.2s;
}

.btn-expand:hover {
  background: var(--card-bg);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.collection-detail-card {
  margin-top: -10px; /* 连接上部 */
  margin-bottom: 20px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: none;
  background: #fafafa; /* 稍微区分背景 */
}

/* 删除选项样式 */
.delete-options {
  margin-top: 15px;
  background: #fff4e5;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ffcc80;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  cursor: pointer;
  color: #e65100;
}

.hint-text {
  margin-top: 5px;
  font-size: 0.85rem;
  color: #d84315;
}
</style>

<script setup>
// 通用收藏弹窗：用于选择某个字属于哪些收藏夹
import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// 输入属性：
// - modelValue：是否展示弹窗（用于 v-model）
// - targetId：当前正在编辑收藏夹关系的条目 id
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  targetId: {
    type: String,
    default: '',
  },
})

// 对外事件：
// - update:modelValue：驱动 v-model，控制弹窗显示/隐藏
// - updated：收藏关系发生变化时通知父组件刷新视图
const emit = defineEmits(['update:modelValue', 'updated'])

// 计算属性：将 modelValue 封装为可读写的 visible
const visible = computed({
  get() {
    return props.modelValue
  },
  set(v) {
    emit('update:modelValue', v)
  },
})

// 当前所有收藏夹名称、当前条目勾选的收藏夹集合、新建收藏夹名称
const folderNames = ref([])
const selectedFolders = ref([])
const newFolderName = ref('')

// 当弹窗打开时，从服务层加载当前条目的收藏夹信息
function loadState() {
  if (!props.targetId) return
  folderNames.value = userStore.getFolderNames()
  const current = userStore.getFoldersOfId(props.targetId)
  if (current.length) {
    selectedFolders.value = [...current]
  } else {
    selectedFolders.value = ['默认收藏']
  }
}

// 监听弹窗开关：每次打开时刷新状态
watch(
  () => props.modelValue,
  (v) => {
    if (v) loadState()
  },
)

// 监听 targetId：在同一次打开中切换条目时刷新状态
watch(
  () => props.targetId,
  () => {
    if (visible.value) loadState()
  },
)

// 勾选/取消勾选某个收藏夹
function toggleFolder(name) {
  const index = selectedFolders.value.indexOf(name)
  if (index > -1) {
    selectedFolders.value.splice(index, 1)
  } else {
    selectedFolders.value.push(name)
  }
  if (!selectedFolders.value.length) {
    selectedFolders.value = ['默认收藏']
  }
}

// 在弹窗中新增收藏夹，并自动勾选
function handleCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  userStore.createFolder(name)
  folderNames.value = userStore.getFolderNames()
  if (!selectedFolders.value.includes(name)) {
    selectedFolders.value.push(name)
  }
  newFolderName.value = ''
}

// 确认“加入”：将当前条目的收藏夹集合设置为选中的列表
function handleConfirm() {
  if (!props.targetId) {
    visible.value = false
    return
  }
  userStore.setFoldersForId(props.targetId, selectedFolders.value)
  emit('updated')
  visible.value = false
}

// “取消收藏”：从所有收藏夹中移除该条目
function handleClear() {
  if (!props.targetId) {
    visible.value = false
    return
  }
  userStore.removeIdFromAllFolders(props.targetId)
  selectedFolders.value = []
  emit('updated')
  visible.value = false
}

// 关闭弹窗：不修改收藏关系
function handleClose() {
  visible.value = false
}
</script>

<template>
  <!-- 收藏弹窗：在页面上方居中的模态框 -->
  <div
    v-if="props.modelValue"
    class="modal-overlay"
    @click.self="handleClose"
  >
    <div class="modal-content">
      <h3 class="modal-title">选择收藏夹</h3>
      <div class="modal-body">
        <!-- 收藏夹多选列表 -->
        <div class="folder-list">
          <label
            v-for="name in folderNames"
            :key="name"
            class="folder-item"
          >
            <input
              type="checkbox"
              :value="name"
              :checked="selectedFolders.includes(name)"
              @change="toggleFolder(name)"
            >
            {{ name }}
          </label>
        </div>
        <!-- 新建收藏夹输入与按钮 -->
        <div class="folder-new">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="新建收藏夹名称"
          >
          <button
            type="button"
            class="btn-round"
            @click="handleCreateFolder"
          >
            新建
          </button>
        </div>
      </div>
      <!-- 底部操作按钮：取消收藏 / 关闭 / 加入 -->
      <div class="modal-footer">
        <button
          type="button"
          class="btn-round btn-danger"
          @click="handleClear"
        >
          取消收藏
        </button>
        <button
          type="button"
          class="btn-round"
          @click="handleClose"
        >
          关闭
        </button>
        <button
          type="button"
          class="btn-round btn-join"
          @click="handleConfirm"
        >
          加入
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  position: relative; /* 确保内容在遮罩之上 */
}

/* 弹窗内容样式 */
.modal-title {
  margin: 0 0 20px 0;
  text-align: center;
  color: var(--primary-color, #333);
  font-size: 1.3rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.modal-body {
  margin-bottom: 25px;
}

.folder-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.folder-item:hover {
  background: #f9f9f9;
}

.folder-item input {
  transform: scale(1.2);
}

.folder-new {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #eee;
}

.folder-new input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.btn-round {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-round:hover {
  border-color: #999;
  background: #f5f5f5;
}

.btn-danger {
  color: #c0392b;
  border-color: #e74c3c;
  margin-right: auto; /* 靠左 */
}

.btn-danger:hover {
  background: #fdf2f2;
}

.btn-join {
  background: var(--primary-color, #333);
  color: #fff;
  border-color: var(--primary-color, #333);
}

.btn-join:hover {
  opacity: 0.9;
  background: var(--primary-color, #333);
  color: #fff;
}
</style>

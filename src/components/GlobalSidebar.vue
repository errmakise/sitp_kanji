<template>
  <div class="sidebar-container">
    <div class="sidebar-buttons">
      <!-- 导出按钮 -->
      <div class="sidebar-item" @click="handleExport">
        <div class="sidebar-icon">
          <!-- 传统纹样风格的导出图标：云纹/向上的箭头 -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12M12 3l-4 4M12 3l4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="sidebar-label">导出数据</div>
      </div>
      
      <!-- 导入按钮 -->
      <div class="sidebar-item" @click="triggerImport">
        <div class="sidebar-icon">
           <!-- 传统纹样风格的导入图标：向下的箭头 -->
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M12 15V3M12 15l-4-4M12 15l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
        </div>
        <div class="sidebar-label">导入数据</div>
      </div>
      
      <!-- 清除按钮 -->
      <div class="sidebar-item danger" @click="confirmClearData">
        <div class="sidebar-icon">
          <!-- 传统风格的清除图标：类似扫帚或重置 -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="sidebar-label">清除数据</div>
      </div>
    </div>
    
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      accept=".json"
      @change="handleImport"
    >

    <!-- 反馈模态框 (使用 Teleport 移出侧边栏) -->
    <Teleport to="body">
      <BaseModal
        v-model:isOpen="isModalOpen"
        :title="modalTitle"
        :message="modalMessage"
        :is-prompt="isModalPrompt"
        @confirm="handleModalConfirm"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import BaseModal from './BaseModal.vue'

const userStore = useUserStore()
const fileInput = ref(null)

// 模态框状态
const isModalOpen = ref(false)
const modalTitle = ref('')
const modalMessage = ref('')
const modalAction = ref(null)
const isModalPrompt = ref(false) // 增加 prompt 支持，尽管目前只用 confirm

// 导出
function handleExport() {
  const data = userStore.exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kanji_backup_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 导入
function triggerImport() {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      const result = userStore.importData(content)
      
      // Reset input
      event.target.value = ''
      
      modalTitle.value = result.success ? '导入成功' : '导入失败'
      modalMessage.value = result.success ? '数据已成功导入并刷新。' : result.message
      
      modalAction.value = () => {
        if (result.success) {
           window.location.reload() // 简单粗暴刷新页面确保所有状态更新
        }
      }
      isModalOpen.value = true
    } catch (err) {
      modalTitle.value = '导入失败'
      modalMessage.value = '文件格式错误或损坏'
      isModalOpen.value = true
    }
  }
  reader.readAsText(file)
}

// 清除数据
function confirmClearData() {
  modalTitle.value = '清除数据'
  modalMessage.value = '确定要清除所有本地数据吗？\n包括收藏夹、练习历史和搜索记录。\n此操作不可恢复！'
  isModalPrompt.value = false // 这里只需要确认，不需要输入，BaseModal 默认支持 confirm/cancel
  
  modalAction.value = () => {
    userStore.clearAllData()
    localStorage.removeItem('search_history')
    // 刷新页面
    window.location.reload()
  }
  isModalOpen.value = true
}

function handleModalConfirm() {
  isModalOpen.value = false
  if (modalAction.value) {
    modalAction.value()
    modalAction.value = null
  }
}
</script>

<style scoped>
.sidebar-container {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.sidebar-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  border: 1px solid var(--border-color);
  border-right: none;
}

/* 整体悬停时展开所有子项 */
.sidebar-buttons:hover .sidebar-item {
  width: 140px;
  background: var(--card-bg);
}

.sidebar-buttons:hover .sidebar-item .sidebar-label {
  opacity: 1;
  transform: translateX(0);
}

.sidebar-item:hover {
  background: #f0f0f0 !important; /* 高亮当前项 */
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: flex-end; /* Align content to the right (icon side) */
  width: 48px;
  height: 48px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: transparent;
  overflow: hidden;
  padding-right: 0; /* 确保icon始终在右侧 */
}

.sidebar-item:hover {
  width: 140px;
  background: var(--card-bg);
}

.sidebar-icon {
  width: 48px;
  min-width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  order: 2; /* 图标在右 */
  flex-shrink: 0;
}

.sidebar-label {
  white-space: nowrap;
  font-size: 0.9rem;
  color: var(--secondary-color);
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s;
  order: 1; /* 文字在左 */
  margin-right: 0;
  padding-right: 5px;
}

.sidebar-item:hover .sidebar-label {
  opacity: 1;
  transform: translateX(0);
}

.sidebar-item:hover .sidebar-icon {
    transform: scale(1.1);
}

.sidebar-item.danger:hover .sidebar-label {
    color: var(--accent-color);
}
</style>

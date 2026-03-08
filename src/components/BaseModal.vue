<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  isPrompt: {
    type: Boolean,
    default: false
  },
  inputValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:isOpen', 'confirm', 'cancel', 'update:inputValue'])

function close() {
  emit('update:isOpen', false)
}

function handleConfirm() {
  if (props.isPrompt) {
    emit('confirm', props.inputValue)
  } else {
    emit('confirm')
  }
  close()
}

function handleCancel() {
  emit('cancel')
  close()
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">{{ title }}</h3>
      <div class="modal-body">
        <p v-if="message" style="white-space: pre-line">{{ message }}</p>
        <!-- 默认插槽：用于自定义内容（如复选框） -->
        <slot></slot>

        <input
          v-if="isPrompt"
          type="text"
          :value="inputValue"
          @input="$emit('update:inputValue', $event.target.value)"
          class="modal-input"
          @keyup.enter="handleConfirm"
        />
      </div>
      <div class="modal-footer">
        <button v-if="showCancel" @click="handleCancel" class="btn-cancel">{{ cancelText }}</button>
        <button @click="handleConfirm" class="btn-confirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-title {
  margin-top: 0;
  color: #333;
}

.modal-input {
  width: 100%;
  padding: 8px;
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.modal-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-confirm {
  background-color: var(--primary-color, #003366);
  color: white;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #333;
}
</style>

<script setup>
// 应用入口：负责顶部导航与三个主视图的切换
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import GlobalSidebar from './components/GlobalSidebar.vue'

const userStore = useUserStore()
userStore.init()
</script>

<template>
  <!-- 页面整体容器：标题 + 顶部导航 + 主视图区 -->
  <div class="container">
    <GlobalSidebar />
    <header>
      <h1>中日字鉴</h1>
    </header>
    <!-- 导航栏：切换三种视图 -->
    <nav>
      <RouterLink to="/search" custom v-slot="{ navigate, isActive }">
        <button
          :class="{ active: isActive }"
          data-view="search-view"
          type="button"
          @click="navigate"
        >
          汉字检索
        </button>
      </RouterLink>
      <RouterLink to="/collection" custom v-slot="{ navigate, isActive }">
        <button
          :class="{ active: isActive }"
          data-view="collection-view"
          type="button"
          @click="navigate"
        >
          我的收藏
        </button>
      </RouterLink>
      <RouterLink to="/exercise" custom v-slot="{ navigate, isActive }">
        <button
          :class="{ active: isActive }"
          data-view="exercise-view"
          type="button"
          @click="navigate"
        >
          自主练习
        </button>
      </RouterLink>
    </nav>

    <!-- 主视图通过 RouterView 渲染 -->
    <RouterView v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </RouterView>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;900&family=Noto+Serif+SC:wght@400;600;900&display=swap');

:root {
  /* 东方禅意配色方案 */
  --primary-color: #2c3e50; /* 墨色 */
  --secondary-color: #5d6d7e; /* 铅丹色 */
  --accent-color: #c0392b; /* 朱砂红 */
  --bg-color: #fdfbf7; /* 米纸色 */
  --card-bg: #ffffff;
  --text-color: #2c3e50;
  --border-color: #e0e0e0;

  /* 阴影与圆角 */
  --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
  --radius-md: 12px;
  --radius-lg: 20px;
}

body {
  font-family: 'Noto Serif SC', 'Noto Serif JP', serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  margin: 0;
  padding: 0;
  line-height: 0.8; /* 全局行距优化 */
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");

  /* 解决滚动条抖动问题 */
  overflow-y: scroll; /* 强制显示垂直滚动条 */
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

header {
  text-align: center;
  margin-bottom: 40px;
  border-bottom: none;
}

header h1 {
  color: var(--primary-color);
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  margin: 0;
  position: relative;
  display: inline-block;
}

header h1::after {
  content: '';
  display: block;
  width: 60px;
  height: 4px;
  background-color: var(--accent-color);
  margin: 15px auto 0;
  border-radius: 2px;
}

nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  background-color: transparent;
  box-shadow: none;
  margin-bottom: 40px;
  padding: 0;
}

nav button {
  flex: 0 1 auto;
  padding: 12px 30px;
  font-size: 1.1rem;
  font-weight: 600;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--secondary-color);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-soft);
  font-family: 'Noto Serif SC', serif;
}

nav button:not(:last-child) {
  border-right: 1px solid var(--border-color);
}

nav button.active {
  background-color: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

nav button:hover:not(.active) {
  background-color: #fff;
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  color: var(--primary-color);
}

/* 通用组件样式优化 */
.search-container {
  text-align: center;
  margin-bottom: 25px; /* 减小间距 */
  position: relative;
}

#search-input {
  width: 100%;
  max-width: 600px;
  padding: 12px 20px; /* 减小内边距 */
  font-size: 1.1rem;
  border-radius: 30px;
  border: 2px solid var(--border-color);
  background-color: var(--card-bg);
  transition: all 0.3s ease;
  box-shadow: var(--shadow-soft);
  font-family: 'Noto Serif SC', serif;
  text-align: center;
}

#search-input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 4px rgba(44, 62, 80, 0.1);
}

.comparison-card {
  background-color: var(--card-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative; /* Ensure absolute children position correctly */
}

.comparison-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.glyph-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: center;
  border-bottom: 1px dashed #ddd;
}

.glyph-display {
  font-size: 7rem;
  font-weight: 600;
  padding: 20px 0;
  font-family: 'Noto Serif JP', 'Noto Serif SC', serif;
  color: var(--primary-color);
}

.glyph-jp {
  font-family: 'Noto Serif JP', 'Yu Gothic', serif;
  border-right: none;
  border-bottom: 1px dashed var(--border-color);
}

.glyph-cn {
  font-family: 'Noto Serif SC', 'Microsoft YaHei', serif;
}

.details-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.kanji-panel,
.hanzi-panel {
  padding: 20px;
}

.kanji-panel {
  border-right: 1px solid #eee;
}

.kanji-panel h3 {
  color: var(--secondary-color);
}

.hanzi-panel h3 {
  color: var(--secondary-color);
}

dl {
  margin: 0;
}

dt {
  font-weight: 600;
  color: #555;
  margin-top: 15px; /* 增加组间距 */
  margin-bottom: 4px; /* 增加标签与内容的间距 */
}

dd {
  margin-left: 0;
  font-size: 0.95rem;
  color: #111;
  word-wrap: break-word;
}

.audio-btn {
  cursor: pointer;
  color: var(--accent-color);
  display: inline-block;
  margin-left: 5px;
  font-size: 0.8rem;
}

.comparison-card.is-different {
  border-color: var(--accent-color);
}

.comparison-card.is-different .glyph-display {
  color: var(--accent-color);
}

.comparison-card.is-different .glyph-comparison {
  padding-top: 40px; /* 为顶部角标留出空间 */
}

.diff-badge {
  position: absolute;
  top: 8px;
  right: 60px;
  background-color: var(--accent-color);
  color: #fff;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: bold;
  z-index: 5;
}

.collection-btn {
  /* position: absolute;  <-- 移除这个 */
  /* top: 8px; */
  /* right: 10px; */
  font-size: 1.8rem;
  cursor: pointer;
  color: #ccc;
  transition: color 0.2s;
  background: none; /* 确保无背景 */
  border: none;
  padding: 0;
}

.collection-btn:hover {
  color: #f0c14b;
}

.collection-btn.collected {
  color: #f0c14b;
}

.btn-strong, .btn-round {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 20px;
  padding: 8px 20px;
  font-family: 'Noto Serif SC', serif;
  transition: all 0.2s;
  cursor: pointer;
  display: inline-block;
  font-size: 0.85rem;
}

.btn-strong:hover, .btn-round:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: #fff;
}

.section-title {
  text-align: center;
  margin-bottom: 20px;
  font-size: 1.8rem;
  color: var(--primary-color);
}

.folder-controls {
  text-align: right;
  padding: 6px 10px;
  margin-bottom: 20px;
}

.folder-controls select,
.folder-controls button {
  margin-left: 6px;
}

.select-strong {
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--card-bg);
  font-family: 'Noto Serif SC', serif;
  color: var(--text-color);
}

.collection-header {
  display: flex;
  align-items: center;
  padding: 8px 16px; /* 减小表头高度 */
  background: var(--primary-color);
  color: #fff;
  font-weight: 600;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  margin-bottom: 0;
}

.collection-header .glyphs {
  display: flex;
  align-items: center;
  gap: 20px;
}

.collection-header .glyph {
  font-size: 1rem;
  min-width: 3em;
  text-align: center;
}

.collection-header .right-controls {
  flex: 1;
  text-align: right;
  font-size: 0.9rem;
  opacity: 0.9;
}

.collection-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px; /* 减小列表项高度 */
  border: 1px solid var(--border-color);
  border-top: none;
  background: var(--card-bg);
  position: relative;
  transition: background-color 0.2s;
}

.collection-item:last-child {
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.collection-item:hover {
  background-color: #fcfcfc;
}

.collection-item .glyphs {
  display: flex;
  align-items: center;
  gap: 20px;
}

.collection-item .glyph {
  font-size: 2rem; /* 适当减小列表字体 */
  min-width: 3em;
  text-align: center;
  font-family: 'Noto Serif SC', serif;
}

.collection-item .right-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collection-item .collection-btn {
  position: static;
  font-size: 1.5rem;
  margin-right: 4px;
}

/* 练习相关样式 - 已迁移至 components/ExerciseView.vue scoped */
</style>

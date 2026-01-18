<script setup>
// 应用入口：负责顶部导航与三个主视图的切换
import { ref } from 'vue'
import SearchView from './components/SearchView.vue'
import CollectionView from './components/CollectionView.vue'
import ExerciseView from './components/ExerciseView.vue'

// 当前激活的视图：search / collection / exercise
const activeView = ref('search')

// 切换视图时更新 activeView
function switchView(view) {
  activeView.value = view
}
</script>

<template>
  <!-- 页面整体容器：标题 + 顶部导航 + 主视图区 -->
  <div class="container">
    <header>
      <h1>中日字鉴</h1>
    </header>
    <!-- 导航栏：切换三种视图 -->
    <nav>
      <button
        :class="{ active: activeView === 'search' }"
        data-view="search-view"
        type="button"
        @click="switchView('search')"
      >
        汉字检索
      </button>
      <button
        :class="{ active: activeView === 'collection' }"
        data-view="collection-view"
        type="button"
        @click="switchView('collection')"
      >
        我的收藏
      </button>
      <button
        :class="{ active: activeView === 'exercise' }"
        data-view="exercise-view"
        type="button"
        @click="switchView('exercise')"
      >
        自主练习
      </button>
    </nav>

    <!-- 三个主视图通过 v-show 切换显示 -->
    <SearchView v-show="activeView === 'search'" />
    <CollectionView v-show="activeView === 'collection'" />
    <ExerciseView v-show="activeView === 'exercise'" />
  </div>
</template>

<style>
:root {
  --primary-color: #003366;
  --secondary-color: #014d4e;
  --highlight-color: #d9001b;
  --jp-color: #005a9c;
  --cn-color: #b92c28;
  --bg-light: #f4f7f6;
  --bg-white: #ffffff;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  background-color: var(--bg-light);
  color: #333;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 10px;
  margin-bottom: 25px;
}

header h1 {
  color: var(--primary-color);
  margin: 0;
}

nav {
  display: flex;
  justify-content: center;
  background-color: var(--bg-white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  margin-bottom: 25px;
  overflow: hidden;
}

nav button {
  flex: 1;
  padding: 15px 20px;
  font-size: 1.1rem;
  font-weight: 600;
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: var(--primary-color);
  transition:
    background-color 0.3s,
    color 0.3s;
  border-bottom: 3px solid transparent;
}

nav button:not(:last-child) {
  border-right: 1px solid var(--bg-light);
}

nav button.active {
  background-color: var(--primary-color);
  color: var(--bg-white);
  border-bottom-color: var(--highlight-color);
}

nav button:hover:not(.active) {
  background-color: #f0f0f0;
}

.search-container {
  text-align: center;
  margin-bottom: 25px;
}

#search-input {
  width: 80%;
  max-width: 500px;
  padding: 12px 18px;
  font-size: 1.1rem;
  border-radius: 25px;
  border: 2px solid #ccc;
  transition: border-color 0.3s;
}

#search-input:focus {
  border-color: var(--primary-color);
  outline: none;
}

#search-results {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.placeholder,
#loading {
  text-align: center;
  color: #888;
  padding: 20px;
}

.comparison-card {
  background-color: var(--bg-white);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
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
}

.glyph-jp {
  font-family: 'Noto Sans JP', 'Yu Gothic', 'YuGothic', 'Meiryo',
    'Hiragino Kaku Gothic ProN', sans-serif;
  border-right: 1px dashed #ddd;
}

.glyph-cn {
  font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimSun', 'PingFang SC',
    'Hiragino Sans GB', sans-serif;
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
  color: var(--jp-color);
}

.hanzi-panel h3 {
  color: var(--cn-color);
}

dl {
  margin: 0;
}

dt {
  font-weight: 600;
  color: #555;
  margin-top: 10px;
}

dd {
  margin-left: 0;
  font-size: 0.95rem;
  color: #111;
  word-wrap: break-word;
}

.audio-btn {
  cursor: pointer;
  color: #007bff;
  display: inline-block;
  margin-left: 5px;
  font-size: 0.8rem;
}

.comparison-card.is-different {
  border-color: var(--highlight-color);
}

.comparison-card.is-different .glyph-display {
  color: var(--highlight-color);
}

.diff-badge {
  position: absolute;
  top: 10px;
  right: 50px;
  background-color: var(--highlight-color);
  color: #fff;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: bold;
}

.collection-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 1.8rem;
  cursor: pointer;
  color: #ccc;
}

.collection-btn.collected {
  color: #f0c14b;
}

.btn-round {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 16px;
  border: 1px solid #ccc;
  background: #fff;
  color: #333;
  font-size: 0.85rem;
  cursor: pointer;
}

.section-title {
  text-align: center;
}

.folder-controls {
  text-align: right;
  padding: 6px 10px;
}

.folder-controls select,
.folder-controls button {
  margin-left: 6px;
}

.collection-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: var(--primary-color);
  color: #fff;
  font-weight: 600;
  border-radius: 0;
  margin-bottom: 4px;
}

.collection-header .glyphs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collection-header .glyph {
  font-size: 0.95rem;
  min-width: 2.6em;
  text-align: center;
}

.collection-header .right-controls {
  flex: 1;
  text-align: right;
  font-size: 0.85rem;
  opacity: 0.9;
}

.collection-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
  position: relative;
  margin-bottom: 8px;
}

.collection-item .glyphs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collection-item .glyph {
  font-size: 2rem;
  min-width: 2.6em;
  text-align: center;
}

.collection-item .glyph-jp {
  font-family: 'Noto Sans JP', 'Yu Gothic', 'YuGothic', 'Meiryo',
    'Hiragino Kaku Gothic ProN', sans-serif;
}

.collection-item .glyph-cn {
  font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimSun', 'PingFang SC',
    'Hiragino Sans GB', sans-serif;
}

.collection-item .right-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collection-item .collection-btn {
  position: static;
  font-size: 1.5rem;
  margin-right: 4px;
}

.select-strong {
  border: 2px solid #888;
  padding: 4px 10px;
  border-radius: 10px;
}

.btn-strong {
  border: 2px solid #888;
  padding: 6px 12px;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.btn-strong:hover {
  background: #f6f6f6;
}

.btn-dark {
  background: var(--secondary-color);
  color: #fff;
  border-color: var(--secondary-color);
}

#exercise-view {
  text-align: center;
  background-color: var(--bg-white);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.exercise-status {
  margin-bottom: 8px;
  color: #666;
  font-size: 0.95rem;
}

.exercise-question {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 25px;
}

#exercise-glyph {
  font-family: 'Yu Gothic', 'Microsoft YaHei', sans-serif;
  font-size: 10rem;
  font-weight: bold;
  color: var(--primary-color);
  margin: 20px 0;
  min-height: 160px;
}

#exercise-reveal .glyph-jp,
#exercise-reveal .glyph-cn {
  font-size: 6rem;
}

.btn-round.btn-join:hover {
  background: var(--secondary-color);
  color: #fff;
  border-color: var(--secondary-color);
}

.flip-container {
  perspective: 1000px;
  margin: 10px auto;
  width: 100%;
  max-width: 520px;
}

.flipper {
  position: relative;
  transform-style: preserve-3d;
  transition: 0.6s;
}

.flip-container.flipped .flipper {
  transform: rotateY(180deg);
}

.flip-side {
  position: relative;
  backface-visibility: hidden;
  min-height: 220px;
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.flip-back {
  transform: rotateY(180deg);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.choice-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 8px;
}

.choice-buttons button {
  font-size: 1.2rem;
  padding: 12px 30px;
  cursor: pointer;
  border-radius: 8px;
  border: 2px solid var(--secondary-color);
  background-color: var(--bg-white);
  color: var(--secondary-color);
  font-weight: 600;
}

.choice-buttons button:hover {
  background-color: var(--secondary-color);
  color: var(--bg-white);
}

.exercise-feedback {
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: bold;
}

#feedback-correct {
  color: #28a745;
}

#feedback-wrong {
  color: var(--highlight-color);
}

.exercise-reveal-card {
  margin-top: 15px;
  border-top: 2px solid var(--bg-light);
  padding-top: 15px;
}

.next-exercise-btn {
  font-size: 1.1rem;
  padding: 10px 25px;
  cursor: pointer;
  border-radius: 8px;
  border: none;
  background-color: var(--primary-color);
  color: var(--bg-white);
  font-weight: 600;
  margin-top: 20px;
}

.next-exercise-btn:hover {
  opacity: 0.8;
}

.exercise-result {
  margin-top: 16px;
  text-align: center;
}

.exercise-result .score {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--primary-color);
}

.exercise-result .lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 12px;
}

.exercise-result .list {
  text-align: left;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
}

.list-item .glyphs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-item .glyph {
  font-size: 2rem;
  min-width: 2.6em;
  text-align: center;
}

.list-item .meta {
  color: #666;
  font-size: 0.9rem;
}

.exercise-restart {
  text-align: center;
  margin-top: 10px;
}

.error {
  margin-top: 12px;
  color: var(--highlight-color);
}

.writing-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 220px;
}

.writing-block .glyph-cn {
  font-size: 7rem;
  line-height: 1;
}

.writing-block .audio-btn {
  font-size: 1.2rem;
  margin-top: 10px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  padding: 16px 20px;
  border-radius: 12px;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.modal-title {
  margin: 0 0 10px;
  font-size: 1.1rem;
}

.modal-body {
  max-height: 260px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}

.folder-new {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>

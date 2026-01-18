<script setup>
// 复用的中日汉字对比卡片组件：负责展示字形、详细信息与朗读、收藏星标
import { useSpeechSynthesis } from '../composables/useSpeechSynthesis'

// 输入属性：
// - entry：一条字符记录（含 jp/cn 字形、读音等）
// - collected：当前是否已被收藏，用于控制星标高亮
// - showDetails：是否展示下面的详细信息区域
// - showCollectionButton：是否显示星标按钮
// - showDiffBadge：是否显示“字体不同”角标
const props = defineProps({
  entry: {
    type: Object,
    required: true,
  },
  collected: {
    type: Boolean,
    default: false,
  },
  showDetails: {
    type: Boolean,
    default: true,
  },
  showCollectionButton: {
    type: Boolean,
    default: true,
  },
  showDiffBadge: {
    type: Boolean,
    default: true,
  },
})

// 对外事件：通知父组件“请切换该条目的收藏状态”
const emit = defineEmits(['toggle-collection'])

// 朗读能力：用于日文音读、训读与中文读音
const { speak } = useSpeechSynthesis()

// 点击星标时，发出事件让父组件做具体的收藏逻辑
function handleToggleCollection() {
  emit('toggle-collection', props.entry.id)
}
</script>

<template>
  <!-- 外层卡片容器 -->
  <div
    class="comparison-card"
    :class="{ 'is-different': entry.is_diff === '否' }"
  >
    <!-- “字体不同”提示角标 -->
    <div
      v-if="showDiffBadge && entry.is_diff === '否'"
      class="diff-badge"
    >
      !! 字体不同 !!
    </div>
    <!-- 收藏星标 -->
    <span
      v-if="showCollectionButton"
      class="collection-btn"
      :class="{ collected }"
      title="选择收藏夹"
      @click="handleToggleCollection"
    >
      {{ collected ? '★' : '☆' }}
    </span>
    <!-- 上半部分：中日两种字形的大号展示 -->
    <div class="glyph-comparison">
      <div class="glyph-display glyph-jp">
        <span lang="ja">
          {{ (entry.jp_char || '').split('（')[0] || '?' }}
        </span>
      </div>
      <div class="glyph-display glyph-cn">
        <span lang="zh-Hans">
          {{ entry.cn_char || '?' }}
        </span>
      </div>
    </div>
    <!-- 下半部分：可选的详细信息区域 -->
    <div
      v-if="showDetails"
      class="details-comparison"
    >
      <!-- 左侧：日文信息 -->
      <div class="kanji-panel">
        <h3>日本语 (常用漢字)</h3>
        <dl>
          <dt>汉字</dt>
          <dd>{{ entry.jp_char }}</dd>
          <dt>音读</dt>
          <dd>
            {{ entry.jp_on || '-' }}
            <span
              class="audio-btn"
              data-lang="ja-JP"
              @click="speak((entry.jp_on || '').split(',')[0], 'ja-JP')"
            >
              🔊
            </span>
          </dd>
          <dt>训读</dt>
          <dd>
            {{ entry.jp_kun || '-' }}
            <span
              class="audio-btn"
              data-lang="ja-JP"
              @click="speak((entry.jp_kun || '').split(',')[0], 'ja-JP')"
            >
              🔊
            </span>
          </dd>
          <dt>用例</dt>
          <dd>{{ entry.jp_ex || '-' }}</dd>
        </dl>
      </div>
      <!-- 右侧：中文信息 -->
      <div class="hanzi-panel">
        <h3>中国语 (规范汉字)</h3>
        <dl>
          <dt>汉字</dt>
          <dd>{{ entry.cn_char }}</dd>
          <dt>读音 (Pinyin)</dt>
          <dd>
            {{ entry.cn_pinyin || '-' }}
            <span
              class="audio-btn"
              data-lang="zh-CN"
              @click="speak(entry.cn_char, 'zh-CN')"
            >
              🔊
            </span>
          </dd>
          <dt>级别</dt>
          <dd>{{ entry.level || '-' }}</dd>
          <dt>用例</dt>
          <dd>（待补充）</dd>
        </dl>
      </div>
    </div>
  </div>
</template>

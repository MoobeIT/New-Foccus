<template>
  <div class="flipbook-overlay">
    <div class="flipbook-container">
      <!-- Header -->
      <div class="flipbook-header">
        <button class="btn-back" @click="$emit('close')">
          ← Voltar
        </button>
        <div class="header-title">
          <h2>{{ albumName }}</h2>
          <span>Revisão e Aprovação</span>
        </div>
        <div class="header-status" :class="overallStatusClass">
          {{ statusText }}
        </div>
      </div>

      <!-- Main Content -->
      <div class="flipbook-main">
        <!-- Album View -->
        <div class="album-view">
          <!-- Navigation Left -->
          <button class="nav-arrow left" @click="prevSpread" :disabled="currentSpread === 0">
            ‹
          </button>

          <!-- Album Spread -->
          <div class="album-spread">
            <!-- Left Page -->
            <div class="album-page" :style="{ backgroundColor: currentSpread === 0 ? '#8B4513' : '#FDFBF7' }">
              <template v-if="leftPageImages.length">
                <img 
                  v-for="(img, i) in leftPageImages" 
                  :key="'l'+i" 
                  :src="img.src"
                  class="page-image"
                  :style="getImgStyle(img)"
                />
              </template>
              <div v-else class="page-placeholder">
                {{ currentSpread === 0 ? 'Contracapa' : `Página ${(currentSpread - 1) * 2 + 1}` }}
              </div>
            </div>

            <!-- Center Spine -->
            <div class="album-center"></div>

            <!-- Right Page -->
            <div class="album-page" :style="{ backgroundColor: currentSpread === 0 ? '#8B4513' : '#FDFBF7' }">
              <template v-if="rightPageImages.length">
                <img 
                  v-for="(img, i) in rightPageImages" 
                  :key="'r'+i" 
                  :src="img.src"
                  class="page-image"
                  :style="getImgStyle(img)"
                />
              </template>
              <div v-else class="page-placeholder">
                {{ currentSpread === 0 ? 'Capa' : `Página ${(currentSpread - 1) * 2 + 2}` }}
              </div>
            </div>

            <!-- Revision Badge -->
            <div v-if="currentPageStatus === 'revision'" class="revision-indicator">
              ✏️ Revisão solicitada
            </div>
          </div>

          <!-- Navigation Right -->
          <button class="nav-arrow right" @click="nextSpread" :disabled="currentSpread >= maxSpread">
            ›
          </button>
        </div>

        <!-- Page Info -->
        <div class="page-info">
          {{ currentSpread === 0 ? 'Capa e Contracapa' : `Páginas ${(currentSpread-1)*2+1} - ${(currentSpread-1)*2+2}` }}
          &nbsp;•&nbsp; {{ currentSpread + 1 }} de {{ maxSpread + 1 }}
        </div>

        <!-- Review Panel -->
        <div class="review-panel">
          <!-- Status Buttons -->
          <div class="panel-section">
            <h4>Status desta página</h4>
            <div class="status-btns">
              <button 
                :class="['status-btn', 'approve', { active: currentPageStatus === 'approved' }]"
                @click="setStatus('approved')"
              >
                ✓ Aprovado
              </button>
              <button 
                :class="['status-btn', 'revision', { active: currentPageStatus === 'revision' }]"
                @click="setStatus('revision')"
              >
                ✏️ Revisão
              </button>
            </div>
          </div>

          <!-- Comments -->
          <div class="panel-section">
            <h4>Anotações</h4>
            <div class="comments-area">
              <div v-if="currentComments.length" class="comments-list">
                <div v-for="(c, i) in currentComments" :key="i" class="comment-item">
                  <span class="comment-text">{{ c.text }}</span>
                  <button class="comment-delete" @click="removeComment(i)">×</button>
                </div>
              </div>
              <div v-else class="no-comments">Nenhuma anotação</div>
              <div class="comment-input">
                <textarea v-model="newComment" placeholder="Escreva uma anotação..." rows="2"></textarea>
                <button @click="addComment" :disabled="!newComment.trim()">Enviar</button>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="panel-section summary">
            <div class="summary-item approved">
              <span class="num">{{ approvedCount }}</span>
              <span class="label">Aprovadas</span>
            </div>
            <div class="summary-item revision">
              <span class="num">{{ revisionCount }}</span>
              <span class="label">Revisão</span>
            </div>
            <div class="summary-item pending">
              <span class="num">{{ pendingCount }}</span>
              <span class="label">Pendentes</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Thumbnails -->
      <div class="thumbnails-row">
        <button 
          v-for="i in (maxSpread + 1)" 
          :key="i"
          :class="['thumb', { 
            active: currentSpread === i - 1,
            approved: pageStatuses[i-1] === 'approved',
            revision: pageStatuses[i-1] === 'revision'
          }]"
          @click="currentSpread = i - 1"
        >
          {{ i === 1 ? 'Capa' : `${(i-2)*2+1}-${(i-2)*2+2}` }}
        </button>
      </div>

      <!-- Footer -->
      <div class="flipbook-footer">
        <button v-if="pendingCount > 0" class="btn-approve-all" @click="approveAll">
          ✓ Aprovar Todas
        </button>
        <button class="btn-save" @click="saveReview">
          Salvar Revisão
        </button>
        <button class="btn-finish" @click="finishReview" :disabled="pendingCount > 0">
          Finalizar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  albumName?: string
  width?: number
  height?: number
  pageCount?: number
  spreads?: any[]
  coverFront?: any[]
  coverBack?: any[]
  pages?: any[]
}>()

const emit = defineEmits(['close', 'approve', 'save-review'])

const currentSpread = ref(0)
const newComment = ref('')
const pageStatuses = ref<Record<number, 'approved' | 'revision'>>({})
const pageComments = ref<Record<number, { text: string }[]>>({})

// Calculate max spread
const maxSpread = computed(() => {
  if (props.spreads?.length) return props.spreads.length
  const innerPages = props.pages?.filter(p => p.type === 'page') || []
  return Math.ceil(innerPages.length / 2)
})

// Get images for current spread
const leftPageImages = computed(() => {
  if (currentSpread.value === 0) {
    return props.coverBack || []
  }
  const idx = currentSpread.value - 1
  if (props.spreads?.[idx]?.left) {
    return props.spreads[idx].left
  }
  const innerPages = props.pages?.filter(p => p.type === 'page') || []
  const page = innerPages[idx * 2]
  return extractImages(page?.elements || [])
})

const rightPageImages = computed(() => {
  if (currentSpread.value === 0) {
    return props.coverFront || []
  }
  const idx = currentSpread.value - 1
  if (props.spreads?.[idx]?.right) {
    return props.spreads[idx].right
  }
  const innerPages = props.pages?.filter(p => p.type === 'page') || []
  const page = innerPages[idx * 2 + 1]
  return extractImages(page?.elements || [])
})

const extractImages = (elements: any[]) => {
  return elements
    .filter(el => el.type === 'image' && el.src)
    .map(el => ({
      src: el.src,
      x: el.x || 0,
      y: el.y || 0,
      width: el.width || 200,
      height: el.height || 200
    }))
}

const getImgStyle = (img: any) => {
  const pw = props.width || 300
  const ph = props.height || 300
  return {
    position: 'absolute',
    left: `${(img.x / pw) * 100}%`,
    top: `${(img.y / ph) * 100}%`,
    width: `${(img.width / pw) * 100}%`,
    height: `${(img.height / ph) * 100}%`,
    objectFit: 'cover'
  }
}

// Status
const currentPageStatus = computed(() => pageStatuses.value[currentSpread.value] || null)
const currentComments = computed(() => pageComments.value[currentSpread.value] || [])

const approvedCount = computed(() => Object.values(pageStatuses.value).filter(s => s === 'approved').length)
const revisionCount = computed(() => Object.values(pageStatuses.value).filter(s => s === 'revision').length)
const pendingCount = computed(() => (maxSpread.value + 1) - approvedCount.value - revisionCount.value)

const overallStatusClass = computed(() => {
  if (revisionCount.value > 0) return 'has-revision'
  if (pendingCount.value === 0) return 'all-approved'
  return 'pending'
})

const statusText = computed(() => {
  if (revisionCount.value > 0) return `${revisionCount.value} para revisão`
  if (pendingCount.value === 0) return 'Todas aprovadas'
  return `${pendingCount.value} pendentes`
})

// Actions
const setStatus = (status: 'approved' | 'revision') => {
  pageStatuses.value[currentSpread.value] = status
}

const addComment = () => {
  if (!newComment.value.trim()) return
  if (!pageComments.value[currentSpread.value]) {
    pageComments.value[currentSpread.value] = []
  }
  pageComments.value[currentSpread.value].push({ text: newComment.value.trim() })
  newComment.value = ''
  if (!pageStatuses.value[currentSpread.value]) {
    pageStatuses.value[currentSpread.value] = 'revision'
  }
}

const removeComment = (idx: number) => {
  pageComments.value[currentSpread.value]?.splice(idx, 1)
}

const approveAll = () => {
  for (let i = 0; i <= maxSpread.value; i++) {
    if (!pageStatuses.value[i]) {
      pageStatuses.value[i] = 'approved'
    }
  }
}

const saveReview = () => {
  emit('save-review', {
    statuses: { ...pageStatuses.value },
    comments: { ...pageComments.value }
  })
  alert('✅ Revisão salva!')
}

const finishReview = () => {
  if (pendingCount.value > 0) {
    alert('Revise todas as páginas antes de finalizar.')
    return
  }
  if (revisionCount.value > 0) {
    emit('save-review', {
      statuses: { ...pageStatuses.value },
      comments: { ...pageComments.value },
      finished: true,
      needsRevision: true
    })
    alert('📝 Revisão enviada ao fotógrafo!')
  } else {
    emit('approve')
  }
}

// Navigation
const prevSpread = () => { if (currentSpread.value > 0) currentSpread.value-- }
const nextSpread = () => { if (currentSpread.value < maxSpread.value) currentSpread.value++ }

const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') prevSpread()
  else if (e.key === 'ArrowRight') nextSpread()
  else if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
</script>

<style scoped>
.flipbook-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.flipbook-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #fff;
}

/* Header */
.flipbook-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.btn-back {
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background: rgba(255,255,255,0.2);
}

.header-title {
  text-align: center;
}

.header-title h2 {
  margin: 0;
  font-size: 18px;
}

.header-title span {
  font-size: 12px;
  opacity: 0.7;
}

.header-status {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.header-status.pending {
  background: rgba(255,193,7,0.2);
  color: #ffc107;
}

.header-status.has-revision {
  background: rgba(244,67,54,0.2);
  color: #f44336;
}

.header-status.all-approved {
  background: rgba(76,175,80,0.2);
  color: #4caf50;
}

/* Main */
.flipbook-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  overflow: auto;
}

/* Album View */
.album-view {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.nav-arrow {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  font-size: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-arrow:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Album Spread */
.album-spread {
  display: flex;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  border-radius: 4px;
  overflow: hidden;
}

.album-page {
  width: 300px;
  height: 300px;
  position: relative;
  overflow: hidden;
}

.album-center {
  width: 6px;
  background: linear-gradient(90deg, rgba(0,0,0,0.2), rgba(0,0,0,0.05), rgba(0,0,0,0.2));
}

.page-image {
  border-radius: 2px;
}

.page-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.revision-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(244,67,54,0.9);
  color: #fff;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
}

/* Page Info */
.page-info {
  padding: 10px 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  font-size: 14px;
  margin-bottom: 20px;
}

/* Review Panel */
.review-panel {
  width: 100%;
  max-width: 700px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.panel-section {
  flex: 1;
  min-width: 200px;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 16px;
}

.panel-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

/* Status Buttons */
.status-btns {
  display: flex;
  gap: 10px;
}

.status-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 13px;
}

.status-btn:hover {
  background: rgba(255,255,255,0.1);
}

.status-btn.approve.active {
  background: rgba(76,175,80,0.2);
  border-color: #4caf50;
  color: #4caf50;
}

.status-btn.revision.active {
  background: rgba(244,67,54,0.2);
  border-color: #f44336;
  color: #f44336;
}

/* Comments */
.comments-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comments-list {
  max-height: 100px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}

.comment-delete {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 16px;
}

.no-comments {
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  text-align: center;
  padding: 10px;
}

.comment-input {
  display: flex;
  gap: 8px;
}

.comment-input textarea {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 13px;
  resize: none;
}

.comment-input textarea::placeholder {
  color: rgba(255,255,255,0.4);
}

.comment-input button {
  padding: 10px 16px;
  background: #64b5f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.comment-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Summary */
.panel-section.summary {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.summary-item {
  text-align: center;
  padding: 12px 20px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
}

.summary-item .num {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.summary-item .label {
  font-size: 11px;
  opacity: 0.6;
  text-transform: uppercase;
}

.summary-item.approved .num { color: #4caf50; }
.summary-item.revision .num { color: #f44336; }
.summary-item.pending .num { color: #ffc107; }

/* Thumbnails */
.thumbnails-row {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(0,0,0,0.3);
  overflow-x: auto;
  justify-content: center;
}

.thumb {
  padding: 8px 16px;
  background: rgba(255,255,255,0.05);
  border: 2px solid transparent;
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.thumb:hover {
  background: rgba(255,255,255,0.1);
}

.thumb.active {
  border-color: #64b5f6;
  background: rgba(100,181,246,0.1);
}

.thumb.approved {
  border-color: #4caf50;
}

.thumb.revision {
  border-color: #f44336;
}

/* Footer */
.flipbook-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(0,0,0,0.3);
  border-top: 1px solid rgba(255,255,255,0.1);
}

.btn-approve-all {
  padding: 12px 24px;
  background: linear-gradient(135deg, #4caf50, #43a047);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  padding: 12px 24px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.btn-save:hover {
  background: rgba(255,255,255,0.1);
}

.btn-finish {
  padding: 12px 24px;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-finish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

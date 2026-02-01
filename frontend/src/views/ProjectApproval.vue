<template>
  <div class="approval-page">
    <!-- Header -->
    <header class="approval-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </div>
        <div class="project-info">
          <h1>{{ project.name }}</h1>
          <span class="photographer">por {{ project.photographerName }}</span>
        </div>
        <div class="header-actions">
          <button class="btn-reject" @click="showRejectModal = true" v-if="!project.approved">
            ✕ Solicitar Alterações
          </button>
          <button class="btn-approve" @click="approveProject" v-if="!project.approved">
            ✓ Aprovar Álbum
          </button>
          <div v-if="project.approved" class="approved-badge">
            ✓ Aprovado em {{ formatDate(project.approvedAt) }}
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="approval-content">
      <!-- Sidebar -->
      <aside class="pages-sidebar">
        <div class="sidebar-header">
          <h3>Páginas</h3>
          <span class="page-count">{{ project.pages.length }} páginas</span>
        </div>
        <div class="pages-list">
          <div 
            v-for="(page, index) in project.pages" 
            :key="page.id"
            :class="['page-thumb', { active: currentPageIndex === index, 'has-comment': page.comments?.length }]"
            @click="currentPageIndex = index"
          >
            <div class="thumb-preview" :style="{ background: page.previewColor }">
              <span v-if="page.type === 'cover'">Capa</span>
              <span v-else>{{ index }}</span>
            </div>
            <span v-if="page.comments?.length" class="comment-badge">{{ page.comments.length }}</span>
          </div>
        </div>
      </aside>

      <!-- Page Viewer -->
      <main class="page-viewer">
        <div class="viewer-toolbar">
          <button class="nav-btn" @click="prevPage" :disabled="currentPageIndex === 0">
            ← Anterior
          </button>
          <span class="page-indicator">
            Página {{ currentPageIndex + 1 }} de {{ project.pages.length }}
          </span>
          <button class="nav-btn" @click="nextPage" :disabled="currentPageIndex === project.pages.length - 1">
            Próxima →
          </button>
        </div>

        <div class="page-display">
          <div class="page-spread">
            <div class="page-left" :style="{ background: currentPage?.previewColor }">
              <div class="page-content">
                <div v-for="element in currentPage?.elementsLeft" :key="element.id" class="element">
                  {{ element.type }}
                </div>
              </div>
            </div>
            <div class="page-right" :style="{ background: currentPage?.previewColor }">
              <div class="page-content">
                <div v-for="element in currentPage?.elementsRight" :key="element.id" class="element">
                  {{ element.type }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comments Section -->
        <div class="comments-section">
          <div class="comments-header">
            <h4>💬 Comentários desta página</h4>
            <button class="btn-add-comment" @click="showCommentInput = !showCommentInput">
              + Adicionar
            </button>
          </div>

          <div v-if="showCommentInput" class="comment-input">
            <textarea 
              v-model="newComment" 
              placeholder="Digite seu comentário ou sugestão..."
              rows="3"
            ></textarea>
            <div class="comment-actions">
              <button class="btn-cancel" @click="showCommentInput = false">Cancelar</button>
              <button class="btn-send" @click="addComment">Enviar</button>
            </div>
          </div>

          <div class="comments-list">
            <div v-for="comment in currentPage?.comments" :key="comment.id" class="comment-item">
              <div class="comment-avatar">{{ comment.authorInitials }}</div>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.author }}</span>
                  <span class="comment-date">{{ formatRelativeDate(comment.createdAt) }}</span>
                </div>
                <p class="comment-text">{{ comment.text }}</p>
                <div v-if="comment.reply" class="comment-reply">
                  <span class="reply-author">{{ project.photographerName }}:</span>
                  {{ comment.reply }}
                </div>
              </div>
            </div>
            <div v-if="!currentPage?.comments?.length" class="no-comments">
              Nenhum comentário nesta página
            </div>
          </div>
        </div>
      </main>

      <!-- Info Panel -->
      <aside class="info-panel">
        <div class="panel-section">
          <h4>📋 Detalhes do Projeto</h4>
          <div class="detail-item">
            <span class="detail-label">Produto</span>
            <span class="detail-value">{{ project.productName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Formato</span>
            <span class="detail-value">{{ project.format }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Páginas</span>
            <span class="detail-value">{{ project.pages.length }} páginas</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Papel</span>
            <span class="detail-value">{{ project.paper }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Capa</span>
            <span class="detail-value">{{ project.coverType }}</span>
          </div>
        </div>

        <div class="panel-section">
          <h4>💰 Resumo</h4>
          <div class="price-row">
            <span>Álbum base</span>
            <span>R$ {{ formatCurrency(project.basePrice) }}</span>
          </div>
          <div class="price-row" v-if="project.extraPagesPrice">
            <span>Páginas extras</span>
            <span>R$ {{ formatCurrency(project.extraPagesPrice) }}</span>
          </div>
          <div class="price-row" v-if="project.casePrice">
            <span>Estojo</span>
            <span>R$ {{ formatCurrency(project.casePrice) }}</span>
          </div>
          <div class="price-row total">
            <span>Total</span>
            <span>R$ {{ formatCurrency(project.totalPrice) }}</span>
          </div>
        </div>

        <div class="panel-section">
          <h4>📞 Contato</h4>
          <p class="contact-info">
            Dúvidas? Entre em contato com {{ project.photographerName }}
          </p>
          <a :href="`mailto:${project.photographerEmail}`" class="contact-btn">
            ✉️ Enviar Email
          </a>
          <a v-if="project.photographerPhone" :href="`https://wa.me/55${project.photographerPhone}`" class="contact-btn whatsapp">
            💬 WhatsApp
          </a>
        </div>
      </aside>
    </div>

    <!-- Approve Modal -->
    <div v-if="showApproveModal" class="modal-overlay" @click.self="showApproveModal = false">
      <div class="modal-content">
        <div class="modal-icon success">✓</div>
        <h2>Confirmar Aprovação</h2>
        <p>Ao aprovar, o álbum será enviado para produção. Esta ação não pode ser desfeita.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showApproveModal = false">Cancelar</button>
          <button class="btn-confirm" @click="confirmApproval">Confirmar Aprovação</button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal-content">
        <div class="modal-icon warning">!</div>
        <h2>Solicitar Alterações</h2>
        <p>Descreva as alterações que você gostaria que fossem feitas:</p>
        <textarea 
          v-model="rejectionReason" 
          placeholder="Ex: Gostaria de trocar a foto da página 5..."
          rows="4"
        ></textarea>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showRejectModal = false">Cancelar</button>
          <button class="btn-reject-confirm" @click="confirmRejection">Enviar Solicitação</button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-icon success large">🎉</div>
        <h2>Álbum Aprovado!</h2>
        <p>Seu álbum foi aprovado e será enviado para produção. Você receberá atualizações por email.</p>
        <div class="modal-actions">
          <button class="btn-confirm" @click="showSuccessModal = false">Entendi</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const currentPageIndex = ref(0)
const showCommentInput = ref(false)
const newComment = ref('')
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const showSuccessModal = ref(false)
const rejectionReason = ref('')

// Mock project data
const project = ref({
  id: route.params.projectId || 'demo',
  name: 'Casamento Marina & Lucas',
  photographerName: 'Studio Foccus',
  photographerEmail: 'contato@foccus.com',
  photographerPhone: '11999999999',
  productName: 'Álbum Casamento Premium',
  format: '30x30 cm',
  paper: 'Papel Fosco 230g',
  coverType: 'Capa Dura Premium',
  basePrice: 299.90,
  extraPagesPrice: 60.00,
  casePrice: 189.90,
  totalPrice: 549.80,
  approved: false,
  approvedAt: null,
  pages: [
    { id: 'cover', type: 'cover', previewColor: 'linear-gradient(135deg, #D4775C, #E8956F)', elementsLeft: [], elementsRight: [], comments: [] },
    { id: 'p1', type: 'spread', previewColor: '#F7F4EE', elementsLeft: [{ id: 'e1', type: '📷' }], elementsRight: [{ id: 'e2', type: '📷' }], comments: [] },
    { id: 'p2', type: 'spread', previewColor: '#F7F4EE', elementsLeft: [{ id: 'e3', type: '📷' }], elementsRight: [{ id: 'e4', type: '📷' }], comments: [
      { id: 'c1', author: 'Marina', authorInitials: 'M', text: 'Adorei essa página! Ficou perfeita.', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    ]},
    { id: 'p3', type: 'spread', previewColor: '#F7F4EE', elementsLeft: [{ id: 'e5', type: '📷' }], elementsRight: [{ id: 'e6', type: '📷' }], comments: [] },
    { id: 'p4', type: 'spread', previewColor: '#F7F4EE', elementsLeft: [{ id: 'e7', type: '📷' }], elementsRight: [{ id: 'e8', type: '📷' }], comments: [] },
  ]
})

const currentPage = computed(() => project.value.pages[currentPageIndex.value])

const prevPage = () => {
  if (currentPageIndex.value > 0) currentPageIndex.value--
}

const nextPage = () => {
  if (currentPageIndex.value < project.value.pages.length - 1) currentPageIndex.value++
}

const addComment = () => {
  if (!newComment.value.trim()) return
  
  currentPage.value.comments.push({
    id: Date.now().toString(),
    author: 'Cliente',
    authorInitials: 'C',
    text: newComment.value,
    createdAt: new Date()
  })
  
  newComment.value = ''
  showCommentInput.value = false
}

const approveProject = () => {
  showApproveModal.value = true
}

const confirmApproval = () => {
  project.value.approved = true
  project.value.approvedAt = new Date()
  showApproveModal.value = false
  showSuccessModal.value = true
}

const confirmRejection = () => {
  // Send rejection to API
  console.log('Rejection reason:', rejectionReason.value)
  showRejectModal.value = false
  rejectionReason.value = ''
}

const formatCurrency = (value: number) => value.toFixed(2).replace('.', ',')
const formatDate = (date: Date) => new Date(date).toLocaleDateString('pt-BR')
const formatRelativeDate = (date: Date) => {
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60))
  if (diffHours < 1) return 'Agora'
  if (diffHours < 24) return `${diffHours}h atrás`
  return formatDate(date)
}
</script>

<style scoped>
.approval-page {
  min-height: 100vh;
  background: #F7F4EE;
}

/* Header */
.approval-header {
  background: #fff;
  border-bottom: 1px solid #EBE7E0;
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}

.brand span {
  font-weight: 600;
  font-size: 16px;
  color: #2D2A26;
}

.project-info {
  flex: 1;
  text-align: center;
}

.project-info h1 {
  font-size: 18px;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 2px;
}

.photographer {
  font-size: 13px;
  color: #6B6560;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-reject {
  padding: 10px 20px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6B6560;
  cursor: pointer;
}

.btn-reject:hover {
  background: #FEE2E2;
  border-color: #FECACA;
  color: #991B1B;
}

.btn-approve {
  padding: 10px 20px;
  background: #10B981;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.btn-approve:hover {
  background: #059669;
}

.approved-badge {
  padding: 10px 20px;
  background: #D1FAE5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #065F46;
}

/* Content */
.approval-content {
  display: grid;
  grid-template-columns: 200px 1fr 300px;
  max-width: 1600px;
  margin: 0 auto;
  min-height: calc(100vh - 70px);
}

/* Sidebar */
.pages-sidebar {
  background: #fff;
  border-right: 1px solid #EBE7E0;
  padding: 20px;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
}

.page-count {
  font-size: 12px;
  color: #6B6560;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-thumb {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.page-thumb:hover {
  border-color: #D4D0C8;
}

.page-thumb.active {
  border-color: #D4775C;
}

.page-thumb.has-comment::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: #D4775C;
  border-radius: 50%;
}

.thumb-preview {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  font-weight: 600;
}

.comment-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: #D4775C;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
}

/* Page Viewer */
.page-viewer {
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.viewer-toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  color: #6B6560;
  cursor: pointer;
}

.nav-btn:hover:not(:disabled) {
  background: #F7F4EE;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 14px;
  color: #6B6560;
}

.page-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.page-spread {
  display: flex;
  gap: 4px;
  box-shadow: 0 20px 50px rgba(45, 42, 38, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.page-left,
.page-right {
  width: 280px;
  height: 280px;
  background: #fff;
}

.page-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

/* Comments */
.comments-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #EBE7E0;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.comments-header h4 {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
}

.btn-add-comment {
  padding: 6px 12px;
  background: #F7F4EE;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  color: #6B6560;
  cursor: pointer;
}

.btn-add-comment:hover {
  background: #EBE7E0;
}

.comment-input {
  margin-bottom: 16px;
}

.comment-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  color: #2D2A26;
}

.comment-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  color: #6B6560;
  cursor: pointer;
}

.btn-send {
  padding: 8px 16px;
  background: #D4775C;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
}

.comment-date {
  font-size: 12px;
  color: #9A958E;
}

.comment-text {
  font-size: 14px;
  color: #4A4744;
  line-height: 1.5;
}

.comment-reply {
  margin-top: 8px;
  padding: 10px;
  background: #F7F4EE;
  border-radius: 8px;
  font-size: 13px;
  color: #4A4744;
}

.reply-author {
  font-weight: 600;
  color: #2D2A26;
}

.no-comments {
  text-align: center;
  padding: 20px;
  color: #6B6560;
  font-size: 14px;
}

/* Info Panel */
.info-panel {
  background: #fff;
  border-left: 1px solid #EBE7E0;
  padding: 20px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #EBE7E0;
}

.panel-section:last-child {
  border-bottom: none;
}

.panel-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.detail-label {
  font-size: 13px;
  color: #6B6560;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #2D2A26;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #4A4744;
}

.price-row.total {
  border-top: 1px solid #EBE7E0;
  margin-top: 8px;
  padding-top: 16px;
  font-weight: 600;
  font-size: 16px;
  color: #2D2A26;
}

.contact-info {
  font-size: 13px;
  color: #6B6560;
  margin-bottom: 12px;
}

.contact-btn {
  display: block;
  padding: 10px;
  text-align: center;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  text-decoration: none;
  font-size: 13px;
  color: #6B6560;
  margin-bottom: 8px;
}

.contact-btn:hover {
  background: #F7F4EE;
}

.contact-btn.whatsapp {
  background: #25D366;
  border-color: #25D366;
  color: #fff;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.modal-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin: 0 auto 20px;
}

.modal-icon.success {
  background: #D1FAE5;
  color: #065F46;
}

.modal-icon.success.large {
  font-size: 40px;
}

.modal-icon.warning {
  background: #FEF3C7;
  color: #92400E;
}

.modal-content h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 12px;
}

.modal-content p {
  font-size: 14px;
  color: #6B6560;
  margin-bottom: 20px;
}

.modal-content textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  margin-bottom: 20px;
  color: #2D2A26;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-confirm {
  padding: 12px 24px;
  background: #10B981;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.btn-reject-confirm {
  padding: 12px 24px;
  background: #EF4444;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 1200px) {
  .approval-content {
    grid-template-columns: 1fr;
  }

  .pages-sidebar,
  .info-panel {
    display: none;
  }
}

@media (max-width: 640px) {
  .header-inner {
    flex-direction: column;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .page-spread {
    flex-direction: column;
  }

  .page-left,
  .page-right {
    width: 100%;
    max-width: 280px;
    height: 200px;
  }
}
</style>

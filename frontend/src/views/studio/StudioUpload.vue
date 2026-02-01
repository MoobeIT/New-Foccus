<template>
  <div class="studio-upload">
    <div class="upload-container">
      <!-- Header -->
      <div class="upload-header">
        <button class="back-btn" @click="goBack">← Voltar</button>
        <div class="header-info">
          <h1>📤 Enviar Arquivo</h1>
          <p>{{ projectName || 'Projeto' }}</p>
        </div>
      </div>

      <!-- Upload Area -->
      <div class="upload-content">
        <div 
          class="upload-zone"
          :class="{ dragging: isDragging, hasFile: uploadedFile }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <input 
            ref="fileInput"
            type="file" 
            accept=".pdf"
            @change="handleFileSelect"
            hidden
          />
          
          <div v-if="!uploadedFile" class="upload-placeholder">
            <span class="upload-icon">📄</span>
            <h3>Arraste seu arquivo PDF aqui</h3>
            <p>ou clique para selecionar</p>
            <span class="file-hint">Formato aceito: PDF (máx. 500MB)</span>
          </div>

          <div v-else class="file-preview">
            <span class="file-icon">📄</span>
            <div class="file-info">
              <h4>{{ uploadedFile.name }}</h4>
              <p>{{ formatFileSize(uploadedFile.size) }}</p>
            </div>
            <button class="remove-btn" @click.stop="removeFile">✕</button>
          </div>
        </div>

        <!-- Upload Progress -->
        <div v-if="uploading" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p>Enviando... {{ uploadProgress }}%</p>
        </div>

        <!-- Validation Results -->
        <div v-if="validationResult" class="validation-results">
          <div v-if="validationResult.valid" class="validation-success">
            <span>✅</span>
            <div>
              <h4>Arquivo válido!</h4>
              <p>{{ validationResult.pages }} páginas detectadas</p>
            </div>
          </div>
          <div v-else class="validation-error">
            <span>⚠️</span>
            <div>
              <h4>Problemas encontrados</h4>
              <ul>
                <li v-for="(error, i) in validationResult.errors" :key="i">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div class="upload-instructions">
          <h4>📋 Requisitos do arquivo</h4>
          <ul>
            <li>Formato PDF com páginas em ordem</li>
            <li>Resolução mínima de 300 DPI</li>
            <li>Sangria de 3mm em todas as bordas</li>
            <li>Cores em CMYK para melhor resultado</li>
            <li>Fontes incorporadas no arquivo</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="upload-actions">
          <button class="btn-secondary" @click="goBack">Cancelar</button>
          <button 
            class="btn-primary" 
            @click="submitUpload"
            :disabled="!uploadedFile || uploading || (validationResult && !validationResult.valid)"
          >
            {{ uploading ? 'Enviando...' : '📤 Enviar para Produção' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const projectId = route.params.projectId as string
const projectName = ref(route.query.projectName as string || '')

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploadedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const validationResult = ref<{ valid: boolean; pages?: number; errors?: string[] } | null>(null)

const goBack = () => {
  router.push('/studio?section=projects')
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    processFile(input.files[0])
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files?.length) {
    processFile(files[0])
  }
}

const processFile = (file: File) => {
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('Por favor, selecione um arquivo PDF')
    return
  }

  // Validate file size (500MB max)
  if (file.size > 500 * 1024 * 1024) {
    alert('O arquivo é muito grande. Máximo permitido: 500MB')
    return
  }

  uploadedFile.value = file
  validateFile(file)
}

const validateFile = async (file: File) => {
  // Simulated validation - in production, this would call the backend
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Mock validation result
  validationResult.value = {
    valid: true,
    pages: 24
  }
}

const removeFile = () => {
  uploadedFile.value = null
  validationResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const submitUpload = async () => {
  if (!uploadedFile.value) return

  uploading.value = true
  uploadProgress.value = 0

  try {
    // Simulate upload progress
    const interval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 100) {
        clearInterval(interval)
      }
    }, 200)

    // In production, this would upload to the backend
    await new Promise(resolve => setTimeout(resolve, 2500))

    alert('Arquivo enviado com sucesso! Seu projeto será revisado pela equipe.')
    router.push('/studio?section=projects')
  } catch (error) {
    alert('Erro ao enviar arquivo. Tente novamente.')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.studio-upload {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  padding: 40px 20px;
}

.upload-container {
  max-width: 700px;
  margin: 0 auto;
}

.upload-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}

.back-btn {
  padding: 10px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
}

.back-btn:hover {
  background: #f8fafc;
}

.header-info h1 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
}

.header-info p {
  margin: 0;
  color: #64748b;
}

.upload-content {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.upload-zone {
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 24px;
}

.upload-zone:hover {
  border-color: #D4775C;
  background: #fef7f5;
}

.upload-zone.dragging {
  border-color: #D4775C;
  background: #fef7f5;
}

.upload-zone.hasFile {
  border-style: solid;
  border-color: #10b981;
  background: #f0fdf4;
  cursor: default;
}

.upload-placeholder .upload-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

.upload-placeholder h3 {
  margin: 0 0 8px 0;
  color: #1e293b;
}

.upload-placeholder p {
  margin: 0 0 16px 0;
  color: #64748b;
}

.file-hint {
  font-size: 0.85rem;
  color: #94a3b8;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
}

.file-icon {
  font-size: 3rem;
}

.file-info {
  flex: 1;
}

.file-info h4 {
  margin: 0 0 4px 0;
  word-break: break-all;
}

.file-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.remove-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  cursor: pointer;
  font-size: 1.2rem;
}

.upload-progress {
  margin-bottom: 24px;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #D4775C, #E8956F);
  transition: width 0.3s;
}

.upload-progress p {
  margin: 0;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.validation-results {
  margin-bottom: 24px;
}

.validation-success, .validation-error {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
}

.validation-success {
  background: #f0fdf4;
}

.validation-error {
  background: #fef2f2;
}

.validation-success span, .validation-error span {
  font-size: 1.5rem;
}

.validation-success h4, .validation-error h4 {
  margin: 0 0 4px 0;
}

.validation-success p {
  margin: 0;
  color: #16a34a;
}

.validation-error ul {
  margin: 0;
  padding-left: 20px;
  color: #dc2626;
}

.upload-instructions {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.upload-instructions h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
}

.upload-instructions ul {
  margin: 0;
  padding-left: 20px;
  color: #475569;
}

.upload-instructions li {
  margin-bottom: 6px;
  font-size: 0.9rem;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary {
  padding: 12px 24px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  padding: 12px 24px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

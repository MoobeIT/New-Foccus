<template>
  <div class="image-uploader">
    <!-- Upload Area -->
    <div
      class="upload-area"
      :class="{ 
        'drag-over': isDragOver,
        'has-images': images.length > 0 
      }"
      @drop="handleDrop"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="acceptedTypes"
        @change="handleFileSelect"
        class="file-input"
      />
      
      <div class="upload-content">
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <div class="upload-text">
          <p class="upload-primary">
            Clique para selecionar ou arraste imagens aqui
          </p>
          <p class="upload-secondary">
            {{ acceptedFormats }} até {{ formatFileSize(maxFileSize) }} cada
          </p>
          <p v-if="maxFiles > 1" class="upload-limit">
            Máximo {{ maxFiles }} imagens
          </p>
        </div>
      </div>
    </div>
    
    <!-- Images Preview -->
    <div v-if="images.length > 0" class="images-preview">
      <div
        v-for="(image, index) in images"
        :key="index"
        class="image-item"
      >
        <div class="image-preview">
          <img :src="getImageUrl(image)" :alt="`Imagem ${index + 1}`" />
          <div class="image-overlay">
            <button
              class="image-action"
              @click="removeImage(index)"
              title="Remover imagem"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="image-info">
          <p class="image-name">{{ getImageName(image) }}</p>
          <p class="image-size">{{ getImageSize(image) }}</p>
        </div>
      </div>
    </div>
    
    <!-- Upload Progress -->
    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
      <p class="progress-text">
        Enviando... {{ uploadProgress }}%
      </p>
    </div>
    
    <!-- Error Messages -->
    <div v-if="errors.length > 0" class="upload-errors">
      <div
        v-for="(error, index) in errors"
        :key="index"
        class="error-message"
      >
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  modelValue: string[];
  maxFiles?: number;
  maxFileSize?: number; // em bytes
  accept?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 5,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  accept: () => ['image/jpeg', 'image/png', 'image/webp'],
});

const emit = defineEmits<{
  'update:modelValue': [images: string[]];
  upload: [images: string[]];
  remove: [index: number];
}>();

// Estado
const fileInput = ref<HTMLInputElement>();
const isDragOver = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const errors = ref<string[]>([]);

// Computed
const images = computed(() => props.modelValue);

const acceptedTypes = computed(() => props.accept.join(','));

const acceptedFormats = computed(() => {
  return props.accept
    .map(type => type.split('/')[1].toUpperCase())
    .join(', ');
});

// Métodos
const triggerFileInput = (): void => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  processFiles(files);
};

const handleDrop = (event: DragEvent): void => {
  event.preventDefault();
  isDragOver.value = false;
  
  const files = Array.from(event.dataTransfer?.files || []);
  processFiles(files);
};

const processFiles = async (files: File[]): Promise<void> => {
  errors.value = [];
  
  // Validações
  const validFiles = files.filter(file => validateFile(file));
  
  if (validFiles.length === 0) return;
  
  // Verificar limite de arquivos
  const totalFiles = images.value.length + validFiles.length;
  if (totalFiles > props.maxFiles) {
    errors.value.push(`Máximo ${props.maxFiles} imagens permitidas`);
    return;
  }
  
  // Simular upload
  uploading.value = true;
  uploadProgress.value = 0;
  
  try {
    const uploadedImages: string[] = [];
    
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      
      // Simular progresso
      uploadProgress.value = Math.round(((i + 1) / validFiles.length) * 100);
      
      // Converter para base64 ou URL (simulação)
      const imageUrl = await fileToDataUrl(file);
      uploadedImages.push(imageUrl);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const newImages = [...images.value, ...uploadedImages];
    emit('update:modelValue', newImages);
    emit('upload', uploadedImages);
    
  } catch (error) {
    errors.value.push('Erro ao fazer upload das imagens');
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};

const validateFile = (file: File): boolean => {
  // Verificar tipo
  if (!props.accept.includes(file.type)) {
    errors.value.push(`${file.name}: Tipo de arquivo não suportado`);
    return false;
  }
  
  // Verificar tamanho
  if (file.size > props.maxFileSize) {
    errors.value.push(`${file.name}: Arquivo muito grande (máx. ${formatFileSize(props.maxFileSize)})`);
    return false;
  }
  
  return true;
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const removeImage = (index: number): void => {
  const newImages = [...images.value];
  newImages.splice(index, 1);
  emit('update:modelValue', newImages);
  emit('remove', index);
};

const getImageUrl = (image: string): string => {
  // Se for base64 ou URL completa, retorna como está
  if (image.startsWith('data:') || image.startsWith('http')) {
    return image;
  }
  // Caso contrário, assume que é um caminho relativo
  return `/uploads/${image}`;
};

const getImageName = (image: string): string => {
  if (image.startsWith('data:')) {
    return 'Imagem carregada';
  }
  return image.split('/').pop() || 'Imagem';
};

const getImageSize = (image: string): string => {
  // Para imagens base64, podemos calcular o tamanho aproximado
  if (image.startsWith('data:')) {
    const sizeInBytes = Math.round((image.length * 3) / 4);
    return formatFileSize(sizeInBytes);
  }
  return 'Tamanho desconhecido';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #2563eb;
  background: #f0f7ff;
}

.upload-area.has-images {
  padding: 1rem;
  margin-bottom: 1rem;
}

.file-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  width: 3rem;
  height: 3rem;
  color: #6b7280;
}

.upload-text {
  text-align: center;
}

.upload-primary {
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.upload-secondary {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.upload-limit {
  font-size: 0.75rem;
  color: #9ca3af;
}

.images-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.image-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.image-preview {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.image-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.image-action:hover {
  background: white;
  transform: scale(1.1);
}

.image-info {
  text-align: center;
}

.image-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-size {
  font-size: 0.625rem;
  color: #6b7280;
}

.upload-progress {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #374151;
  text-align: center;
}

.upload-errors {
  margin-top: 1rem;
}

.error-message {
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.error-message:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .upload-area {
    padding: 1.5rem;
  }
  
  .images-preview {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .upload-icon {
    width: 2rem;
    height: 2rem;
  }
  
  .upload-primary {
    font-size: 0.875rem;
  }
  
  .upload-secondary {
    font-size: 0.75rem;
  }
}
</style>
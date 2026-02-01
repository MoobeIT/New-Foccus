<template>
  <div class="form-field" :class="{ 'has-error': error }">
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>
    
    <div class="form-input-wrapper">
      <slot />
    </div>
    
    <div v-if="error" class="form-error">
      {{ error }}
    </div>
    
    <div v-else-if="hint" class="form-hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  label: '',
  error: '',
  hint: '',
  required: false,
});
</script>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.required-indicator {
  color: #ef4444;
  margin-left: 0.25rem;
}

.form-input-wrapper {
  position: relative;
}

.form-error {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.has-error .form-label {
  color: #ef4444;
}

/* Global styles for form inputs inside this component */
.form-field :deep(.form-input),
.form-field :deep(.form-select),
.form-field :deep(.form-textarea) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}

.form-field :deep(.form-input:focus),
.form-field :deep(.form-select:focus),
.form-field :deep(.form-textarea:focus) {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.has-error :deep(.form-input),
.has-error :deep(.form-select),
.has-error :deep(.form-textarea) {
  border-color: #ef4444;
}

.has-error :deep(.form-input:focus),
.has-error :deep(.form-select:focus),
.has-error :deep(.form-textarea:focus) {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-field :deep(.form-input:disabled),
.form-field :deep(.form-select:disabled),
.form-field :deep(.form-textarea:disabled) {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.form-field :deep(.form-textarea) {
  resize: vertical;
  min-height: 80px;
}

.form-field :deep(.form-select) {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
  appearance: none;
}
</style>
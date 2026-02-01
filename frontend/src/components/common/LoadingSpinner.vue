<template>
  <div
    class="loading-spinner"
    :class="[
      `spinner-${size}`,
      `spinner-${variant}`,
      { 'spinner-centered': centered }
    ]"
    :aria-label="label"
    role="status"
  >
    <svg
      class="spinner-svg"
      :class="{ 'animate-spin': !paused }"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="spinner-track"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="spinner-fill"
        fill="currentColor"
        d="m12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6z"
      />
    </svg>
    
    <span v-if="showLabel && label" class="spinner-label">
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white' | 'current';
  centered?: boolean;
  paused?: boolean;
  label?: string;
  showLabel?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  centered: false,
  paused: false,
  label: 'Carregando...',
  showLabel: false,
});
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner-centered {
  justify-content: center;
  width: 100%;
}

.spinner-svg {
  flex-shrink: 0;
}

/* Sizes */
.spinner-xs .spinner-svg {
  width: 1rem;
  height: 1rem;
}

.spinner-sm .spinner-svg {
  width: 1.25rem;
  height: 1.25rem;
}

.spinner-md .spinner-svg {
  width: 1.5rem;
  height: 1.5rem;
}

.spinner-lg .spinner-svg {
  width: 2rem;
  height: 2rem;
}

.spinner-xl .spinner-svg {
  width: 2.5rem;
  height: 2.5rem;
}

/* Variants */
.spinner-primary {
  color: #2563eb;
}

.spinner-secondary {
  color: #6b7280;
}

.spinner-white {
  color: white;
}

.spinner-current {
  color: currentColor;
}

/* Spinner parts */
.spinner-track {
  opacity: 0.25;
}

.spinner-fill {
  opacity: 0.75;
}

/* Animation */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Label */
.spinner-label {
  font-size: 0.875rem;
  color: currentColor;
  opacity: 0.8;
}

.spinner-xs .spinner-label {
  font-size: 0.75rem;
}

.spinner-sm .spinner-label {
  font-size: 0.8125rem;
}

.spinner-lg .spinner-label {
  font-size: 1rem;
}

.spinner-xl .spinner-label {
  font-size: 1.125rem;
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
}
</style>
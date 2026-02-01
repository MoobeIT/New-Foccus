<template>
  <span 
    class="icon" 
    :class="[`icon-${size}`, { clickable }]"
    :style="{ color }"
    v-html="iconSvg"
    :aria-label="ariaLabel"
    :role="ariaLabel ? 'img' : 'presentation'"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { icons, type IconName } from '@/components/icons'

const props = withDefaults(defineProps<{
  name: IconName
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  ariaLabel?: string
  clickable?: boolean
}>(), {
  size: 'md',
  clickable: false
})

const iconSvg = computed(() => icons[props.name] || '')
</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.icon-xs {
  width: 14px;
  height: 14px;
}

.icon-sm {
  width: 18px;
  height: 18px;
}

.icon-md {
  width: 22px;
  height: 22px;
}

.icon-lg {
  width: 28px;
  height: 28px;
}

.icon-xl {
  width: 36px;
  height: 36px;
}

.clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}

.clickable:hover {
  opacity: 0.7;
}
</style>

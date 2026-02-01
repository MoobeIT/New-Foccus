<template>
  <div ref="elementRef" class="scroll-reveal" :class="{ 'is-visible': isVisible }">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  threshold?: number
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade'
  distance?: string
  duration?: number
  once?: boolean
}>(), {
  threshold: 0.1,
  delay: 0,
  direction: 'up',
  distance: '30px',
  duration: 600,
  once: true
})

const elementRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!elementRef.value) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            isVisible.value = true
          }, props.delay)
          
          if (props.once && observer) {
            observer.unobserve(entry.target)
          }
        } else if (!props.once) {
          isVisible.value = false
        }
      })
    },
    { threshold: props.threshold }
  )

  observer.observe(elementRef.value)
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
.scroll-reveal {
  opacity: 0;
  transition-property: opacity, transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-reveal {
  transition-duration: v-bind('`${duration}ms`');
  transform: v-bind('getInitialTransform()');
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translate(0, 0);
}
</style>

<script lang="ts">
function getInitialTransform(): string {
  const props = { direction: 'up', distance: '30px' }
  switch (props.direction) {
    case 'up': return `translateY(${props.distance})`
    case 'down': return `translateY(-${props.distance})`
    case 'left': return `translateX(${props.distance})`
    case 'right': return `translateX(-${props.distance})`
    case 'fade': return 'translate(0, 0)'
    default: return `translateY(${props.distance})`
  }
}
</script>

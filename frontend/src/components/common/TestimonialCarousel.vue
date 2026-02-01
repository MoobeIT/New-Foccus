<template>
  <div class="testimonial-carousel">
    <div class="carousel-container">
      <div 
        class="carousel-track" 
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div 
          v-for="(testimonial, index) in testimonials" 
          :key="index"
          class="carousel-slide"
        >
          <div class="testimonial-card" :class="{ featured: testimonial.featured }">
            <div class="stars" aria-label="5 estrelas">★★★★★</div>
            <blockquote>{{ testimonial.text }}</blockquote>
            <div class="author">
              <div class="avatar" :style="{ background: testimonial.avatarColor }">
                {{ testimonial.initials }}
              </div>
              <div class="author-info">
                <strong>{{ testimonial.name }}</strong>
                <span>{{ testimonial.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="carousel-controls">
      <button 
        class="carousel-btn prev" 
        @click="prev" 
        :disabled="currentIndex === 0"
        aria-label="Depoimento anterior"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      <div class="carousel-dots">
        <button 
          v-for="(_, index) in testimonials" 
          :key="index"
          class="dot"
          :class="{ active: index === currentIndex }"
          @click="goTo(index)"
          :aria-label="`Ir para depoimento ${index + 1}`"
        />
      </div>

      <button 
        class="carousel-btn next" 
        @click="next" 
        :disabled="currentIndex === testimonials.length - 1"
        aria-label="Próximo depoimento"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface Testimonial {
  text: string
  name: string
  role: string
  initials: string
  avatarColor?: string
  featured?: boolean
}

const props = withDefaults(defineProps<{
  testimonials: Testimonial[]
  autoplay?: boolean
  interval?: number
}>(), {
  autoplay: true,
  interval: 5000
})

const currentIndex = ref(0)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const next = () => {
  if (currentIndex.value < props.testimonials.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = props.testimonials.length - 1
  }
}

const goTo = (index: number) => {
  currentIndex.value = index
}

const startAutoplay = () => {
  if (props.autoplay) {
    autoplayTimer = setInterval(next, props.interval)
  }
}

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})
</script>

<style scoped>
.testimonial-carousel {
  max-width: 600px;
  margin: 0 auto;
}

.carousel-container {
  overflow: hidden;
  border-radius: 20px;
}

.carousel-track {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.carousel-slide {
  flex: 0 0 100%;
  padding: 0 8px;
}

.testimonial-card {
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 20px;
  padding: 32px;
  text-align: center;
}

.testimonial-card.featured {
  border-color: #D4775C;
  background: linear-gradient(180deg, #FFF9F6 0%, #fff 100%);
}

.stars {
  color: #F59E0B;
  font-size: 20px;
  letter-spacing: 4px;
  margin-bottom: 20px;
}

blockquote {
  font-size: 18px;
  color: #4A4744;
  line-height: 1.7;
  margin: 0 0 24px;
  font-style: italic;
}

.author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.avatar {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
}

.author-info {
  text-align: left;
}

.author-info strong {
  display: block;
  font-size: 16px;
  color: #2D2A26;
  margin-bottom: 2px;
}

.author-info span {
  font-size: 14px;
  color: #9A958E;
}

.carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 24px;
}

.carousel-btn {
  width: 44px;
  height: 44px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B6560;
  transition: all 0.2s;
}

.carousel-btn:hover:not(:disabled) {
  border-color: #D4775C;
  color: #D4775C;
}

.carousel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.carousel-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: #E5E0D8;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.dot:hover {
  background: #D4D0C8;
}

.dot.active {
  background: #D4775C;
  width: 28px;
  border-radius: 5px;
}

@media (max-width: 640px) {
  .testimonial-card {
    padding: 24px 20px;
  }

  blockquote {
    font-size: 16px;
  }
}
</style>

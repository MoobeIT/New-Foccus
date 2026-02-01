<template>
  <div class="checkout-stepper">
    <div class="stepper-container">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step"
        :class="{
          'step--active': currentStep === index,
          'step--completed': currentStep > index,
          'step--disabled': currentStep < index
        }"
        @click="goToStep(index)"
      >
        <div class="step__indicator">
          <span v-if="currentStep > index" class="step__check">✓</span>
          <span v-else class="step__number">{{ index + 1 }}</span>
        </div>
        <div class="step__content">
          <span class="step__title">{{ step.title }}</span>
          <span class="step__subtitle">{{ step.subtitle }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="step__connector" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

interface Step {
  id: string;
  title: string;
  subtitle: string;
}

const props = defineProps<{
  steps: Step[];
  currentStep: number;
  allowNavigation?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:currentStep', step: number): void;
}>();

const goToStep = (index: number) => {
  if (props.allowNavigation && index <= props.currentStep) {
    emit('update:currentStep', index);
  }
};
</script>

<style scoped>
.checkout-stepper {
  padding: 1rem 0;
  margin-bottom: 2rem;
}

.stepper-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  cursor: default;
}

.step--completed,
.step--active {
  cursor: pointer;
}

.step__indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  background: #e5e7eb;
  color: #6b7280;
  transition: all 0.3s ease;
  z-index: 1;
}

.step--active .step__indicator {
  background: #3b82f6;
  color: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.step--completed .step__indicator {
  background: #10b981;
  color: white;
}

.step__check {
  font-size: 1.2rem;
}

.step__content {
  margin-top: 0.75rem;
  text-align: center;
}

.step__title {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
}

.step--disabled .step__title {
  color: #9ca3af;
}

.step__subtitle {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.step__connector {
  position: absolute;
  top: 20px;
  left: calc(50% + 25px);
  width: calc(100% - 50px);
  height: 2px;
  background: #e5e7eb;
}

.step--completed .step__connector {
  background: #10b981;
}

@media (max-width: 640px) {
  .step__content {
    display: none;
  }
  
  .step__connector {
    left: calc(50% + 20px);
    width: calc(100% - 40px);
  }
}
</style>

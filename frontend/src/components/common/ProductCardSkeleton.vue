<template>
  <div class="product-card-skeleton">
    <div class="skeleton-image animate"></div>
    <div class="skeleton-content">
      <div class="skeleton-category animate"></div>
      <div class="skeleton-title animate"></div>
      <div class="skeleton-description animate"></div>
      <div class="skeleton-description short animate"></div>
      <div class="skeleton-footer">
        <div class="skeleton-price animate"></div>
        <div class="skeleton-button animate"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card-skeleton {
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 16px;
  overflow: hidden;
}

.skeleton-image {
  height: 160px;
  background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.skeleton-content {
  padding: 20px;
}

.skeleton-category {
  height: 14px;
  width: 80px;
  border-radius: 4px;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.skeleton-title {
  height: 20px;
  width: 70%;
  border-radius: 4px;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.skeleton-description {
  height: 14px;
  width: 100%;
  border-radius: 4px;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.skeleton-description.short {
  width: 60%;
  margin-bottom: 16px;
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-price {
  height: 28px;
  width: 80px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.skeleton-button {
  height: 36px;
  width: 100px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.animate {
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>

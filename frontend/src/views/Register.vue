<template>
  <div class="register-page">
    <div class="register-left">
      <div class="left-inner">
        <router-link to="/" class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </router-link>
        <h1>Crie sua conta</h1>
        <p>Comece a criar álbuns profissionais para seus clientes.</p>
        <div class="benefits">
          <div class="benefit"><span>✓</span> Grátis para começar</div>
          <div class="benefit"><span>✓</span> +50 templates exclusivos</div>
          <div class="benefit"><span>✓</span> Impressão premium</div>
          <div class="benefit"><span>✓</span> Suporte especializado</div>
        </div>
      </div>
    </div>
    <div class="register-right">
      <div class="form-wrap">
        <h2>Criar conta</h2>
        <p class="sub">Já tem conta? <router-link to="/login">Fazer login</router-link></p>
        <form @submit.prevent="handleRegister">
          <div class="field">
            <label>Nome completo</label>
            <input v-model="form.name" type="text" placeholder="Seu nome" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="form.email" type="email" placeholder="seu@email.com" required />
          </div>
          <div class="field">
            <label>Senha</label>
            <input v-model="form.password" type="password" placeholder="Mínimo 8 caracteres" required />
          </div>
          <div class="field">
            <label>Confirmar senha</label>
            <input v-model="form.confirmPassword" type="password" placeholder="Confirme sua senha" required />
          </div>
          <label class="terms">
            <input type="checkbox" v-model="form.acceptTerms" required />
            <span>Aceito os <a href="#">termos de uso</a> e <a href="#">política de privacidade</a></span>
          </label>
          <div v-if="authError" class="err">{{ authError }}</div>
          <button type="submit" class="btn-submit" :disabled="isLoading">
            <span v-if="!isLoading">Criar conta</span>
            <span v-else class="spin"></span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const router = useRouter()
const authStore = useAuthStore()
const form = ref({ name: '', email: '', password: '', confirmPassword: '', acceptTerms: false })
const isLoading = computed(() => authStore.isLoading)
const authError = computed(() => authStore.error)
const handleRegister = async () => {
  if (form.value.password !== form.value.confirmPassword) return
  const ok = await authStore.register({ name: form.value.name, email: form.value.email, password: form.value.password })
  if (ok) router.push('/')
}
onMounted(() => { if (authStore.isAuthenticated) router.push(authStore.isAdmin ? '/admin' : '/') })
</script>

<style scoped>
.register-page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
.register-left { background: #F7F4EE; padding: 48px; display: flex; align-items: center; }
.left-inner { max-width: 400px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #2D2A26; margin-bottom: 48px; }
.brand-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 17px; }
.brand span { font-weight: 600; font-size: 17px; }
.register-left h1 { font-size: 32px; font-weight: 700; color: #2D2A26; margin-bottom: 12px; }
.register-left > .left-inner > p { font-size: 16px; color: #6B6560; line-height: 1.6; margin-bottom: 32px; }
.benefits { display: flex; flex-direction: column; gap: 12px; }
.benefit { display: flex; align-items: center; gap: 12px; font-size: 15px; color: #4A4744; }
.benefit span { color: #D4775C; font-weight: 600; }
.register-right { background: #FDFBF7; display: flex; align-items: center; justify-content: center; padding: 48px; }
.form-wrap { width: 100%; max-width: 380px; }
.form-wrap h2 { font-size: 26px; font-weight: 700; color: #2D2A26; margin-bottom: 8px; }
.sub { font-size: 14px; color: #6B6560; margin-bottom: 32px; }
.sub a { color: #D4775C; text-decoration: none; font-weight: 500; }
.sub a:hover { text-decoration: underline; }
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 14px; font-weight: 500; color: #4A4744; margin-bottom: 8px; }
.field input { width: 100%; padding: 12px 16px; background: #fff; border: 1px solid #E5E0D8; border-radius: 10px; font-size: 15px; color: #2D2A26; transition: 0.2s; }
.field input:focus { outline: none; border-color: #D4775C; box-shadow: 0 0 0 3px rgba(212,119,92,0.1); }
.field input::placeholder { color: #A8A29E; }
.terms { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #6B6560; margin-bottom: 24px; cursor: pointer; }
.terms input { accent-color: #D4775C; margin-top: 2px; }
.terms a { color: #D4775C; text-decoration: none; }
.terms a:hover { text-decoration: underline; }
.err { padding: 12px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; color: #DC2626; font-size: 14px; margin-bottom: 20px; }
.btn-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,119,92,0.35); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.spin { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) { .register-page { grid-template-columns: 1fr; } .register-left { display: none; } }
</style>

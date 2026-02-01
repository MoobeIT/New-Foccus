<template>
  <div class="login-page">
    <div class="login-left">
      <div class="left-inner">
        <router-link to="/" class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </router-link>
        <h1>Bem-vindo de volta</h1>
        <p>Acesse sua conta e continue criando álbuns incríveis.</p>
        <div class="features">
          <div class="f-item"><span>📸</span> +50 templates exclusivos</div>
          <div class="f-item"><span>⚡</span> Editor drag & drop</div>
          <div class="f-item"><span>🎨</span> Impressão premium</div>
        </div>
        <div class="quote">
          <p>"A Foccus revolucionou meu fluxo de trabalho!"</p>
          <div class="q-author"><div class="q-av">MR</div><div><strong>Marina Rodrigues</strong><span>Fotógrafa • SP</span></div></div>
        </div>
      </div>
    </div>
    <div class="login-right">
      <div class="form-wrap">
        <h2>Entrar</h2>
        <p class="sub">Não tem conta? <router-link to="/register">Criar conta gratuita</router-link></p>
        <form @submit.prevent="handleLogin">
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="seu@email.com" required />
          </div>
          <div class="field">
            <label>Senha</label>
            <div class="pass-wrap">
              <input v-model="password" :type="showPass ? 'text' : 'password'" placeholder="••••••••" required />
              <button type="button" class="eye" @click="showPass = !showPass">{{ showPass ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="opts">
            <label class="chk"><input type="checkbox" v-model="remember" /><span>Lembrar</span></label>
            <a href="#">Esqueceu a senha?</a>
          </div>
          <div v-if="error" class="err">{{ error }}</div>
          <button type="submit" class="btn-submit" :disabled="isLoading">
            <span v-if="!isLoading">Entrar</span>
            <span v-else class="spin"></span>
          </button>
        </form>
        <div class="demo">
          <p>🔑 Contas de teste:</p>
          <code>admin@fotolivros.com / admin123</code><br/>
          <code>fotografo@teste.com / foto123</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const router = useRouter()
const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const showPass = ref(false)
const remember = ref(false)
const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)
const handleLogin = async () => {
  const ok = await authStore.login({ email: email.value, password: password.value })
  if (ok) router.push(authStore.defaultRoute)
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }

/* Left */
.login-left { background: #F7F4EE; padding: 48px; display: flex; align-items: center; }
.left-inner { max-width: 400px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #2D2A26; margin-bottom: 48px; }
.brand-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 17px; }
.brand span { font-weight: 600; font-size: 17px; }
.login-left h1 { font-size: 32px; font-weight: 700; color: #2D2A26; margin-bottom: 12px; letter-spacing: -0.02em; }
.login-left > .left-inner > p { font-size: 16px; color: #6B6560; line-height: 1.6; margin-bottom: 32px; }
.features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }
.f-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: #fff; border: 1px solid #EBE7E0; border-radius: 10px; font-size: 14px; color: #4A4744; }
.f-item span { font-size: 18px; }
.quote { padding: 20px; background: #fff; border: 1px solid #EBE7E0; border-radius: 14px; }
.quote > p { font-size: 15px; color: #4A4744; font-style: italic; margin-bottom: 16px; line-height: 1.6; }
.q-author { display: flex; align-items: center; gap: 12px; }
.q-av { width: 40px; height: 40px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 14px; }
.q-author strong { display: block; font-size: 14px; color: #2D2A26; }
.q-author span { font-size: 13px; color: #9A958E; }

/* Right */
.login-right { background: #FDFBF7; display: flex; align-items: center; justify-content: center; padding: 48px; }
.form-wrap { width: 100%; max-width: 360px; }
.form-wrap h2 { font-size: 26px; font-weight: 700; color: #2D2A26; margin-bottom: 8px; }
.sub { font-size: 14px; color: #6B6560; margin-bottom: 32px; }
.sub a { color: #D4775C; text-decoration: none; font-weight: 500; }
.sub a:hover { text-decoration: underline; }
.field { margin-bottom: 20px; }
.field label { display: block; font-size: 14px; font-weight: 500; color: #4A4744; margin-bottom: 8px; }
.field input { width: 100%; padding: 14px 16px; background: #fff; border: 1px solid #E5E0D8; border-radius: 10px; font-size: 15px; color: #2D2A26; transition: 0.2s; }
.field input:focus { outline: none; border-color: #D4775C; box-shadow: 0 0 0 3px rgba(212,119,92,0.1); }
.field input::placeholder { color: #A8A29E; }
.pass-wrap { position: relative; }
.pass-wrap input { padding-right: 48px; }
.eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; }
.opts { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.chk { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #6B6560; cursor: pointer; }
.chk input { accent-color: #D4775C; }
.opts a { font-size: 14px; color: #D4775C; text-decoration: none; }
.opts a:hover { text-decoration: underline; }
.err { padding: 12px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; color: #DC2626; font-size: 14px; margin-bottom: 20px; }
.btn-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,119,92,0.35); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.spin { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.demo { margin-top: 28px; padding: 16px; background: #FEF3E2; border: 1px solid #FDE68A; border-radius: 10px; text-align: center; }
.demo p { font-size: 14px; color: #92400E; margin-bottom: 6px; }
.demo code { font-size: 13px; color: #B45309; }

@media (max-width: 900px) {
  .login-page { grid-template-columns: 1fr; }
  .login-left { display: none; }
}
</style>

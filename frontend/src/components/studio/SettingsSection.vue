<template>
  <div class="settings-section">
    <div class="section-header">
      <h2>⚙️ Configurações</h2>
      <p>Personalize seu estúdio</p>
    </div>

    <div class="settings-grid">
      <!-- Profile -->
      <div class="settings-card">
        <h3>👤 Perfil</h3>
        <div class="form-group">
          <label>Nome do Estúdio</label>
          <input v-model="settings.studioName" type="text" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="settings.email" type="email" />
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input v-model="settings.phone" type="tel" />
        </div>
        <button class="btn-save">Salvar Alterações</button>
      </div>

      <!-- Notifications -->
      <div class="settings-card">
        <h3>🔔 Notificações</h3>
        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="settings.emailNotifications" />
            <span>Notificações por email</span>
          </label>
        </div>
        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="settings.approvalNotifications" />
            <span>Alertas de aprovação</span>
          </label>
        </div>
        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="settings.orderNotifications" />
            <span>Atualizações de pedidos</span>
          </label>
        </div>
      </div>

      <!-- Branding -->
      <div class="settings-card">
        <h3>🎨 Marca</h3>
        <div class="form-group">
          <label>Logo</label>
          <div class="logo-upload">
            <span>📷</span>
            <p>Clique para enviar</p>
          </div>
        </div>
        <div class="form-group">
          <label>Cor Principal</label>
          <input v-model="settings.primaryColor" type="color" />
        </div>
      </div>

      <!-- Approval Page -->
      <div class="settings-card">
        <h3>✅ Página de Aprovação</h3>
        <div class="form-group">
          <label>Mensagem de Boas-vindas</label>
          <textarea v-model="settings.welcomeMessage" rows="3"></textarea>
        </div>
        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="settings.allowComments" />
            <span>Permitir comentários do cliente</span>
          </label>
        </div>
        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="settings.showPrices" />
            <span>Mostrar preços na aprovação</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const settings = reactive({
  studioName: 'Meu Estúdio Fotográfico',
  email: 'contato@meuestudio.com',
  phone: '(11) 99999-9999',
  emailNotifications: true,
  approvalNotifications: true,
  orderNotifications: true,
  primaryColor: '#D4775C',
  welcomeMessage: 'Olá! Seu álbum está pronto para aprovação. Confira cada página com carinho!',
  allowComments: true,
  showPrices: false
})
</script>

<style scoped>
.section-header { margin-bottom: 24px; }
.section-header h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.section-header p { margin: 0; color: #64748b; }

.settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.settings-card { background: white; padding: 24px; border-radius: 12px; }
.settings-card h3 { margin: 0 0 20px 0; font-size: 1.1rem; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; color: #64748b; }
.form-group input[type="text"], .form-group input[type="email"], .form-group input[type="tel"], .form-group textarea {
  width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;
}
.form-group input[type="color"] { width: 60px; height: 40px; border: none; cursor: pointer; }

.logo-upload { border: 2px dashed #e2e8f0; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; }
.logo-upload span { font-size: 2rem; }
.logo-upload p { margin: 8px 0 0 0; color: #94a3b8; font-size: 0.85rem; }

.toggle-group { margin-bottom: 12px; }
.toggle-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle-group input { width: 18px; height: 18px; }

.btn-save { width: 100%; padding: 12px; background: linear-gradient(135deg, #D4775C, #E8956F); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 8px; }
</style>

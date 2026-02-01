<template>
  <div class="studio-settings">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <router-link to="/studio" class="back-link">← Voltar</router-link>
        <h1>⚙️ Configurações</h1>
      </div>
    </header>

    <div class="settings-container">
      <!-- Sidebar -->
      <nav class="settings-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['nav-item', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <span class="nav-icon">{{ tab.icon }}</span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Content -->
      <div class="settings-content">
        <!-- Profile -->
        <section v-if="activeTab === 'profile'" class="settings-section">
          <h2>👤 Meu Perfil</h2>
          <form @submit.prevent="saveProfile">
            <div class="form-row">
              <div class="form-group">
                <label>Nome</label>
                <input v-model="profile.name" type="text" required />
              </div>
              <div class="form-group">
                <label>E-mail</label>
                <input v-model="profile.email" type="email" required disabled />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Telefone</label>
                <input v-model="profile.phone" type="tel" placeholder="(11) 99999-9999" />
              </div>
              <div class="form-group">
                <label>WhatsApp</label>
                <input v-model="profile.whatsapp" type="tel" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div class="form-group">
              <label>Nome do Estúdio</label>
              <input v-model="profile.studioName" type="text" placeholder="Ex: Studio Foccus" />
            </div>
            <div class="form-group">
              <label>Bio / Descrição</label>
              <textarea v-model="profile.bio" rows="3" placeholder="Conte um pouco sobre você..."></textarea>
            </div>
            <button type="submit" class="btn-primary">💾 Salvar Alterações</button>
          </form>
        </section>

        <!-- Security -->
        <section v-if="activeTab === 'security'" class="settings-section">
          <h2>🔒 Segurança</h2>
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label>Senha Atual</label>
              <input v-model="passwords.current" type="password" required />
            </div>
            <div class="form-group">
              <label>Nova Senha</label>
              <input v-model="passwords.new" type="password" required minlength="8" />
            </div>
            <div class="form-group">
              <label>Confirmar Nova Senha</label>
              <input v-model="passwords.confirm" type="password" required />
            </div>
            <button type="submit" class="btn-primary">🔐 Alterar Senha</button>
          </form>
        </section>

        <!-- Notifications -->
        <section v-if="activeTab === 'notifications'" class="settings-section">
          <h2>🔔 Notificações</h2>
          <div class="notification-options">
            <label class="toggle-option">
              <input type="checkbox" v-model="notifications.email" />
              <span class="toggle-label">
                <strong>E-mail</strong>
                <small>Receber notificações por e-mail</small>
              </span>
            </label>
            <label class="toggle-option">
              <input type="checkbox" v-model="notifications.approval" />
              <span class="toggle-label">
                <strong>Aprovações</strong>
                <small>Notificar quando cliente aprovar projeto</small>
              </span>
            </label>
            <label class="toggle-option">
              <input type="checkbox" v-model="notifications.orders" />
              <span class="toggle-label">
                <strong>Pedidos</strong>
                <small>Notificar sobre atualizações de pedidos</small>
              </span>
            </label>
            <label class="toggle-option">
              <input type="checkbox" v-model="notifications.marketing" />
              <span class="toggle-label">
                <strong>Novidades</strong>
                <small>Receber novidades e promoções</small>
              </span>
            </label>
          </div>
          <button class="btn-primary" @click="saveNotifications">💾 Salvar Preferências</button>
        </section>

        <!-- Branding -->
        <section v-if="activeTab === 'branding'" class="settings-section">
          <h2>🎨 Personalização</h2>
          <p class="section-description">Personalize a aparência dos links de aprovação enviados aos seus clientes.</p>
          
          <div class="form-group">
            <label>Logo do Estúdio</label>
            <div class="logo-upload">
              <div class="logo-preview">
                <img v-if="branding.logo" :src="branding.logo" alt="Logo" />
                <span v-else>📷</span>
              </div>
              <button type="button" class="btn-secondary">📤 Enviar Logo</button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Cor Principal</label>
            <div class="color-picker">
              <input type="color" v-model="branding.primaryColor" />
              <input type="text" v-model="branding.primaryColor" placeholder="#4f46e5" />
            </div>
          </div>
          
          <div class="form-group">
            <label>Mensagem de Boas-vindas</label>
            <textarea v-model="branding.welcomeMessage" rows="3" placeholder="Olá! Seu álbum está pronto para aprovação..."></textarea>
          </div>
          
          <button class="btn-primary" @click="saveBranding">💾 Salvar Personalização</button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const activeTab = ref('profile');

const tabs = [
  { id: 'profile', icon: '👤', label: 'Meu Perfil' },
  { id: 'security', icon: '🔒', label: 'Segurança' },
  { id: 'notifications', icon: '🔔', label: 'Notificações' },
  { id: 'branding', icon: '🎨', label: 'Personalização' }
];

const profile = ref({
  name: authStore.userName || '',
  email: authStore.userEmail || '',
  phone: '',
  whatsapp: '',
  studioName: '',
  bio: ''
});

const passwords = ref({
  current: '',
  new: '',
  confirm: ''
});

const notifications = ref({
  email: true,
  approval: true,
  orders: true,
  marketing: false
});

const branding = ref({
  logo: null as string | null,
  primaryColor: '#4f46e5',
  welcomeMessage: ''
});

const saveProfile = () => {
  // TODO: Chamar API
  alert('Perfil salvo com sucesso!');
};

const changePassword = () => {
  if (passwords.value.new !== passwords.value.confirm) {
    alert('As senhas não coincidem!');
    return;
  }
  // TODO: Chamar API
  alert('Senha alterada com sucesso!');
  passwords.value = { current: '', new: '', confirm: '' };
};

const saveNotifications = () => {
  // TODO: Chamar API
  alert('Preferências salvas!');
};

const saveBranding = () => {
  // TODO: Chamar API
  alert('Personalização salva!');
};
</script>

<style scoped>
.studio-settings {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  color: #666;
  text-decoration: none;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.settings-container {
  display: flex;
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 2rem;
  gap: 2rem;
}

.settings-nav {
  width: 240px;
  background: white;
  border-radius: 12px;
  padding: 1rem;
  height: fit-content;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  color: #666;
}

.nav-item:hover {
  background: #f5f5f5;
}

.nav-item.active {
  background: #4f46e5;
  color: white;
}

.nav-icon {
  font-size: 1.1rem;
}

.settings-content {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.settings-section h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
}

.section-description {
  color: #666;
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #999;
}

.form-group textarea {
  resize: vertical;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.notification-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.toggle-option {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
}

.toggle-option input {
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.toggle-label {
  display: flex;
  flex-direction: column;
}

.toggle-label strong {
  font-size: 0.95rem;
}

.toggle-label small {
  color: #666;
  font-size: 0.85rem;
}

.logo-upload {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-preview {
  width: 80px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  overflow: hidden;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.color-picker {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-picker input[type="color"] {
  width: 50px;
  height: 40px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.color-picker input[type="text"] {
  width: 120px;
}

@media (max-width: 768px) {
  .settings-container {
    flex-direction: column;
  }
  
  .settings-nav {
    width: 100%;
    display: flex;
    overflow-x: auto;
    gap: 0.5rem;
  }
  
  .nav-item {
    flex-shrink: 0;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

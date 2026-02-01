<template>
  <div class="settings-page">
    <div class="section-header">
      <div class="section-title">
        <h2>Configurações do Sistema</h2>
        <p>Configure as opções do sistema</p>
      </div>
    </div>

    <div class="settings-grid">
      <div class="setting-card" @click="activeTab = 'general'">
        <div class="setting-icon">⚙️</div>
        <h3>Geral</h3>
        <p>Nome da loja, logo, informações básicas</p>
      </div>
      <div class="setting-card" @click="activeTab = 'payments'">
        <div class="setting-icon">💳</div>
        <h3>Pagamentos</h3>
        <p>Gateways e métodos de pagamento</p>
      </div>
      <div class="setting-card" @click="activeTab = 'shipping'">
        <div class="setting-icon">🚚</div>
        <h3>Envio</h3>
        <p>Frete, transportadoras, prazos</p>
      </div>
      <div class="setting-card" @click="activeTab = 'notifications'">
        <div class="setting-icon">🔔</div>
        <h3>Notificações</h3>
        <p>Email, SMS, push notifications</p>
      </div>
      <div class="setting-card" @click="activeTab = 'security'">
        <div class="setting-icon">🔐</div>
        <h3>Segurança</h3>
        <p>Autenticação, permissões, logs</p>
      </div>
      <div class="setting-card" @click="activeTab = 'integrations'">
        <div class="setting-icon">🔗</div>
        <h3>Integrações</h3>
        <p>APIs externas, webhooks</p>
      </div>
    </div>

    <!-- Settings Panel -->
    <div v-if="activeTab" class="settings-panel">
      <div class="panel-header">
        <button class="back-btn" @click="activeTab = ''">← Voltar</button>
        <h3>{{ tabTitles[activeTab] }}</h3>
      </div>

      <!-- General Settings -->
      <div v-if="activeTab === 'general'" class="panel-content">
        <div class="form-group">
          <label>Nome da Loja</label>
          <input type="text" v-model="settings.storeName" />
        </div>
        <div class="form-group">
          <label>Email de Contato</label>
          <input type="email" v-model="settings.contactEmail" />
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="text" v-model="settings.phone" />
        </div>
        <div class="form-group">
          <label>Endereço</label>
          <textarea v-model="settings.address" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <textarea v-model="settings.description" rows="3"></textarea>
        </div>
      </div>

      <!-- Payment Settings -->
      <div v-if="activeTab === 'payments'" class="panel-content">
        <div class="toggle-group">
          <div class="toggle-item">
            <div class="toggle-info"><h4>PIX</h4><p>Pagamento instantâneo</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.pixEnabled" /><span class="slider"></span></label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info"><h4>Cartão de Crédito</h4><p>Até 12x sem juros</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.creditCardEnabled" /><span class="slider"></span></label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info"><h4>Boleto Bancário</h4><p>Vencimento em 3 dias</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.boletoEnabled" /><span class="slider"></span></label>
          </div>
        </div>
      </div>

      <!-- Shipping Settings -->
      <div v-if="activeTab === 'shipping'" class="panel-content">
        <div class="form-group">
          <label>Frete Grátis acima de (R$)</label>
          <input type="number" v-model="settings.freeShippingMinimum" />
        </div>
        <div class="form-group">
          <label>Prazo de Produção (dias)</label>
          <input type="number" v-model="settings.productionDays" />
        </div>
        <div class="toggle-group">
          <div class="toggle-item">
            <div class="toggle-info"><h4>Correios - PAC</h4><p>Entrega econômica</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.pacEnabled" /><span class="slider"></span></label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info"><h4>Correios - SEDEX</h4><p>Entrega expressa</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.sedexEnabled" /><span class="slider"></span></label>
          </div>
        </div>
      </div>

      <!-- Notifications Settings -->
      <div v-if="activeTab === 'notifications'" class="panel-content">
        <div class="toggle-group">
          <div class="toggle-item">
            <div class="toggle-info"><h4>Email de Novo Pedido</h4><p>Notificar admin sobre novos pedidos</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.emailNewOrder" /><span class="slider"></span></label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info"><h4>Email de Status</h4><p>Notificar cliente sobre mudanças</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.emailStatusChange" /><span class="slider"></span></label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info"><h4>WhatsApp</h4><p>Enviar notificações via WhatsApp</p></div>
            <label class="toggle"><input type="checkbox" v-model="settings.whatsappEnabled" /><span class="slider"></span></label>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn-secondary" @click="activeTab = ''">Cancelar</button>
        <button class="btn-primary" @click="saveSettings">Salvar Alterações</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'

const activeTab = ref('')
const tabTitles: Record<string, string> = { general: 'Configurações Gerais', payments: 'Pagamentos', shipping: 'Envio', notifications: 'Notificações', security: 'Segurança', integrations: 'Integrações' }

const settings = ref({
  storeName: 'Foccus Álbuns',
  contactEmail: 'contato@foccusalbuns.com.br',
  phone: '(11) 3456-7890',
  address: 'São Paulo, SP - Brasil',
  description: 'Plataforma completa para fotógrafos criarem álbuns profissionais.',
  pixEnabled: true,
  creditCardEnabled: true,
  boletoEnabled: true,
  freeShippingMinimum: 300,
  productionDays: 7,
  pacEnabled: true,
  sedexEnabled: true,
  emailNewOrder: true,
  emailStatusChange: true,
  whatsappEnabled: false,
})

const fetchSettings = async () => {
  try {
    const res = await api.get('/api/v1/admin/settings')
    if (res.data) settings.value = { ...settings.value, ...res.data }
  } catch {}
}

const saveSettings = async () => {
  try {
    await api.put('/api/v1/admin/settings', settings.value)
    alert('Configurações salvas!')
    activeTab.value = ''
  } catch { alert('Erro ao salvar configurações') }
}

onMounted(fetchSettings)
</script>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: 24px; }
.section-header { margin-bottom: 8px; }
.section-title h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.section-title p { font-size: 0.85rem; color: #64748b; margin: 0; }
.settings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.setting-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
.setting-card:hover { border-color: #D4775C; transform: translateY(-2px); }
.setting-icon { font-size: 2rem; margin-bottom: 12px; }
.setting-card h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; }
.setting-card p { font-size: 0.85rem; color: #64748b; margin: 0; }
.settings-panel { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.panel-header { display: flex; align-items: center; gap: 16px; padding: 20px; border-bottom: 1px solid #e2e8f0; }
.back-btn { background: none; border: none; color: #D4775C; font-size: 0.9rem; cursor: pointer; }
.panel-header h3 { margin: 0; font-size: 1.1rem; }
.panel-content { padding: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 0.8rem; font-weight: 500; color: #64748b; margin-bottom: 8px; }
.form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
.toggle-group { display: flex; flex-direction: column; gap: 16px; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f8fafc; border-radius: 8px; }
.toggle-info h4 { margin: 0 0 4px 0; font-size: 0.9rem; color: #1e293b; }
.toggle-info p { margin: 0; font-size: 0.8rem; color: #64748b; }
.toggle { position: relative; width: 48px; height: 26px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 26px; transition: 0.3s; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .slider { background: #D4775C; }
.toggle input:checked + .slider:before { transform: translateX(22px); }
.panel-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid #e2e8f0; }
.btn-primary { padding: 10px 20px; background: #D4775C; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
.btn-secondary { padding: 10px 20px; background: #f1f5f9; color: #1e293b; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
@media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }
</style>

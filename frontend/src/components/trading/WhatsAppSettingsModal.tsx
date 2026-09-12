import React, { useState, useEffect } from 'react';
import { api } from '../../api';

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({ isOpen, onClose }) => {
  const [notifyNumbers, setNotifyNumbers] = useState('18494577463');
  const [instance, setInstance] = useState('renace');
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('https://evoapi.renace.tech');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/analysis/whatsapp-settings');
      if (res.data?.config) {
        setNotifyNumbers(res.data.config.notify_numbers || '18494577463');
        setInstance(res.data.config.instance || 'renace');
        setApiUrl(res.data.config.url || 'https://evoapi.renace.tech');
        setHasApiKey(res.data.config.has_api_key);
      }
      if (res.data?.instance_status) {
        setInstanceStatus(res.data.instance_status);
      }
    } catch {
      showToast('No se pudo cargar la configuración de WhatsApp.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/analysis/whatsapp-settings', {
        notify_numbers: notifyNumbers.trim(),
        instance: instance.trim(),
        url: apiUrl.trim(),
        api_key: apiKey.trim() || undefined,
      });

      if (res.data?.config) {
        setHasApiKey(res.data.config.has_api_key);
        setInstanceStatus(res.data.instance_status);
        showToast('✅ Ajustes de WhatsApp guardados exitosamente.', 'success');
      }
    } catch {
      showToast('❌ Error al guardar los ajustes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestMessage = async () => {
    showToast('Enviando mensaje de prueba a WhatsApp...', 'info');
    try {
      const res = await api.post('/analysis/whatsapp-notify', {
        type: 'test',
        recipient: notifyNumbers.split(',')[0].trim(),
      });
      if (res.data?.status === 'sent' || res.data?.status === 'sent_fallback') {
        showToast(`✅ Mensaje enviado a ${res.data.recipient}! Revisa tu WhatsApp.`, 'success');
      } else if (res.data?.status === 'simulated') {
        showToast(`⚠️ Modo Simulado: Guarda tu API Key para enviar en vivo.`, 'info');
      } else {
        showToast(`❌ Error: ${res.data?.error || 'No se pudo enviar'}`, 'error');
      }
    } catch {
      showToast('❌ Error al conectar con el servidor para la prueba.', 'error');
    }
  };

  const handleMarketPulse = async () => {
    showToast('Generando y enviando Pulso de Mercado...', 'info');
    try {
      const res = await api.post('/analysis/market-pulse-notify', {
        recipient: notifyNumbers.split(',')[0].trim(),
        force: true,
      });
      if (res.data?.status === 'sent') {
        showToast('📈 Resumen de Mercado enviado a tu WhatsApp!', 'success');
      } else {
        showToast('❌ Error al enviar el pulso de mercado.', 'error');
      }
    } catch {
      showToast('❌ Error al solicitar el pulso de mercado.', 'error');
    }
  };

  const checkStatusOnly = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/analysis/whatsapp-instance-status');
      setInstanceStatus(res.data);
      if (res.data?.is_connected) {
        showToast('🟢 Instancia conectada y lista para recibir señales!', 'success');
      } else {
        showToast(`Estado: ${res.data?.message || 'Desconectado'}`, 'info');
      }
    } catch {
      showToast('No se pudo verificar el estado de la instancia.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="topstep-modal-card whatsapp-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-topstep">
          <div className="modal-title-wrap">
            <span className="modal-icon-glow">📲</span>
            <div>
              <h3>Ajustes de Notificaciones WhatsApp</h3>
              <p className="modal-subtitle">Configuración de Evolution API & Señales de Mercado Real</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        {toastMessage && (
          <div className={`modal-toast-banner ${toastMessage.type}`}>
            {toastMessage.text}
          </div>
        )}

        <form onSubmit={handleSave} className="modal-form-body">
          {/* Instance Status Badge */}
          <div className="instance-status-box">
            <div className="status-indicator-left">
              <span className={`status-dot-pulse ${instanceStatus?.is_connected ? 'active' : 'warn'}`} />
              <div className="status-info-text">
                <span className="status-label">Estado de Evolution API:</span>
                <strong className={`status-val ${instanceStatus?.is_connected ? 'pos' : 'warn'}`}>
                  {instanceStatus?.message || 'Verificando estado...'}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="refresh-status-btn"
              onClick={checkStatusOnly}
              disabled={isLoading}
              title="Comprobar Conexión"
            >
              🔄 {isLoading ? 'Verificando...' : 'Probar Conexión'}
            </button>
          </div>

          {/* WhatsApp Phone Numbers */}
          <div className="form-group-custom">
            <label>
              <span>📱 Número(s) de WhatsApp para Alertas</span>
              <span className="input-hint">Formato internacional (ej. 18494577463)</span>
            </label>
            <input
              type="text"
              className="topstep-input"
              value={notifyNumbers}
              onChange={(e) => setNotifyNumbers(e.target.value)}
              placeholder="18494577463"
              required
            />
            <p className="field-help-note">
              Recibirás alertas de oportunidades alcistas de NQ/BTC y avisos cuando la cuenta llegue al tope diario.
            </p>
          </div>

          {/* Instance Name & API URL */}
          <div className="form-row-two-col">
            <div className="form-group-custom">
              <label>Nombre de Instancia</label>
              <input
                type="text"
                className="topstep-input"
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                placeholder="renace"
                required
              />
            </div>
            <div className="form-group-custom">
              <label>URL Evolution API</label>
              <input
                type="url"
                className="topstep-input"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://evoapi.renace.tech"
                required
              />
            </div>
          </div>

          {/* API Key */}
          <div className="form-group-custom">
            <label>
              <span>Evolution API Key {hasApiKey && <span className="key-configured-tag">● Configurada</span>}</span>
              <span className="input-hint">Global API Key de tu servidor Evolution</span>
            </label>
            <input
              type="password"
              className="topstep-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? '••••••••••••••••••••••••' : 'Ingresa tu API Key de Evolution'}
            />
          </div>

          {/* Quick Actions & Triggers */}
          <div className="modal-quick-actions-bar">
            <button
              type="button"
              className="quick-action-btn pulse-btn"
              onClick={handleMarketPulse}
              title="Enviar resumen completo del mercado a WhatsApp"
            >
              📊 Enviar Pulso de Mercado
            </button>
            <button
              type="button"
              className="quick-action-btn test-btn"
              onClick={handleTestMessage}
              title="Enviar mensaje de prueba"
            >
              📲 Enviar Prueba
            </button>
          </div>

          {/* Modal Footer Buttons */}
          <div className="modal-footer-actions">
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save-modal" disabled={isSaving}>
              {isSaving ? 'Guardando...' : '💾 Guardar Ajustes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

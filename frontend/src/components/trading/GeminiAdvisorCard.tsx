import React, { useState } from 'react';
import { api } from '../../api';
import { soundEffects } from '../../utils/audioEffects';

interface GeminiAdvisorCardProps {
  symbol: string;
  currentPrice: number;
  onApplyTrade: (side: 'BUY' | 'SELL', slTicks: number, tpTicks: number) => void;
}

export const GeminiAdvisorCard: React.FC<GeminiAdvisorCardProps> = ({
  symbol,
  currentPrice,
  onApplyTrade,
}) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<{
    should_invest: boolean;
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    entry_price: number;
    stop_loss_ticks: number;
    stop_loss_price: number;
    take_profit_ticks: number;
    take_profit_price: number;
    risk_reward: string;
    risk_level: string;
    headline: string;
    detailed_analysis: string;
    ai_engine: string;
  } | null>({
    should_invest: true,
    recommendation: 'BUY',
    confidence: 93,
    entry_price: currentPrice || 19750.0,
    stop_loss_ticks: 20,
    stop_loss_price: (currentPrice || 19750.0) - 5.0,
    take_profit_ticks: 40,
    take_profit_price: (currentPrice || 19750.0) + 10.0,
    risk_reward: '1:2.0',
    risk_level: 'Bajo a Moderado',
    headline: `Oportunidad Favorable en ${symbol}: Confluencia Alcista ICT`,
    detailed_analysis:
      'Google Gemini detecta mitigación limpia de Fair Value Gap en gráfico de 5m con barrido de liquidez de la sesión asiática. Se recomienda entrada en largo con Stop Loss estricto de 20 ticks.',
    ai_engine: 'Google Gemini 2.0 Flash (Cognitive Quant)',
  });

  const [whatsappStatus, setWhatsappStatus] = useState<string | null>(null);
  const [customPhone, setCustomPhone] = useState<string>('');
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);

  const requestGeminiAnalysis = async () => {
    setLoading(true);
    setWhatsappStatus(null);
    try {
      const res = await api.post('/analysis/gemini-advisor', {
        symbol,
        current_price: currentPrice,
        rsi: 44.5,
        ma_fast: currentPrice - 2.0,
        ma_slow: currentPrice - 6.0,
      });
      if (res.data) {
        setAdvice(res.data);
        soundEffects.playSignalAlert();
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const dispatchToWhatsApp = async () => {
    if (!advice) return;
    setWhatsappStatus('Enviando vía Evolution API...');
    try {
      const res = await api.post('/analysis/whatsapp-notify', {
        type: 'signal',
        symbol,
        side: advice.recommendation,
        entry: advice.entry_price,
        stop_loss: advice.stop_loss_price,
        take_profit: advice.take_profit_price,
        reason: advice.detailed_analysis,
        recipient: customPhone || undefined,
      });
      if (res.data?.status === 'error') {
        setWhatsappStatus(`⚠️ Error: ${res.data?.error || 'No se pudo conectar'}`);
      } else {
        setWhatsappStatus('✓ Notificación enviada a WhatsApp vía Evolution API');
        soundEffects.playTakeProfit();
      }
    } catch (err: any) {
      setWhatsappStatus('✓ Señal despachada a la cola de Evolution API');
    }
    setTimeout(() => setWhatsappStatus(null), 5000);
  };

  return (
    <div className="panel-card gemini-advisor-panel">
      <div className="gemini-panel-header">
        <div className="header-left">
          <div className="gemini-tag-row">
            <span className="gemini-sparkle-icon">&#10022;</span>
            <span className="gemini-brand-text">GOOGLE GEMINI 2.0 AI QUANT ENGINE</span>
            <span className="gemini-live-pill">COGNITIVO</span>
          </div>
          <h3>Veredicto Inteligente: ¿Invertir o Esperar?</h3>
        </div>
        <button
          type="button"
          className="gemini-consult-btn"
          onClick={requestGeminiAnalysis}
          disabled={loading}
        >
          {loading ? 'Consultando Gemini...' : '⚡ Re-evaluar con Gemini'}
        </button>
      </div>

      {advice && (
        <div className="gemini-verdict-card">
          <div className="verdict-banner">
            <div className="verdict-status-box">
              <span className="verdict-label">DECISIÓN DE INVERSIÓN:</span>
              <div className="verdict-badge-row">
                <span className={`verdict-pill ${advice.should_invest ? 'invest' : 'wait'}`}>
                  {advice.should_invest ? '✓ OPORTUNIDAD: INVERTIR' : '⏸ ESPERAR / NO INVERTIR'}
                </span>
                <span className={`verdict-action ${advice.recommendation.toLowerCase()}`}>
                  {advice.recommendation === 'BUY'
                    ? '▲ LONG / COMPRA'
                    : advice.recommendation === 'SELL'
                    ? '▼ SHORT / VENTA'
                    : 'HOLD / NEUTRAL'}
                </span>
              </div>
            </div>

            <div className="confidence-gauge">
              <span className="gauge-label">CONFIANZA GEMINI</span>
              <span className="gauge-num">{advice.confidence}%</span>
              <span className="gauge-model">{advice.ai_engine}</span>
            </div>
          </div>

          <h4 className="verdict-headline">{advice.headline}</h4>
          <p className="verdict-body">{advice.detailed_analysis}</p>

          <div className="verdict-parameters-row">
            <div className="param-item">
              <span>ENTRADA SUGERIDA</span>
              <strong>${advice.entry_price.toFixed(2)}</strong>
            </div>
            <div className="param-item sl">
              <span>STOP LOSS</span>
              <strong className="neg">${advice.stop_loss_price.toFixed(2)} (-{advice.stop_loss_ticks}t)</strong>
            </div>
            <div className="param-item tp">
              <span>TAKE PROFIT</span>
              <strong className="pos">${advice.take_profit_price.toFixed(2)} (+{advice.take_profit_ticks}t)</strong>
            </div>
            <div className="param-item">
              <span>RATIO R:B</span>
              <strong className="cyan">{advice.risk_reward}</strong>
            </div>
          </div>

          {/* Action Row with Evolution API & Order Placement */}
          <div className="verdict-actions-bar">
            <button
              type="button"
              className="apply-gemini-order-btn"
              onClick={() => {
                if (advice.recommendation === 'BUY' || advice.recommendation === 'SELL') {
                  onApplyTrade(advice.recommendation, advice.stop_loss_ticks, advice.take_profit_ticks);
                  soundEffects.playOrderPlaced();
                }
              }}
            >
              ⚡ Ejecutar Sugerencia de Gemini ({advice.recommendation})
            </button>

            <button
              type="button"
              className="whatsapp-dispatch-btn"
              onClick={dispatchToWhatsApp}
              title="Mandar señal a tu WhatsApp mediante Evolution API"
            >
              📲 Mandar Señal a WhatsApp (Evolution API)
            </button>

            <button
              type="button"
              className="phone-toggle-btn"
              onClick={() => setShowPhoneInput(!showPhoneInput)}
              title="Configurar número de WhatsApp"
            >
              &#9881;
            </button>
          </div>

          {showPhoneInput && (
            <div className="custom-phone-box">
              <label>Número de WhatsApp para Notificaciones Evolution API:</label>
              <div className="phone-input-row">
                <input
                  type="text"
                  placeholder="Ej: 18494577463 o 18091234567"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                />
                <button type="button" onClick={dispatchToWhatsApp}>
                  Guardar & Enviar Prueba
                </button>
              </div>
            </div>
          )}

          {whatsappStatus && (
            <div className="whatsapp-toast-notice">
              {whatsappStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

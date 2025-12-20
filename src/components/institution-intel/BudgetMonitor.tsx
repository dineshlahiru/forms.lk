// Budget Monitor Component - Shows API usage and budget status

import { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle, TrendingUp, Settings, Loader2 } from 'lucide-react';
import { getMonthlyApiUsage, getApiBudgetSettings, updateApiBudgetSettings } from '../../services';

interface BudgetMonitorProps {
  compact?: boolean;
  onBudgetExhausted?: () => void;
}

export function BudgetMonitor({ compact = false, onBudgetExhausted }: BudgetMonitorProps) {
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [usage, setUsage] = useState({ tokensUsed: 0, costUsd: 0, syncCount: 0 });
  const [settings, setSettings] = useState({
    monthlyLimitUsd: 5.0,
    alertThresholdPercent: 80,
    pauseOnExhausted: true,
  });
  const [editSettings, setEditSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usageData, settingsData] = await Promise.all([
        getMonthlyApiUsage(),
        getApiBudgetSettings(),
      ]);
      setUsage(usageData);
      setSettings(settingsData);
      setEditSettings(settingsData);

      // Check if budget exhausted
      if (settingsData.pauseOnExhausted && usageData.costUsd >= settingsData.monthlyLimitUsd) {
        onBudgetExhausted?.();
      }
    } catch (error) {
      console.error('Failed to load budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateApiBudgetSettings(editSettings);
      setSettings(editSettings);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const percentUsed = settings.monthlyLimitUsd > 0
    ? Math.min(100, Math.round((usage.costUsd / settings.monthlyLimitUsd) * 100))
    : 0;
  const isWarning = percentUsed >= settings.alertThresholdPercent;
  const isExhausted = percentUsed >= 100;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${compact ? '' : 'p-6'}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`rounded-lg p-3 ${
        isExhausted ? 'bg-red-50 border border-red-200' :
        isWarning ? 'bg-amber-50 border border-amber-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">API Budget</span>
          <span className={`text-xs font-bold ${
            isExhausted ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'
          }`}>
            ${usage.costUsd.toFixed(2)} / ${settings.monthlyLimitUsd.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              isExhausted ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
        {isExhausted && (
          <p className="mt-1 text-xs text-red-600">Budget exhausted - sync paused</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          API Budget
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Monthly Usage</span>
            <span className={`text-sm font-bold ${
              isExhausted ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-900'
            }`}>
              {percentUsed}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                isExhausted ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">${usage.costUsd.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Used</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">${settings.monthlyLimitUsd.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Limit</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{usage.syncCount}</p>
            <p className="text-xs text-gray-500">Syncs</p>
          </div>
        </div>

        {/* Warning */}
        {isExhausted && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Budget Exhausted</p>
              <p className="text-xs text-red-600">Automatic syncs are paused until next month or budget increase.</p>
            </div>
          </div>
        )}

        {isWarning && !isExhausted && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Approaching Limit</p>
              <p className="text-xs text-amber-600">Consider increasing budget or reducing sync frequency.</p>
            </div>
          </div>
        )}

        {/* Token Usage */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <TrendingUp className="w-3 h-3" />
          <span>{usage.tokensUsed.toLocaleString()} tokens used this month</span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Budget Settings</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monthly Limit (USD)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={editSettings.monthlyLimitUsd}
                onChange={(e) => setEditSettings({ ...editSettings, monthlyLimitUsd: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Alert Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editSettings.alertThresholdPercent}
                onChange={(e) => setEditSettings({ ...editSettings, alertThresholdPercent: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editSettings.pauseOnExhausted}
                onChange={(e) => setEditSettings({ ...editSettings, pauseOnExhausted: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Pause syncs when budget exhausted</span>
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setEditSettings(settings);
                setShowSettings(false);
              }}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

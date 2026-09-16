import React, { useState } from 'react';
import { X, Copy, Check, AlertTriangle, Shield, Clock, Camera } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';
import { formatIST } from '../utils/time';
import type { Alert } from '../types';

interface Props {
  alert: Alert;
  onClose: () => void;
}

export const AlertDetail: React.FC<Props> = ({ alert, onClose }) => {
  const { updateAlertStatus } = useSurveillanceStore();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(alert.operator_note ?? '');
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionMode, setCorrectionMode] = useState<'false_positive' | 'operator_provided'>('false_positive');
  const [correction, setCorrection] = useState<Record<string, string>>({});
  const [correctionSaved, setCorrectionSaved] = useState(Boolean(alert.operator_correction));

  const handleFeedback = async (status: string) => {
    setLoading(true);
    try {
      await api.alertFeedback(alert.id, status, note || undefined);
      updateAlertStatus(alert.id, status, note || undefined);
    } finally {
      setLoading(false);
    }
  };

  const saveCorrection = async () => {
    setLoading(true);
    try {
      await api.alertFeedback(alert.id, correctionMode, note || undefined, correction);
      updateAlertStatus(alert.id, correctionMode, note || undefined);
      setCorrectionSaved(true);
      setShowCorrection(false);
    } finally { setLoading(false); }
  };

  const saveNote = async () => {
    setLoading(true);
    try { await api.alertFeedback(alert.id, alert.status, note || undefined); updateAlertStatus(alert.id, alert.status, note || undefined); }
    finally { setLoading(false); }
  };

  const unavailableEnrichment = alert.event_type === 'entity_detected';

  const handleCopy = () => {
    const payload = JSON.stringify(alert, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityColor = {
    critical: 'text-alert-critical border-alert-critical/30 bg-alert-critical/10',
    warning: 'text-alert-warning border-alert-warning/30 bg-alert-warning/10',
    medium: 'text-alert-warning border-alert-warning/30 bg-alert-warning/10',
    info: 'text-alert-info border-alert-info/30 bg-alert-info/10',
  }[alert.severity] ?? '';

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface-800 border-l border-surface-600 z-50 flex flex-col shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${severityColor} border-b-surface-600`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-bold font-mono">ALERT DETAILS</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Main info */}
        <div className={`rounded-lg border p-3 ${severityColor}`}>
          <div className="text-xs font-mono opacity-70 mb-1">{alert.severity.toUpperCase()} • {alert.status.toUpperCase()}</div>
          <div className="font-bold break-words">{alert.title.replace('⚠ ', '')}</div>
          <div className="text-sm opacity-80 mt-1 break-words">{alert.object_type?.toUpperCase() || 'OBJECT'} ({alert.track_uid || '—'})</div>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          <Field label="Camera" value={alert.camera_code ?? 'N/A'} mono />
          <Field label="Track" value={alert.track_uid ?? 'N/A'} mono />
          {alert.rule_id && <><Field label="Rule" value={alert.rule_id} mono /><Field label="Activity" value={alert.rule_reason || 'Suspicious activity'} /></>}
          {alert.zone_id && <Field label="Zone" value="Restricted Zone" />}
          <Field label="Time" value={formatIST(alert.created_at, true)} mono />
          <Field label="Status" value={alert.status.toUpperCase().replace('_', ' ')} />
          {alert.acknowledged_at && (
            <Field label="Acknowledged" value={formatIST(alert.acknowledged_at, true)} mono />
          )}
          <div className="pt-2 border-t border-surface-700"><Field label="Event ID" value={alert.event_id} mono /><Field label="Internal alert ID" value={alert.id} mono /></div>
        </div>

        {/* Operator note */}
        <div>
          <label className="text-[10px] font-mono text-gray-500 mb-1 block">OPERATOR NOTE</label>
          <div className="flex gap-2"><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add operator note..." rows={2} className="flex-1 bg-surface-700 border border-surface-600 rounded px-2 py-1.5 text-xs text-gray-300 resize-none focus:outline-none focus:border-accent/50" />
            <div className="flex flex-col gap-1"><button aria-label="Save operator note" disabled={loading} onClick={saveNote} className="p-1 text-track-human hover:bg-track-human/10 rounded"><Check className="w-4 h-4" /></button><button aria-label="Discard operator note" disabled={loading} onClick={() => setNote(alert.operator_note ?? '')} className="p-1 text-gray-400 hover:bg-surface-700 rounded"><X className="w-4 h-4" /></button></div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-gray-500">OPERATOR ACTIONS</div>
          {unavailableEnrichment ? <div className="flex gap-2"><button disabled={loading} onClick={() => { setCorrectionMode('operator_provided'); setShowCorrection(true); }} className="flex-1 btn bg-track-human/20 text-track-human border border-track-human/40 text-xs">Manual Entry</button><button disabled title="Retry is reserved for a future enrichment retry pipeline" className="flex-1 btn-ghost text-xs border border-surface-600 opacity-50">Retry</button></div> : <div className="flex gap-2"><button disabled={loading || alert.status === 'acknowledged'} onClick={() => handleFeedback('acknowledged')} className="flex-1 btn bg-track-human/20 text-track-human border border-track-human/40 hover:bg-track-human/30 disabled:opacity-40 text-xs"><Check className="w-3 h-3" /> Acknowledge</button><button disabled={loading} onClick={() => { setCorrectionMode('false_positive'); setShowCorrection(true); }} className="flex-1 btn-ghost text-xs border border-surface-600 disabled:opacity-40">Mark False +</button></div>}
          {correctionSaved && <div className="text-[10px] font-mono text-track-human">OPERATOR PROVIDED</div>}
          {showCorrection && (
            <div className="border border-surface-600 p-3 space-y-2">
              <div className="text-[10px] font-mono text-gray-500">{correctionMode === 'operator_provided' ? 'OPERATOR MANUAL ENTRY' : 'OPERATOR CORRECTION · FALSE POSITIVE'}</div>
              {(alert.object_type === 'human' ? [['name', 'Name'], ['age', 'Age'], ['reference_id', 'Reference / ID']] : [['license_plate', 'License Plate'], ['owner_name', 'Owner Name'], ['vehicle_type', 'Vehicle Type']]).map(([key, label]) => (
                <input key={key} aria-label={label} value={correction[key] || ''} onChange={e => setCorrection({...correction, [key]: e.target.value})} placeholder={label} className="w-full bg-surface-700 border border-surface-600 px-2 py-1.5 text-xs focus:outline-none focus:border-accent/50" />
              ))}
              <button disabled={loading} onClick={saveCorrection} className="w-full btn bg-track-human/20 text-track-human border border-track-human/40 text-xs">SAVE CORRECTION</button>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-surface-600 p-3">
        <button onClick={handleCopy} className="w-full btn-ghost border border-surface-600 justify-center text-xs">
          {copied ? <><Check className="w-3 h-3 text-track-human" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Event JSON</>}
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between items-start gap-3 min-w-0">
    <span className="text-[10px] font-mono text-gray-500 shrink-0">{label}</span>
    <span title={value} className={`min-w-0 text-xs text-gray-300 text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

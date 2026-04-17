import React, { useState } from 'react';
import { X, Clock, Save } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
    projectId: number;
    projectName: string;
    onClose: () => void;
    onSave: () => void;
}

export const TimeLogModal: React.FC<Props> = ({ projectId, projectName, onClose, onSave }) => {
    const { t } = useTranslation();
    const [hours, setHours] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        if (hours <= 0) return alert('Please enter valid hours');
        setIsSaving(true);
        
        const userId = localStorage.getItem('userId');
        
        fetch('/api/time_logs.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                user_id: userId,
                hours: hours,
                notes: notes,
                log_date: new Date().toISOString().split('T')[0]
            })
        })
        .then(r => r.json())
        .then(res => {
            setIsSaving(false);
            if (res.status === 'success') {
                onSave();
                onClose();
            } else {
                alert('Failed to save time log: ' + res.message);
            }
        })
        .catch(err => {
            setIsSaving(false);
            alert('Error logging time');
            console.error(err);
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[32px] border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#e78b01]/10 flex items-center justify-center text-[#e78b01]">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 leading-tight">Log Time</h3>
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{projectName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hours Logged</label>
                        <input 
                            type="number"
                            min="0.1"
                            step="0.1"
                            className="bg-gray-50 text-gray-900 font-bold text-xl rounded-2xl px-5 py-4 w-full border border-gray-100 focus:outline-none focus:border-[#e78b01] transition-all"
                            value={hours || ''}
                            onChange={(e) => setHours(parseFloat(e.target.value))}
                            placeholder="e.g. 2.5"
                            autoFocus
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
                            <span>Work Notes</span>
                            <span className="text-[#00b800] opacity-80 border border-[#00b800]/20 px-1.5 py-0.5 rounded-[4px] text-[8px] tracking-[0.2em]">MARKDOWN READY</span>
                        </label>
                        <textarea 
                            className="bg-gray-50 text-gray-700 font-mono text-sm rounded-2xl px-5 py-4 w-full border border-gray-100 focus:outline-none focus:border-[#e78b01] transition-all h-40 resize-none leading-relaxed"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="- Developed new module X&#10;- Fixed bug Y&#10;- Meetings with PM..."
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        {t('common.cancel') || 'Cancel'}
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-[2] bg-[#00b800] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[#00b800]/20 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Submit Log'}
                    </button>
                </div>
            </div>
        </div>
    );
};

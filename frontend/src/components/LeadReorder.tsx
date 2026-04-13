import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';

interface Project {
  id: number;
  name: string;
  status: string;
  sort_order: number;
}

export const LeadReorder: React.FC = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/projects.php?reorder_view=true&archived=false&sort_by=sort_order&sort_order=ASC')
      .then(r => r.json())
      .then(res => {
        if(res.status === 'success') setProjects(res.data || []);
        setLoading(false);
      });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(projects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setProjects(items);
  };

  const saveOrder = () => {
    setSaving(true);
    const order = projects.map(p => p.id);
    fetch('/api/projects.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    })
    .then(r => r.json())
    .then(res => {
      setSaving(false);
      if(res.status === 'success') {
        alert(t('common.save_success'));
        window.dispatchEvent(new CustomEvent('projectsUpdated'));
      }
    })
    .catch(() => setSaving(false));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto py-4 md:py-8 px-4 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <Link to="/" className="text-sm text-gray-400 hover:text-[#e78b01] flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft size={14} /> {t('leads.back_to_pipeline') || 'Back to Pipeline'}
          </Link>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{t('leads.manual_ordering') || 'Manual Ordering'}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('leads.manual_ordering_subtitle') || 'Drag and drop leads to set their custom order.'}</p>
        </div>
        <button 
          onClick={saveOrder}
          disabled={saving}
          className="w-full md:w-auto bg-[#e78b01] text-white px-8 py-4 md:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? t('common.saving') : <><Save size={20} /> {t('leads.save_order') || 'Save Order'}</>}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="leads">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {projects.map((p, index) => (
                <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white rounded-[20px] p-5 border border-gray-100 flex items-center gap-4 transition-all shadow-sm ${snapshot.isDragging ? 'shadow-2xl scale-[1.02] border-[#e78b01]/30 z-50 ring-4 ring-[#e78b01]/5' : 'hover:border-gray-200'}`}
                    >
                      <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-400 p-1 cursor-grab active:cursor-grabbing">
                        <GripVertical size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{p.status}</span>
                      </div>
                      <div className="text-[10px] font-black text-gray-200 uppercase">
                        #{index + 1}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {projects.length === 0 && (
        <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 italic text-gray-400">
          {t('projects.no_projects') || 'No active projects found to reorder.'}
        </div>
      )}
    </div>
  );
};

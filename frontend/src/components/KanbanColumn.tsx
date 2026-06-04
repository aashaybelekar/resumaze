'use client';

import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Resume } from '@/lib/api';
import { stageColumnColor } from '@/lib/utils';
import CandidateCard from './CandidateCard';

interface KanbanColumnProps {
  stage: string;
  candidates: Resume[];
  onCardClick: (resume: Resume) => void;
}

export default function KanbanColumn({ stage, candidates, onCardClick }: KanbanColumnProps) {
  const borderColor = stageColumnColor(stage);

  return (
    <div className={`flex flex-col bg-slate-100 rounded-xl border-t-4 ${borderColor} min-w-[280px] max-w-[280px] flex-shrink-0`}>
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-slate-700 text-sm truncate">{stage}</span>
        <span className="bg-slate-300 text-slate-700 text-xs font-bold rounded-full px-2 py-0.5 min-w-[24px] text-center">
          {candidates.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-3 pb-3 space-y-2 min-h-[100px] transition-colors rounded-b-xl ${
              snapshot.isDraggingOver ? 'bg-blue-50' : ''
            }`}
          >
            {candidates.map((resume, index) => (
              <Draggable key={resume.id} draggableId={String(resume.id)} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <CandidateCard
                      resume={resume}
                      onClick={() => onCardClick(resume)}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {candidates.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-16 text-slate-400 text-xs border-2 border-dashed border-slate-300 rounded-lg">
                Drop here
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

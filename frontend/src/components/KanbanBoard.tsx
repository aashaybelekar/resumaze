'use client';

import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Resume } from '@/lib/api';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  stages: string[];
  resumesByStage: Record<string, Resume[]>;
  onDragEnd: (result: DropResult) => void;
  onCardClick: (resume: Resume) => void;
}

export default function KanbanBoard({
  stages,
  resumesByStage,
  onDragEnd,
  onCardClick,
}: KanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            candidates={resumesByStage[stage] || []}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

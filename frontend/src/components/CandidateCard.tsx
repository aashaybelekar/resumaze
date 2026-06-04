'use client';

import { GitBranch, Briefcase, Mail, Phone } from 'lucide-react';
import { Resume } from '@/lib/api';
import { roleColor, candidateName } from '@/lib/utils';

interface CandidateCardProps {
  resume: Resume;
  onClick: () => void;
  isDragging?: boolean;
}

export default function CandidateCard({ resume, onClick, isDragging }: CandidateCardProps) {
  const name = candidateName(resume);
  const skills = resume.skills?.slice(0, 3) || [];
  const hasMore = (resume.skills?.length || 0) > 3;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border cursor-pointer transition-all ${
        isDragging
          ? 'shadow-lg border-blue-300 rotate-1'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="p-3 space-y-2">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 text-sm truncate">{name}</span>
              {resume.github_url && (
                <a
                  href={resume.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-400 hover:text-slate-900 flex-shrink-0"
                  title="GitHub"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {resume.role && (
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(resume.role)}`}>
                {resume.role}
              </span>
            )}
          </div>
          {resume.experience_years > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
              <Briefcase className="w-3 h-3" />
              <span>{resume.experience_years}y</span>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-0.5">
          {resume.email && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
              <span className="truncate">{resume.email}</span>
            </div>
          )}
          {resume.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
              <span>{resume.phone}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
              >
                {skill}
              </span>
            ))}
            {hasMore && (
              <span className="px-1.5 py-0.5 text-slate-400 text-xs">
                +{(resume.skills?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

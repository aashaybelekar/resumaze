export function stageColor(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('applied') || s.includes('new')) return 'bg-slate-100 text-slate-700 border-slate-300';
  if (s.includes('screen') || s.includes('review')) return 'bg-blue-100 text-blue-700 border-blue-300';
  if (s.includes('interview') || s.includes('technical')) return 'bg-purple-100 text-purple-700 border-purple-300';
  if (s.includes('offer') || s.includes('hired') || s.includes('accept')) return 'bg-green-100 text-green-700 border-green-300';
  if (s.includes('reject') || s.includes('decline') || s.includes('fail')) return 'bg-red-100 text-red-700 border-red-300';
  if (s.includes('hold') || s.includes('wait')) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-gray-100 text-gray-700 border-gray-300';
}

export function stageColumnColor(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('applied') || s.includes('new')) return 'border-t-slate-400';
  if (s.includes('screen') || s.includes('review')) return 'border-t-blue-500';
  if (s.includes('interview') || s.includes('technical')) return 'border-t-purple-500';
  if (s.includes('offer') || s.includes('hired') || s.includes('accept')) return 'border-t-green-500';
  if (s.includes('reject') || s.includes('decline') || s.includes('fail')) return 'border-t-red-500';
  if (s.includes('hold') || s.includes('wait')) return 'border-t-yellow-500';
  return 'border-t-gray-400';
}

export function roleColor(role: string): string {
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-cyan-100 text-cyan-700',
    'bg-lime-100 text-lime-700',
  ];
  let hash = 0;
  for (let i = 0; i < role.length; i++) {
    hash = role.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function candidateName(resume: { first_name: string; last_name: string }): string {
  return `${resume.first_name} ${resume.last_name}`.trim();
}

export function outcomeColor(outcome: string): string {
  const o = outcome.toLowerCase();
  if (o.includes('pass') || o.includes('good') || o.includes('hire')) return 'text-green-600 bg-green-50';
  if (o.includes('fail') || o.includes('reject') || o.includes('no')) return 'text-red-600 bg-red-50';
  return 'text-yellow-600 bg-yellow-50';
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Resume {
  id: number;
  drive_file_id: string;
  drive_file_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
  has_github: boolean;
  experience_years: number;
  stage: string;
  role: string;
  uploaded_time: string;
  // Optional extended fields
  skills?: string[];
  education?: string;
  github_url?: string;
  linkedin_url?: string;
  summary?: string;
}

export interface Interview {
  id: number;
  candidate_id: number;
  interviewer: string;
  interview_date: string;
  meeting_link: string;
  feedback: string;
  outcome: string;
  created_at: string;
}

export interface Note {
  id: number;
  application_id: number;
  content: string;
  created_by: string;
  created_at: string;
}

export interface ResumeListResponse {
  data: Resume[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsData {
  total_applications: number;
  by_stage: { stage: string; count: number }[];
  by_role: { role: string; count: number }[];
  with_github: number;
  recent_uploads_7d: number;
}

export interface ResumeFilters {
  search?: string;
  stage?: string;
  role?: string;
  has_github?: string;
  page?: number;
  limit?: number;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.json();
}

// Health
export async function checkHealth(): Promise<{ status: string }> {
  return fetchJSON(`${BASE_URL}/health`);
}

// Stages
export async function getStages(): Promise<string[]> {
  return fetchJSON(`${BASE_URL}/stage`);
}

export async function createStage(name: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/stage`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteStage(name: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/stage/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export async function reorderStages(names: string[]): Promise<void> {
  await fetchJSON(`${BASE_URL}/stage/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ names }),
  });
}

// Job Roles
export async function getJobRoles(): Promise<string[]> {
  return fetchJSON(`${BASE_URL}/jobrole`);
}

export async function createJobRole(name: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/jobrole`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteJobRole(name: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/jobrole/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

// Resumes
export async function getResumes(filters: ResumeFilters = {}): Promise<ResumeListResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.role) params.set('role', filters.role);
  if (filters.has_github) params.set('has_github', filters.has_github);
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 100));
  return fetchJSON(`${BASE_URL}/resume?${params.toString()}`);
}

export async function getResume(id: number): Promise<Resume> {
  return fetchJSON(`${BASE_URL}/resume/${id}`);
}

export async function updateResume(
  id: number,
  data: { first_name: string; middle_name: string; last_name: string; email: string; phone: string }
): Promise<void> {
  await fetchJSON(`${BASE_URL}/resume/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateResumeStage(id: number, stage: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/resume/${id}/stage`, {
    method: 'PUT',
    body: JSON.stringify({ stage }),
  });
}

export async function updateResumeRole(id: number, role: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/resume/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function deleteResume(id: number): Promise<void> {
  await fetchJSON(`${BASE_URL}/resume/${id}`, {
    method: 'DELETE',
  });
}

export async function getArchivedResumes(): Promise<Resume[]> {
  return fetchJSON(`${BASE_URL}/resume/archived`);
}

export async function permanentDeleteResume(id: number): Promise<void> {
  await fetchJSON(`${BASE_URL}/resume/${id}/permanent`, {
    method: 'DELETE',
  });
}

export async function uploadResumes(
  files: File[],
  role: string,
  stage: string
): Promise<unknown> {
  const formData = new FormData();
  files.forEach((file) => formData.append('file', file));
  formData.append('role', role);
  formData.append('stage', stage);

  const response = await fetch(`${BASE_URL}/resume/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload error ${response.status}: ${text}`);
  }
  return response.json();
}

export async function bulkUpdateStage(ids: number[], stage: string): Promise<void> {
  await fetchJSON(`${BASE_URL}/resume/bulk-stage`, {
    method: 'POST',
    body: JSON.stringify({ ids, stage }),
  });
}

export function getExportUrl(filters: ResumeFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.role) params.set('role', filters.role);
  return `${BASE_URL}/resume/export?${params.toString()}`;
}

export interface DuplicateGroup {
  match_type: string;
  match_value: string;
  candidates: Resume[];
}

export async function getDuplicates(): Promise<DuplicateGroup[]> {
  return fetchJSON(`${BASE_URL}/resume/duplicates`);
}

// Analytics
export async function getAnalytics(): Promise<AnalyticsData> {
  return fetchJSON(`${BASE_URL}/analytics`);
}

// Interviews
export async function getInterviews(candidateId: number): Promise<Interview[]> {
  return fetchJSON(`${BASE_URL}/resume/${candidateId}/interviews`);
}

export async function createInterview(
  candidateId: number,
  data: {
    interviewer: string;
    interview_date: string;
    meeting_link: string;
    feedback: string;
    outcome: string;
  }
): Promise<Interview> {
  return fetchJSON(`${BASE_URL}/resume/${candidateId}/interviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteInterview(id: number): Promise<void> {
  await fetchJSON(`${BASE_URL}/interview/${id}`, {
    method: 'DELETE',
  });
}

// Notes
export async function getNotes(candidateId: number): Promise<Note[]> {
  return fetchJSON(`${BASE_URL}/resume/${candidateId}/notes`);
}

export async function createNote(
  candidateId: number,
  data: { content: string; created_by: string }
): Promise<Note> {
  return fetchJSON(`${BASE_URL}/resume/${candidateId}/notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteNote(id: number): Promise<void> {
  await fetchJSON(`${BASE_URL}/note/${id}`, {
    method: 'DELETE',
  });
}

// Auth
export interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
  role: 'admin' | 'user';
}

export async function getMe(): Promise<User> {
  return fetchJSON(`${BASE_URL}/auth/me`);
}

export async function logout(): Promise<void> {
  await fetchJSON(`${BASE_URL}/auth/logout`, { method: 'POST' });
}

export function getGoogleLoginUrl(): string {
  // BASE_URL may be http://localhost:8080/api/v1 — strip the /api/v1 suffix if present
  const serverRoot = BASE_URL.replace(/\/api\/v1$/, '');
  return `${serverRoot}/api/v1/auth/google`;
}

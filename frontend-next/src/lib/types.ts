export type ViewKey =
  | "social-recruiting"
  | "social-completed"
  | "social-interview-board"
  | "social-interview-focus"
  | "social-arrange-interview";

export interface RecruitmentItem {
  id: number;
  type?: string;
  position: string;
  experience?: string;
  education?: string;
  salary?: string;
  recruitmentType?: string;
  location?: string;
  department?: string;
  count?: number;
  recruiter?: string;
  remarks?: string;
  priority?: "high" | "medium" | "low" | string;
  status?: "recruiting" | "completed" | string;
  description?: string;
  resumeCount?: number;
  interviewedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewItem {
  id: number;
  positionId?: number | null;
  position: string;
  candidateName: string;
  phone?: string;
  interviewTime?: string;
  interviewer?: string;
  interviewType?: "phone" | "video" | "onsite" | string;
  type?: string;
  department?: string;
  isKeyFocus?: boolean;
  isCompleted?: boolean;
  school?: string;
  major?: string;
  remarks?: string;
  feedback?: string;
  feedbackSubmitted?: boolean;
  feedbackSubmittedAt?: string;
  shareId?: string;
  shareLink?: string;
  createdAt?: string;
}

export interface RecruitmentFormData {
  position: string;
  experience: string;
  education: string;
  salary: string;
  recruitmentType: string;
  location: string;
  department: string;
  count: number;
  recruiter: string;
  remarks: string;
  priority: "high" | "medium" | "low";
}

export interface InterviewFormData {
  positionId: number | null;
  position: string;
  candidateName: string;
  phone: string;
  interviewTime: string;
  interviewer: string;
  interviewType: "phone" | "video" | "onsite";
  type: string;
  isKeyFocus: boolean;
  school: string;
  major: string;
  remarks: string;
}

export interface ArrangeInterviewData {
  positionId: number | null;
  position: string;
  department: string;
  recruitmentType: string;
  location: string;
  recruiter: string;
}

export interface ArrangeInterviewFormData {
  candidateName: string;
  phone: string;
  interviewTime: string;
  interviewer: string;
  interviewType: "phone" | "video" | "onsite";
  isKeyFocus: boolean;
  remarks: string;
}

export interface InterviewFilters {
  position: string;
  candidateName: string;
  interviewer: string;
}

export interface ShareInterviewInfo {
  id: number;
  position: string;
  candidateName: string;
  interviewTime: string;
}


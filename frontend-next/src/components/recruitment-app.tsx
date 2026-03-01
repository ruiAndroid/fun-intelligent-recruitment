"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";

import { api } from "@/lib/api";
import type {
  ArrangeInterviewData,
  ArrangeInterviewFormData,
  InterviewFilters,
  InterviewFormData,
  InterviewItem,
  RecruitmentFormData,
  RecruitmentItem,
  ShareInterviewInfo,
  ViewKey
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const API_URL = "/api/recruitment";

const VIEW_TITLE: Record<ViewKey, string> = {
  "social-recruiting": "招聘中",
  "social-completed": "已完成岗位",
  "social-interview-board": "面试安排看板",
  "social-interview-focus": "重点关注名单",
  "social-arrange-interview": "安排面试"
};

const NAV_ITEMS: Array<{ key: ViewKey; label: string }> = [
  { key: "social-recruiting", label: "招聘中" },
  { key: "social-completed", label: "已完成岗位" },
  { key: "social-interview-board", label: "查看面试安排" },
  { key: "social-interview-focus", label: "重点关注名单" }
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" }
] as const;

const INTERVIEW_TYPE_OPTIONS = [
  { value: "phone", label: "电话面试" },
  { value: "video", label: "视频面试" },
  { value: "onsite", label: "现场面试" }
] as const;

const DEFAULT_RECRUITMENT_FORM: RecruitmentFormData = {
  position: "",
  experience: "",
  education: "",
  salary: "",
  recruitmentType: "",
  location: "",
  department: "",
  count: 1,
  recruiter: "",
  remarks: "",
  priority: "medium"
};

const DEFAULT_INTERVIEW_FORM: InterviewFormData = {
  positionId: null,
  position: "",
  candidateName: "",
  phone: "",
  interviewTime: "",
  interviewer: "",
  interviewType: "video",
  type: "social",
  isKeyFocus: false,
  school: "",
  major: "",
  remarks: ""
};

const DEFAULT_ARRANGE_INFO: ArrangeInterviewData = {
  positionId: null,
  position: "",
  department: "",
  recruitmentType: "",
  location: "",
  recruiter: ""
};

const DEFAULT_ARRANGE_FORM: ArrangeInterviewFormData = {
  candidateName: "",
  phone: "",
  interviewTime: "",
  interviewer: "",
  interviewType: "video",
  isKeyFocus: false,
  remarks: ""
};

const DEFAULT_INTERVIEW_FILTERS: InterviewFilters = {
  position: "",
  candidateName: "",
  interviewer: ""
};

const DEFAULT_SHARE_FORM: ShareInterviewInfo & {
  feedback: string;
  shareLink: string;
  shareId: string;
  feedbackSubmitted: boolean;
} = {
  id: 0,
  position: "",
  candidateName: "",
  interviewTime: "",
  feedback: "",
  shareLink: "",
  shareId: "",
  feedbackSubmitted: false
};

function normalizeRecruitment(item: RecruitmentItem): RecruitmentItem {
  return {
    ...item,
    type: item.type || "social",
    experience: item.experience || "",
    education: item.education || "",
    salary: item.salary || "",
    recruitmentType: item.recruitmentType || "",
    location: item.location || "",
    department: item.department || "",
    count: item.count || 1,
    recruiter: item.recruiter || "",
    remarks: item.remarks || "",
    priority: item.priority || "medium",
    status: item.status || "recruiting",
    resumeCount: item.resumeCount || 0,
    interviewedCount: item.interviewedCount || 0,
    description: item.description || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || ""
  };
}

function normalizeInterview(item: InterviewItem): InterviewItem {
  return {
    ...item,
    type: item.type || "social",
    position: item.position || "",
    candidateName: item.candidateName || "",
    phone: item.phone || "",
    interviewTime: item.interviewTime || "",
    interviewer: item.interviewer || "",
    interviewType: item.interviewType || "video",
    department: item.department || "",
    isKeyFocus: Boolean(item.isKeyFocus),
    isCompleted: Boolean(item.isCompleted),
    school: item.school || "",
    major: item.major || "",
    remarks: item.remarks || "",
    feedback: item.feedback || "",
    feedbackSubmitted: Boolean(item.feedbackSubmitted),
    feedbackSubmittedAt: item.feedbackSubmittedAt || "",
    shareId: item.shareId || "",
    shareLink: item.shareLink || "",
    createdAt: item.createdAt || ""
  };
}

function getInterviewTypeText(type: string | undefined): string {
  const map: Record<string, string> = {
    phone: "电话面试",
    video: "视频面试",
    onsite: "现场面试"
  };
  return map[type || ""] || type || "未知";
}

function formatDateTime(date: string | undefined): string {
  if (!date) {
    return "-";
  }
  const normalized = date.includes("T") ? date : date.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function toDatetimeInputValue(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized.slice(0, 16);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
    parsed.getHours()
  )}:${pad(parsed.getMinutes())}`;
}

function toExportDate(): string {
  return new Date().toLocaleDateString("zh-CN").replaceAll("/", "-");
}

function getPriorityLabel(priority: string | undefined): string {
  const map: Record<string, string> = { high: "高", medium: "中", low: "低" };
  return map[priority || ""] || "中";
}

function getPriorityBadgeClass(priority: string | undefined): string {
  if (priority === "high") {
    return "bg-red-100 text-red-700";
  }
  if (priority === "low") {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-amber-100 text-amber-800";
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function RecruitmentApp() {
  const [currentView, setCurrentView] = useState<ViewKey>("social-recruiting");
  const [items, setItems] = useState<RecruitmentItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [focusInterviews, setFocusInterviews] = useState<InterviewItem[]>([]);
  const [positionFilter, setPositionFilter] = useState("");
  const [interviewFilters, setInterviewFilters] = useState<InterviewFilters>(DEFAULT_INTERVIEW_FILTERS);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [recruitmentDialogOpen, setRecruitmentDialogOpen] = useState(false);
  const [editingRecruitmentId, setEditingRecruitmentId] = useState<number | null>(null);
  const [recruitmentForm, setRecruitmentForm] = useState<RecruitmentFormData>(DEFAULT_RECRUITMENT_FORM);

  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
  const [interviewForm, setInterviewForm] = useState<InterviewFormData>(DEFAULT_INTERVIEW_FORM);

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(DEFAULT_SHARE_FORM);

  const [arrangeInfo, setArrangeInfo] = useState<ArrangeInterviewData>(DEFAULT_ARRANGE_INFO);
  const [arrangeForm, setArrangeForm] = useState<ArrangeInterviewFormData>(DEFAULT_ARRANGE_FORM);
  const [recognizedInterviews, setRecognizedInterviews] = useState<InterviewItem[]>([]);
  const [recognizing, setRecognizing] = useState(false);

  const [tableUploading, setTableUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<RecruitmentItem[]>(API_URL);
      const normalized = (response.data || [])
        .map(normalizeRecruitment)
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority || "medium"] || 0) - (priorityOrder[a.priority || "medium"] || 0);
        });
      setItems(normalized);
    } catch (error) {
      console.error(error);
      toast.error("获取招聘数据失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInterviews = useCallback(async () => {
    try {
      const response = await api.get<InterviewItem[]>("/api/interviews");
      const all = (response.data || []).map(normalizeInterview);
      const filtered = all.filter((item) => !item.type || item.type === "social");
      filtered.sort((a, b) => new Date(b.interviewTime || 0).getTime() - new Date(a.interviewTime || 0).getTime());
      setInterviews(filtered);
    } catch (error) {
      console.error(error);
      toast.error("获取面试数据失败");
    }
  }, []);

  const loadFocusInterviews = useCallback(async () => {
    try {
      const response = await api.get<InterviewItem[]>("/api/interviews");
      const all = (response.data || []).map(normalizeInterview);
      const filtered = all
        .filter((item) => item.isKeyFocus && (!item.type || item.type === "social"))
        .sort((a, b) => new Date(b.interviewTime || 0).getTime() - new Date(a.interviewTime || 0).getTime());
      setFocusInterviews(filtered);
    } catch (error) {
      console.error(error);
      toast.error("获取重点关注名单失败");
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (currentView === "social-interview-board" || currentView === "social-arrange-interview") {
      void loadInterviews();
    }
    if (currentView === "social-interview-focus") {
      void loadFocusInterviews();
    }
  }, [currentView, loadInterviews, loadFocusInterviews]);

  const recruitingItems = useMemo(() => {
    const filtered = items
      .filter((item) => (!item.type || item.type === "social") && item.status === "recruiting")
      .filter((item) => item.position.toLowerCase().includes(positionFilter.toLowerCase()));
    return filtered;
  }, [items, positionFilter]);

  const completedItems = useMemo(() => {
    const filtered = items
      .filter((item) => (!item.type || item.type === "social") && item.status === "completed")
      .filter((item) => item.position.toLowerCase().includes(positionFilter.toLowerCase()));
    return filtered;
  }, [items, positionFilter]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      if (
        interviewFilters.position &&
        !interview.position.toLowerCase().includes(interviewFilters.position.toLowerCase())
      ) {
        return false;
      }
      if (
        interviewFilters.candidateName &&
        !interview.candidateName.toLowerCase().includes(interviewFilters.candidateName.toLowerCase())
      ) {
        return false;
      }
      if (
        interviewFilters.interviewer &&
        !(interview.interviewer || "").toLowerCase().includes(interviewFilters.interviewer.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [interviews, interviewFilters]);

  const positionInterviews = useMemo(() => {
    if (!arrangeInfo.positionId) {
      return [];
    }
    return interviews.filter(
      (interview) =>
        interview.positionId === arrangeInfo.positionId ||
        (interview.position === arrangeInfo.position &&
          interview.department === arrangeInfo.department &&
          interview.interviewer === arrangeInfo.recruiter)
    );
  }, [interviews, arrangeInfo]);

  const openCreateRecruitment = () => {
    setEditingRecruitmentId(null);
    setRecruitmentForm(DEFAULT_RECRUITMENT_FORM);
    setRecruitmentDialogOpen(true);
  };

  const openEditRecruitment = (item: RecruitmentItem) => {
    setEditingRecruitmentId(item.id);
    setRecruitmentForm({
      position: item.position || "",
      experience: item.experience || "",
      education: item.education || "",
      salary: item.salary || "",
      recruitmentType: item.recruitmentType || "",
      location: item.location || "",
      department: item.department || "",
      count: item.count || 1,
      recruiter: item.recruiter || "",
      remarks: item.remarks || "",
      priority: (item.priority as "high" | "medium" | "low") || "medium"
    });
    setRecruitmentDialogOpen(true);
  };

  const saveRecruitment = async () => {
    if (!recruitmentForm.position.trim()) {
      toast.warning("请输入岗位名称");
      return;
    }

    const payload = {
      ...recruitmentForm,
      type: "social",
      status: editingRecruitmentId ? undefined : "recruiting"
    };

    try {
      setSaving(true);
      if (editingRecruitmentId) {
        const current = items.find((item) => item.id === editingRecruitmentId);
        await api.put(`${API_URL}/${editingRecruitmentId}`, {
          ...current,
          ...payload,
          status: current?.status || "recruiting"
        });
        toast.success("岗位已更新");
      } else {
        await api.post(API_URL, {
          ...payload,
          status: "recruiting"
        });
        toast.success("岗位已创建");
      }
      setRecruitmentDialogOpen(false);
      setEditingRecruitmentId(null);
      setRecruitmentForm(DEFAULT_RECRUITMENT_FORM);
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("保存岗位失败");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecruitment = async (id: number) => {
    if (!window.confirm("确定删除该岗位吗？")) {
      return;
    }
    try {
      await api.delete(`${API_URL}/${id}`);
      setSelectedItemIds((prev) => prev.filter((itemId) => itemId !== id));
      toast.success("删除成功");
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("删除失败");
    }
  };

  const updateRecruitmentStatus = async (id: number, status: "recruiting" | "completed") => {
    const current = items.find((item) => item.id === id);
    if (!current) {
      return;
    }
    try {
      await api.put(`${API_URL}/${id}`, { ...current, status });
      toast.success(status === "completed" ? "已标记为完成" : "已恢复到招聘中");
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("更新状态失败");
    }
  };

  const toggleSelection = (id: number, checked: boolean) => {
    setSelectedItemIds((prev) => {
      if (checked) {
        return [...new Set([...prev, id])];
      }
      return prev.filter((itemId) => itemId !== id);
    });
  };

  const toggleSelectAllRecruiting = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(recruitingItems.map((item) => item.id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const batchDeleteRecruiting = async () => {
    if (selectedItemIds.length === 0) {
      toast.warning("请先选择需要删除的岗位");
      return;
    }
    if (!window.confirm(`确定删除选中的 ${selectedItemIds.length} 个岗位吗？`)) {
      return;
    }
    try {
      for (const id of selectedItemIds) {
        await api.delete(`${API_URL}/${id}`);
      }
      toast.success(`已删除 ${selectedItemIds.length} 个岗位`);
      setSelectedItemIds([]);
      await fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("批量删除失败");
    }
  };

  const exportRecruitment = (status: "recruiting" | "completed") => {
    const target = (status === "recruiting" ? recruitingItems : completedItems).map(normalizeRecruitment);
    if (target.length === 0) {
      toast.warning("暂无可导出的招聘数据");
      return;
    }
    const headers = [
      "岗位名称",
      "经验",
      "学历",
      "薪资范围",
      "招聘类型",
      "工作地点",
      "招聘人数",
      "部门",
      "招聘人",
      "优先级",
      "招聘状态",
      "当日推荐简历",
      "创建时间",
      "更新时间"
    ];
    const rows = target.map((item) => [
      item.position,
      item.experience || "",
      item.education || "",
      item.salary || "",
      item.recruitmentType || "",
      item.location || "",
      `${item.count || 0}人`,
      item.department || "",
      item.recruiter || "",
      getPriorityLabel(item.priority),
      item.status === "completed" ? "已完成" : "招聘中",
      `${item.resumeCount || 0}份`,
      formatDateTime(item.createdAt),
      formatDateTime(item.updatedAt)
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "招聘数据");
    XLSX.writeFile(wb, `${status === "recruiting" ? "招聘中" : "已完成"}_${toExportDate()}.xlsx`);
    toast.success("导出成功");
  };

  const handleTableUpload = async (file: File) => {
    setTableUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

      if (rows.length === 0) {
        toast.warning("表格没有可导入的数据");
        return;
      }

      const existing = (await api.get<RecruitmentItem[]>(API_URL)).data.map(normalizeRecruitment);
      let added = 0;
      let updated = 0;

      for (const row of rows) {
        const payload = {
          position: String(row["需求岗位"] || row["需求岗位名称"] || row["岗位名称"] || "").trim(),
          experience: "",
          education: "",
          salary: String(row["挂出计划"] || row["薪资范围"] || ""),
          recruitmentType: String(row["招聘类型"] || ""),
          location: String(row["工作地点"] || ""),
          department: String(row["大部门"] || row["部门"] || ""),
          count: Number(row["需求人数"] || row["招聘人数"] || 1),
          recruiter: String(row["面试官"] || row["招聘人"] || ""),
          remarks: String(
            row["备注（聚焦出海与人才结构焕新）"] || row["备注(聚焦出海与人才结构收新)"] || row["备注"] || ""
          ),
          priority: "medium",
          type: "social",
          status: "recruiting"
        };
        if (!payload.position) {
          continue;
        }
        const duplicated = existing.find(
          (item) => item.position === payload.position && (item.department || "") === payload.department
        );
        if (duplicated) {
          await api.put(`${API_URL}/${duplicated.id}`, { ...duplicated, ...payload });
          updated += 1;
        } else {
          await api.post(API_URL, payload);
          added += 1;
        }
      }

      await fetchItems();
      toast.success(`导入完成：新增 ${added} 条，更新 ${updated} 条`);
    } catch (error) {
      console.error(error);
      toast.error("解析表格失败");
    } finally {
      setTableUploading(false);
    }
  };

  const openAddInterview = (item: RecruitmentItem) => {
    setEditingInterviewId(null);
    setInterviewForm({
      ...DEFAULT_INTERVIEW_FORM,
      positionId: item.id,
      position: item.position,
      interviewer: item.recruiter || ""
    });
    setInterviewDialogOpen(true);
  };

  const openEditInterview = (item: InterviewItem) => {
    setEditingInterviewId(item.id);
    setInterviewForm({
      positionId: item.positionId || null,
      position: item.position,
      candidateName: item.candidateName,
      phone: item.phone || "",
      interviewTime: toDatetimeInputValue(item.interviewTime),
      interviewer: item.interviewer || "",
      interviewType: (item.interviewType as "phone" | "video" | "onsite") || "video",
      type: item.type || "social",
      isKeyFocus: Boolean(item.isKeyFocus),
      school: item.school || "",
      major: item.major || "",
      remarks: item.remarks || ""
    });
    setInterviewDialogOpen(true);
  };

  const saveInterview = async () => {
    if (!interviewForm.candidateName.trim()) {
      toast.warning("请输入候选人姓名");
      return;
    }
    if (!interviewForm.interviewTime) {
      toast.warning("请选择面试时间");
      return;
    }
    if (!interviewForm.interviewer.trim()) {
      toast.warning("请输入面试官");
      return;
    }

    const payload = {
      ...interviewForm,
      type: "social"
    };

    try {
      setSaving(true);
      if (editingInterviewId) {
        await api.put(`/api/interviews/${editingInterviewId}`, payload);
        toast.success("面试安排已更新");
      } else {
        await api.post("/api/interviews", payload);
        toast.success("面试安排已添加");
      }
      setInterviewDialogOpen(false);
      setEditingInterviewId(null);
      setInterviewForm(DEFAULT_INTERVIEW_FORM);
      await loadInterviews();
      if (currentView === "social-interview-focus") {
        await loadFocusInterviews();
      }
    } catch (error) {
      console.error(error);
      toast.error("保存面试安排失败");
    } finally {
      setSaving(false);
    }
  };

  const deleteInterview = async (id: number) => {
    if (!window.confirm("确定删除该面试安排吗？")) {
      return;
    }
    try {
      await api.delete(`/api/interviews/${id}`);
      toast.success("删除成功");
      await loadInterviews();
      await loadFocusInterviews();
    } catch (error) {
      console.error(error);
      toast.error("删除失败");
    }
  };

  const toggleInterviewComplete = async (item: InterviewItem, checked: boolean) => {
    try {
      await api.put(`/api/interviews/${item.id}`, { ...item, isCompleted: checked });
      toast.success(checked ? "已标记完成" : "已取消完成标记");
      await loadInterviews();
    } catch (error) {
      console.error(error);
      toast.error("更新完成状态失败");
    }
  };

  const openFeedbackDialog = (item: InterviewItem) => {
    setFeedbackForm({
      id: item.id,
      position: item.position,
      candidateName: item.candidateName,
      interviewTime: item.interviewTime || "",
      feedback: item.feedback || "",
      shareId: item.shareId || "",
      shareLink: item.shareLink || "",
      feedbackSubmitted: Boolean(item.feedbackSubmitted)
    });
    setFeedbackDialogOpen(true);
  };

  const generateShareLink = async () => {
    try {
      const response = await api.post<{ shareId: string; shareLink: string }>(
        `/api/interviews/${feedbackForm.id}/generate-share-link`
      );
      setFeedbackForm((prev) => ({
        ...prev,
        shareId: response.data.shareId,
        shareLink: response.data.shareLink
      }));
      toast.success("分享链接已生成");
    } catch (error) {
      console.error(error);
      toast.error("生成分享链接失败");
    }
  };

  const copyShareLink = async () => {
    if (!feedbackForm.shareLink) {
      toast.warning("请先生成分享链接");
      return;
    }
    try {
      await navigator.clipboard.writeText(feedbackForm.shareLink);
      toast.success("链接已复制到剪贴板");
    } catch (error) {
      console.error(error);
      toast.error("复制失败");
    }
  };

  const submitFeedback = async () => {
    try {
      await api.put(`/api/interviews/${feedbackForm.id}`, { feedback: feedbackForm.feedback });
      toast.success("反馈已保存");
      setFeedbackDialogOpen(false);
      await loadInterviews();
      await loadFocusInterviews();
    } catch (error) {
      console.error(error);
      toast.error("保存反馈失败");
    }
  };

  const updateAllShareLinks = async () => {
    try {
      const response = await api.post<{ success: boolean; message: string }>("/api/interviews/update-share-links");
      if (response.data.success) {
        toast.success(response.data.message);
        await loadInterviews();
      }
    } catch (error) {
      console.error(error);
      toast.error("批量更新分享链接失败");
    }
  };

  const exportInterviewBoard = () => {
    if (interviews.length === 0) {
      toast.warning("暂无面试安排可导出");
      return;
    }
    const headers = [
      "岗位",
      "候选人姓名",
      "联系电话",
      "面试时间",
      "面试类型",
      "面试官",
      "重点关注",
      "面试反馈",
      "备注",
      "创建时间"
    ];
    const rows = interviews.map((item) => [
      item.position,
      item.candidateName,
      item.phone || "",
      formatDateTime(item.interviewTime),
      getInterviewTypeText(item.interviewType),
      item.interviewer || "",
      item.isKeyFocus ? "是" : "否",
      item.feedback || "未填写",
      item.remarks || "",
      formatDateTime(item.createdAt)
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "面试安排");
    XLSX.writeFile(wb, `面试安排_${toExportDate()}.xlsx`);
    toast.success("导出成功");
  };

  const exportFocusList = () => {
    if (focusInterviews.length === 0) {
      toast.warning("暂无重点关注名单可导出");
      return;
    }
    const headers = ["岗位", "候选人姓名", "联系电话", "面试时间", "面试类型", "面试官", "备注", "创建时间"];
    const rows = focusInterviews.map((item) => [
      item.position,
      item.candidateName,
      item.phone || "",
      formatDateTime(item.interviewTime),
      getInterviewTypeText(item.interviewType),
      item.interviewer || "",
      item.remarks || "",
      formatDateTime(item.createdAt)
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "重点关注名单");
    XLSX.writeFile(wb, `重点关注名单_${toExportDate()}.xlsx`);
    toast.success("导出成功");
  };

  const exportPositionInterviews = () => {
    if (positionInterviews.length === 0) {
      toast.warning("当前岗位暂无面试安排");
      return;
    }
    const headers = ["候选人姓名", "联系电话", "面试时间", "面试类型", "面试官", "重点关注", "面试反馈", "备注"];
    const rows = positionInterviews.map((item) => [
      item.candidateName,
      item.phone || "",
      formatDateTime(item.interviewTime),
      getInterviewTypeText(item.interviewType),
      item.interviewer || "",
      item.isKeyFocus ? "是" : "否",
      item.feedback || "未填写",
      item.remarks || ""
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "岗位面试安排");
    XLSX.writeFile(wb, `${arrangeInfo.position}_面试安排_${toExportDate()}.xlsx`);
    toast.success("导出成功");
  };

  const goToArrangeInterview = (item: RecruitmentItem) => {
    setArrangeInfo({
      positionId: item.id,
      position: item.position,
      department: item.department || "",
      recruitmentType: item.recruitmentType || "",
      location: item.location || "",
      recruiter: item.recruiter || ""
    });
    setArrangeForm({
      ...DEFAULT_ARRANGE_FORM,
      interviewer: item.recruiter || ""
    });
    setRecognizedInterviews([]);
    setCurrentView("social-arrange-interview");
  };

  const resetArrangeInterview = () => {
    setArrangeForm(DEFAULT_ARRANGE_FORM);
    setRecognizedInterviews([]);
  };

  const backFromArrangeInterview = () => {
    resetArrangeInterview();
    setCurrentView("social-recruiting");
  };

  const submitArrangeInterview = async () => {
    if (!arrangeForm.candidateName.trim()) {
      toast.warning("请输入候选人姓名");
      return;
    }
    if (!arrangeForm.interviewTime) {
      toast.warning("请选择面试时间");
      return;
    }
    if (!arrangeForm.interviewer.trim()) {
      toast.warning("请输入面试官");
      return;
    }
    try {
      await api.post("/api/interviews", {
        positionId: arrangeInfo.positionId,
        position: arrangeInfo.position,
        department: arrangeInfo.department,
        candidateName: arrangeForm.candidateName,
        phone: arrangeForm.phone,
        interviewTime: arrangeForm.interviewTime,
        interviewer: arrangeForm.interviewer,
        interviewType: arrangeForm.interviewType,
        type: "social",
        isKeyFocus: arrangeForm.isKeyFocus,
        school: "",
        major: "",
        remarks: arrangeForm.remarks
      });
      toast.success("面试安排成功");
      setArrangeForm({
        ...DEFAULT_ARRANGE_FORM,
        interviewer: arrangeInfo.recruiter
      });
      await loadInterviews();
    } catch (error) {
      console.error(error);
      toast.error("安排面试失败");
    }
  };

  const callInterviewRecognition = async (imageBase64: string): Promise<InterviewItem[]> => {
    const response = await api.post<{ success: boolean; interviews: InterviewItem[]; error?: string }>(
      "/api/llm/interview-recognition",
      {
        image: imageBase64
      }
    );
    if (!response.data.success) {
      throw new Error(response.data.error || "识别失败");
    }
    return response.data.interviews || [];
  };

  const addRecognizedInterviews = async (list: InterviewItem[]) => {
    const existing = (await api.get<InterviewItem[]>("/api/interviews")).data.map(normalizeInterview);
    let added = 0;
    let updated = 0;
    for (const interview of list) {
      const payload = {
        candidateName: interview.candidateName || "",
        position: interview.position || arrangeInfo.position || "",
        department: arrangeInfo.department || "",
        phone: interview.phone || "",
        interviewTime: interview.interviewTime || "",
        interviewer: arrangeInfo.recruiter || interview.interviewer || "",
        interviewType: interview.interviewType || "video",
        type: "social",
        isKeyFocus: Boolean(interview.isKeyFocus),
        remarks: interview.remarks || "",
        positionId: arrangeInfo.positionId
      };
      if (!payload.candidateName || !payload.position) {
        continue;
      }
      const duplicated = existing.find(
        (item) =>
          item.candidateName === payload.candidateName &&
          item.position === payload.position &&
          (item.phone || "") === payload.phone &&
          (item.department || "") === payload.department &&
          (item.interviewer || "") === payload.interviewer
      );
      if (duplicated) {
        await api.put(`/api/interviews/${duplicated.id}`, { ...duplicated, ...payload });
        updated += 1;
      } else {
        await api.post("/api/interviews", payload);
        added += 1;
      }
    }
    toast.success(`识别处理完成：新增 ${added} 条，更新 ${updated} 条`);
    await loadInterviews();
  };

  const processInterviewImage = async (file: File, mode: "board" | "arrange") => {
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过 5MB");
      return;
    }
    try {
      setRecognizing(true);
      toast.info("正在调用大模型识别面试安排...");
      const base64 = await fileToBase64(file);
      const recognized = await callInterviewRecognition(base64);
      if (recognized.length === 0) {
        toast.warning("未识别到面试信息，请检查图片清晰度");
        return;
      }
      if (mode === "board") {
        await addRecognizedInterviews(recognized);
      } else {
        const enriched = recognized.map((item) => ({
          ...normalizeInterview(item),
          positionId: arrangeInfo.positionId,
          position: arrangeInfo.position || item.position || "",
          interviewer: arrangeInfo.recruiter || item.interviewer || "",
          type: "social",
          isKeyFocus: false
        }));
        setRecognizedInterviews((prev) => [...prev, ...enriched]);
        toast.success(`识别成功，共 ${enriched.length} 条，已加入预览列表`);
      }
    } catch (error) {
      console.error(error);
      const message = (error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error;
      toast.error(message || (error as Error).message || "识别失败");
    } finally {
      setRecognizing(false);
    }
  };

  const submitRecognizedFromArrange = async () => {
    if (recognizedInterviews.length === 0) {
      toast.warning("暂无识别结果");
      return;
    }
    try {
      await addRecognizedInterviews(recognizedInterviews);
      setRecognizedInterviews([]);
    } catch (error) {
      console.error(error);
      toast.error("批量添加识别结果失败");
    }
  };

  const renderRecruitingView = () => {
    const allSelected =
      recruitingItems.length > 0 && recruitingItems.every((item) => selectedItemIds.includes(item.id));

    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">招聘岗位池</CardTitle>
              <CardDescription>导入岗位、筛选、批量处理并快速安排面试</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openCreateRecruitment}>
                <Plus className="mr-1 h-4 w-4" />
                新增岗位
              </Button>
              <Button variant="outline" onClick={() => exportRecruitment("recruiting")}>
                <Download className="mr-1 h-4 w-4" />
                导出
              </Button>
              <Button variant="destructive" onClick={batchDeleteRecruiting} disabled={selectedItemIds.length === 0}>
                <Trash2 className="mr-1 h-4 w-4" />
                批量删除 ({selectedItemIds.length})
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                {tableUploading ? "导入中..." : "导入表格"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleTableUpload(file);
                    }
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="按岗位名称筛选"
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleSelectAllRecruiting(Boolean(checked))} />
                  </TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>招聘类型</TableHead>
                  <TableHead>地点</TableHead>
                  <TableHead>人数</TableHead>
                  <TableHead>面试官</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[280px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruitingItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItemIds.includes(item.id)}
                        onCheckedChange={(checked) => toggleSelection(item.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.position}</TableCell>
                    <TableCell>{item.department || "-"}</TableCell>
                    <TableCell>{item.recruitmentType || "-"}</TableCell>
                    <TableCell>{item.location || "-"}</TableCell>
                    <TableCell>{item.count || 0}</TableCell>
                    <TableCell>{item.recruiter || "-"}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-none", getPriorityBadgeClass(item.priority))}>
                        {getPriorityLabel(item.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{item.remarks || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditRecruitment(item)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAddInterview(item)}>
                          <CalendarClock className="mr-1 h-3.5 w-3.5" />
                          快速面试
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => goToArrangeInterview(item)}>
                          <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                          安排面试
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void updateRecruitmentStatus(item.id, "completed")}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          完成
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteRecruitment(item.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {recruitingItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                      暂无招聘中岗位
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCompletedView = () => {
    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">已完成岗位</CardTitle>
              <CardDescription>追踪历史招聘结果并按需恢复岗位</CardDescription>
            </div>
            <Button variant="outline" onClick={() => exportRecruitment("completed")}>
              <Download className="mr-1 h-4 w-4" />
              导出
            </Button>
          </div>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="按岗位名称筛选"
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>岗位</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>地点</TableHead>
                  <TableHead>人数</TableHead>
                  <TableHead>招聘人</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[260px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.position}</TableCell>
                    <TableCell>{item.department || "-"}</TableCell>
                    <TableCell>{item.recruitmentType || "-"}</TableCell>
                    <TableCell>{item.location || "-"}</TableCell>
                    <TableCell>{item.count || 0}</TableCell>
                    <TableCell>{item.recruiter || "-"}</TableCell>
                    <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditRecruitment(item)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void updateRecruitmentStatus(item.id, "recruiting")}>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          恢复
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteRecruitment(item.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {completedItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      暂无已完成岗位
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInterviewBoardView = () => {
    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">面试安排看板</CardTitle>
              <CardDescription>筛选候选人、识别排期图片、维护反馈与分享链接</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exportInterviewBoard}>
                <Download className="mr-1 h-4 w-4" />
                导出面试安排
              </Button>
              <Button variant="outline" onClick={() => void updateAllShareLinks()}>
                <RefreshCw className="mr-1 h-4 w-4" />
                更新分享链接
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                {recognizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI识别面试图
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void processInterviewImage(file, "board");
                    }
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="按岗位筛选"
              value={interviewFilters.position}
              onChange={(event) => setInterviewFilters((prev) => ({ ...prev, position: event.target.value }))}
            />
            <Input
              placeholder="按候选人筛选"
              value={interviewFilters.candidateName}
              onChange={(event) => setInterviewFilters((prev) => ({ ...prev, candidateName: event.target.value }))}
            />
            <div className="flex gap-2">
              <Input
                placeholder="按面试官筛选"
                value={interviewFilters.interviewer}
                onChange={(event) => setInterviewFilters((prev) => ({ ...prev, interviewer: event.target.value }))}
              />
              <Button variant="outline" onClick={() => setInterviewFilters(DEFAULT_INTERVIEW_FILTERS)}>
                清空
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>完成</TableHead>
                  <TableHead>候选人</TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>面试时间</TableHead>
                  <TableHead>面试官</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>重点</TableHead>
                  <TableHead>反馈</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[240px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterviews.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(item.isCompleted ? "bg-slate-100/90 text-slate-500" : "")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={Boolean(item.isCompleted)}
                        onCheckedChange={(checked) => void toggleInterviewComplete(item, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.candidateName}</TableCell>
                    <TableCell>{item.position}</TableCell>
                    <TableCell>{item.phone || "-"}</TableCell>
                    <TableCell>{formatDateTime(item.interviewTime)}</TableCell>
                    <TableCell>{item.interviewer || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getInterviewTypeText(item.interviewType)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={item.isKeyFocus ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}>
                        {item.isKeyFocus ? "是" : "否"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">{item.feedback || "未填写"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{item.remarks || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openFeedbackDialog(item)}>
                          <Link2 className="mr-1 h-3.5 w-3.5" />
                          反馈
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditInterview(item)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteInterview(item.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInterviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-slate-500">
                      暂无匹配的面试安排
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFocusView = () => {
    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">重点关注名单</CardTitle>
              <CardDescription>重点候选人统一跟踪</CardDescription>
            </div>
            <Button variant="outline" onClick={exportFocusList}>
              <Download className="mr-1 h-4 w-4" />
              导出名单
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>候选人</TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>面试时间</TableHead>
                  <TableHead>面试官</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[220px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {focusInterviews.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.candidateName}</TableCell>
                    <TableCell>{item.position}</TableCell>
                    <TableCell>{item.department || "-"}</TableCell>
                    <TableCell>{item.phone || "-"}</TableCell>
                    <TableCell>{formatDateTime(item.interviewTime)}</TableCell>
                    <TableCell>{item.interviewer || "-"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{item.remarks || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openFeedbackDialog(item)}>
                          <Link2 className="mr-1 h-3.5 w-3.5" />
                          反馈
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditInterview(item)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteInterview(item.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {focusInterviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      暂无重点关注候选人
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderArrangeInterviewView = () => {
    return (
      <div className="space-y-5">
        <Card className="border-cyan-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">安排面试</CardTitle>
                <CardDescription>当前岗位：{arrangeInfo.position || "-"}</CardDescription>
              </div>
              <Button variant="outline" onClick={backFromArrangeInterview}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回招聘中
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <InfoPill label="岗位" value={arrangeInfo.position} />
              <InfoPill label="部门" value={arrangeInfo.department} />
              <InfoPill label="招聘类型" value={arrangeInfo.recruitmentType} />
              <InfoPill label="地点" value={arrangeInfo.location} />
              <InfoPill label="面试官" value={arrangeInfo.recruiter} />
              <InfoPill label="历史面试数" value={String(positionInterviews.length)} />
            </div>
          </CardHeader>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">手动新增面试</CardTitle>
            <CardDescription>支持单条录入，也支持下方 AI 识别批量导入</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Field label="候选人姓名">
                <Input
                  value={arrangeForm.candidateName}
                  onChange={(event) => setArrangeForm((prev) => ({ ...prev, candidateName: event.target.value }))}
                />
              </Field>
              <Field label="联系电话">
                <Input
                  value={arrangeForm.phone}
                  onChange={(event) => setArrangeForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </Field>
              <Field label="面试时间">
                <Input
                  type="datetime-local"
                  value={arrangeForm.interviewTime}
                  onChange={(event) => setArrangeForm((prev) => ({ ...prev, interviewTime: event.target.value }))}
                />
              </Field>
              <Field label="面试官">
                <Input
                  value={arrangeForm.interviewer}
                  onChange={(event) => setArrangeForm((prev) => ({ ...prev, interviewer: event.target.value }))}
                />
              </Field>
              <Field label="面试类型">
                <Select
                  value={arrangeForm.interviewType}
                  onValueChange={(value) =>
                    setArrangeForm((prev) => ({
                      ...prev,
                      interviewType: value as ArrangeInterviewFormData["interviewType"]
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPE_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="重点关注">
                <div className="flex h-10 items-center rounded-md border border-input px-3">
                  <Checkbox
                    checked={arrangeForm.isKeyFocus}
                    onCheckedChange={(checked) => setArrangeForm((prev) => ({ ...prev, isKeyFocus: Boolean(checked) }))}
                  />
                  <span className="ml-2 text-sm text-slate-700">标记为重点关注候选人</span>
                </div>
              </Field>
            </div>

            <Field label="备注">
              <Textarea
                value={arrangeForm.remarks}
                onChange={(event) => setArrangeForm((prev) => ({ ...prev, remarks: event.target.value }))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void submitArrangeInterview()}>
                <Plus className="mr-1 h-4 w-4" />
                添加面试
              </Button>
              <Button
                variant="outline"
                onClick={() => setArrangeForm({ ...DEFAULT_ARRANGE_FORM, interviewer: arrangeInfo.recruiter })}
              >
                重置表单
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">AI 识别批量导入</CardTitle>
                <CardDescription>上传面试安排截图，自动提取候选人信息</CardDescription>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                {recognizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                上传图片识别
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void processInterviewImage(file, "arrange");
                    }
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void submitRecognizedFromArrange()} disabled={recognizedInterviews.length === 0}>
                <FileUp className="mr-1 h-4 w-4" />
                提交识别结果 ({recognizedInterviews.length})
              </Button>
              <Button variant="outline" onClick={() => setRecognizedInterviews([])} disabled={recognizedInterviews.length === 0}>
                清空预览
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>候选人</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>面试官</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recognizedInterviews.map((item, index) => (
                    <TableRow key={`${item.candidateName}-${item.phone}-${index}`}>
                      <TableCell>{item.candidateName}</TableCell>
                      <TableCell>{item.phone || "-"}</TableCell>
                      <TableCell>{item.interviewTime || "-"}</TableCell>
                      <TableCell>{getInterviewTypeText(item.interviewType)}</TableCell>
                      <TableCell>{arrangeInfo.recruiter || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setRecognizedInterviews((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
                          }
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recognizedInterviews.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-slate-500">
                        暂无识别结果
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">当前岗位面试列表</CardTitle>
                <CardDescription>已安排到该岗位的面试记录</CardDescription>
              </div>
              <Button variant="outline" onClick={exportPositionInterviews}>
                <Download className="mr-1 h-4 w-4" />
                导出当前岗位面试
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>候选人</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>面试时间</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>面试官</TableHead>
                    <TableHead>重点</TableHead>
                    <TableHead>反馈</TableHead>
                    <TableHead className="w-[220px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionInterviews.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.candidateName}</TableCell>
                      <TableCell>{item.phone || "-"}</TableCell>
                      <TableCell>{formatDateTime(item.interviewTime)}</TableCell>
                      <TableCell>{getInterviewTypeText(item.interviewType)}</TableCell>
                      <TableCell>{item.interviewer || "-"}</TableCell>
                      <TableCell>{item.isKeyFocus ? "是" : "否"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{item.feedback || "未填写"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditInterview(item)}>
                            编辑
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openFeedbackDialog(item)}>
                            反馈
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void deleteInterview(item.id)}>
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {positionInterviews.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-slate-500">
                        该岗位暂无面试安排
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(8,145,178,0.14),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(234,88,12,0.11),transparent_32%),linear-gradient(180deg,#f8fbfc_0%,#f6f8fa_42%,#eef3f7_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1700px] grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr] lg:p-6">
        <aside className="rounded-3xl border border-cyan-200/70 bg-white/85 p-5 shadow-2xl shadow-cyan-900/10 backdrop-blur">
          <div className="rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-4 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-50/90">Talent Intelligence</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">风行智聘</h1>
            <p className="mt-1 text-xs text-cyan-50/90">Next.js + TypeScript + shadcn/ui</p>
          </div>

          <div className="mt-5 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCurrentView(item.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                  currentView === item.key
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-700/25"
                    : "bg-slate-50 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800"
                )}
              >
                <span>{item.label}</span>
                {currentView === item.key && <span className="h-2 w-2 rounded-full bg-amber-300" />}
              </button>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p>招聘中岗位：{recruitingItems.length}</p>
            <p className="mt-1">面试安排：{interviews.length}</p>
            <p className="mt-1">重点关注：{focusInterviews.length}</p>
          </div>
        </aside>

        <main className="space-y-4">
          <Card className="border-cyan-200/70 bg-white/90 shadow-lg shadow-cyan-900/5 backdrop-blur">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl tracking-tight">{VIEW_TITLE[currentView]}</CardTitle>
                <CardDescription>招聘全流程管理面板，支持结构化导入与 AI 辅助识别</CardDescription>
              </div>
              <Button variant="outline" onClick={() => void fetchItems()} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                刷新
              </Button>
            </CardHeader>
          </Card>

          {currentView === "social-recruiting" && renderRecruitingView()}
          {currentView === "social-completed" && renderCompletedView()}
          {currentView === "social-interview-board" && renderInterviewBoardView()}
          {currentView === "social-interview-focus" && renderFocusView()}
          {currentView === "social-arrange-interview" && renderArrangeInterviewView()}
        </main>
      </div>

      <Dialog open={recruitmentDialogOpen} onOpenChange={setRecruitmentDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{editingRecruitmentId ? "编辑招聘岗位" : "新增招聘岗位"}</DialogTitle>
            <DialogDescription>维护岗位基础信息，字段会同步到后端 `/api/recruitment`</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="岗位名称">
              <Input
                value={recruitmentForm.position}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, position: event.target.value }))}
              />
            </Field>
            <Field label="招聘人数">
              <Input
                type="number"
                min={1}
                value={recruitmentForm.count}
                onChange={(event) =>
                  setRecruitmentForm((prev) => ({ ...prev, count: Math.max(1, Number(event.target.value || 1)) }))
                }
              />
            </Field>
            <Field label="经验要求">
              <Input
                value={recruitmentForm.experience}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, experience: event.target.value }))}
              />
            </Field>
            <Field label="学历要求">
              <Input
                value={recruitmentForm.education}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, education: event.target.value }))}
              />
            </Field>
            <Field label="薪资范围">
              <Input
                value={recruitmentForm.salary}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, salary: event.target.value }))}
              />
            </Field>
            <Field label="招聘类型">
              <Input
                value={recruitmentForm.recruitmentType}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, recruitmentType: event.target.value }))}
                placeholder="社招 / 校招 / 实习"
              />
            </Field>
            <Field label="工作地点">
              <Input
                value={recruitmentForm.location}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, location: event.target.value }))}
              />
            </Field>
            <Field label="部门">
              <Input
                value={recruitmentForm.department}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, department: event.target.value }))}
              />
            </Field>
            <Field label="招聘人 / 面试官">
              <Input
                value={recruitmentForm.recruiter}
                onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, recruiter: event.target.value }))}
              />
            </Field>
            <Field label="优先级">
              <Select
                value={recruitmentForm.priority}
                onValueChange={(value) =>
                  setRecruitmentForm((prev) => ({ ...prev, priority: value as RecruitmentFormData["priority"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="备注">
            <Textarea
              rows={4}
              value={recruitmentForm.remarks}
              onChange={(event) => setRecruitmentForm((prev) => ({ ...prev, remarks: event.target.value }))}
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecruitmentDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void saveRecruitment()} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editingInterviewId ? "编辑面试安排" : "新增面试安排"}</DialogTitle>
            <DialogDescription>候选人信息会写入后端 `/api/interviews`</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="岗位">
              <Input value={interviewForm.position} readOnly />
            </Field>
            <Field label="候选人姓名">
              <Input
                value={interviewForm.candidateName}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, candidateName: event.target.value }))}
              />
            </Field>
            <Field label="联系电话">
              <Input
                value={interviewForm.phone}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </Field>
            <Field label="面试时间">
              <Input
                type="datetime-local"
                value={toDatetimeInputValue(interviewForm.interviewTime)}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, interviewTime: event.target.value }))}
              />
            </Field>
            <Field label="面试官">
              <Input
                value={interviewForm.interviewer}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, interviewer: event.target.value }))}
              />
            </Field>
            <Field label="面试类型">
              <Select
                value={interviewForm.interviewType}
                onValueChange={(value) =>
                  setInterviewForm((prev) => ({
                    ...prev,
                    interviewType: value as InterviewFormData["interviewType"]
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="重点关注">
              <div className="flex h-10 items-center rounded-md border border-input px-3">
                <Checkbox
                  checked={interviewForm.isKeyFocus}
                  onCheckedChange={(checked) => setInterviewForm((prev) => ({ ...prev, isKeyFocus: Boolean(checked) }))}
                />
                <span className="ml-2 text-sm">标记候选人</span>
              </div>
            </Field>
            <Field label="学校">
              <Input
                value={interviewForm.school}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, school: event.target.value }))}
              />
            </Field>
            <Field label="专业">
              <Input
                value={interviewForm.major}
                onChange={(event) => setInterviewForm((prev) => ({ ...prev, major: event.target.value }))}
              />
            </Field>
          </div>

          <Field label="备注">
            <Textarea
              rows={4}
              value={interviewForm.remarks}
              onChange={(event) => setInterviewForm((prev) => ({ ...prev, remarks: event.target.value }))}
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void saveInterview()} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>面试反馈</DialogTitle>
            <DialogDescription>
              {feedbackForm.position} / {feedbackForm.candidateName} / {formatDateTime(feedbackForm.interviewTime)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="分享链接">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void generateShareLink()}>
                    <Link2 className="mr-1 h-4 w-4" />
                    生成链接
                  </Button>
                  <Button variant="outline" onClick={() => void copyShareLink()} disabled={!feedbackForm.shareLink}>
                    <Copy className="mr-1 h-4 w-4" />
                    复制链接
                  </Button>
                </div>
                <Input value={feedbackForm.shareLink} readOnly placeholder="暂未生成分享链接" />
              </div>
            </Field>

            <Field label="反馈内容">
              <Textarea
                rows={8}
                value={feedbackForm.feedback}
                onChange={(event) => setFeedbackForm((prev) => ({ ...prev, feedback: event.target.value }))}
                placeholder="请输入面试反馈"
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void submitFeedback()}>保存反馈</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function InfoPill(props: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{props.label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{props.value || "-"}</p>
    </div>
  );
}

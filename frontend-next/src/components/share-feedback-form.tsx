"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheckBig, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { ShareInterviewInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ShareFeedbackFormProps {
  shareId: string;
}

export function ShareFeedbackForm(props: ShareFeedbackFormProps) {
  const { shareId } = props;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [interview, setInterview] = useState<ShareInterviewInfo | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const loadInterview = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get<{ success: boolean; interview: ShareInterviewInfo }>(
          `/api/interviews/share/${shareId}`
        );
        setInterview(response.data.interview);
      } catch (err) {
        const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
        setError(message || "无法获取分享信息");
      } finally {
        setLoading(false);
      }
    };

    void loadInterview();
  }, [shareId]);

  const submit = async () => {
    if (!feedback.trim()) {
      toast.warning("请先填写反馈内容");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/api/interviews/share/${shareId}/feedback`, { feedback });
      setSubmitted(true);
      toast.success("反馈提交成功");
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      toast.error(message || "反馈提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-xl">
          <CardContent className="flex h-48 items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            <span>加载中...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-xl">
          <CardContent className="space-y-4 py-12 text-center">
            <CircleAlert className="mx-auto h-12 w-12 text-red-500" />
            <p className="text-lg font-semibold">链接无效</p>
            <p className="text-sm text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-xl">
          <CardContent className="space-y-4 py-12 text-center">
            <CircleCheckBig className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="text-lg font-semibold">反馈已提交</p>
            <p className="text-sm text-slate-500">感谢你的反馈。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_15%_10%,rgba(14,165,233,0.18),transparent_35%),linear-gradient(180deg,#f8fbfd_0%,#eef5fb_100%)] px-4 py-8">
      <Card className="w-full max-w-2xl border-cyan-200/70 bg-white/90 shadow-2xl shadow-cyan-900/10 backdrop-blur">
        <CardHeader>
          <CardTitle>填写面试反馈</CardTitle>
          <CardDescription>请在提交前确认反馈内容完整准确</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <Info label="岗位" value={interview?.position || "-"} />
            <Info label="候选人" value={interview?.candidateName || "-"} />
            <Info label="时间" value={interview?.interviewTime || "-"} />
          </div>

          <div className="space-y-2">
            <Label>反馈内容</Label>
            <Textarea
              rows={9}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="请输入候选人表现、岗位匹配度、建议等"
            />
          </div>

          <Button onClick={() => void submit()} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            提交反馈
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{props.label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{props.value}</p>
    </div>
  );
}


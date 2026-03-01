import { ShareFeedbackForm } from "@/components/share-feedback-form";

interface ShareFeedbackPageProps {
  params: Promise<{
    shareId: string;
  }>;
}

export default async function ShareFeedbackPage(props: ShareFeedbackPageProps) {
  const { shareId } = await props.params;
  return <ShareFeedbackForm shareId={shareId} />;
}


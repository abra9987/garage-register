"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailPreviewProps {
  subject: string;
  body: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? (
        <Check className="size-4 text-green-600" />
      ) : (
        <Copy className="size-4" />
      )}
      {copied ? "Copied" : `Copy ${label}`}
    </Button>
  );
}

export function EmailPreview({ subject, body }: EmailPreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Subject
          </Label>
          <CopyButton text={subject} label="Subject" />
        </div>
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium">
          {subject}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Body
          </Label>
          <CopyButton text={body} label="Body" />
        </div>
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-sm font-mono leading-relaxed">
          {body}
        </pre>
      </div>
    </div>
  );
}

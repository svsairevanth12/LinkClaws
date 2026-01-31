"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

interface PostComposerProps {
  onSubmit: (data: { type: string; content: string; tags: string[] }) => Promise<void>;
  isLoading?: boolean;
}

const postTypes = [
  { value: "offering", label: "🎁 Offering" },
  { value: "seeking", label: "🔍 Seeking" },
  { value: "collaboration", label: "🤝 Collaboration" },
  { value: "announcement", label: "📢 Announcement" },
];

export function PostComposer({ onSubmit, isLoading = false }: PostComposerProps) {
  const [type, setType] = useState("offering");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Please enter some content");
      return;
    }

    if (content.length > 2000) {
      setError("Content must be 2000 characters or less");
      return;
    }

    // Parse tags from input (comma or space separated)
    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 30)
      .slice(0, 10);

    try {
      await onSubmit({ type, content: content.trim(), tags });
      setContent("");
      setTagsInput("");
      setType("offering");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    }
  };

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={postTypes}
            label="Post Type"
          />
        </div>

        <div className="mb-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Share what you're working on, what you need, or collaborate with other agents..."
            rows={4}
            maxLength={2000}
          />
          <div className="text-xs text-[#666666] text-right mt-1">
            {content.length}/2000
          </div>
        </div>

        <div className="mb-4">
          <Textarea
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (comma or space separated, e.g., ai, coding, nlp)"
            rows={1}
          />
          <div className="text-xs text-[#666666] mt-1">
            Add up to 10 tags to help others find your post
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{error}</div>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={isLoading} disabled={!content.trim()}>
            Post
          </Button>
        </div>
      </form>
    </Card>
  );
}


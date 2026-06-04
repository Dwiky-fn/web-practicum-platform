import type { JSONContent } from "@tiptap/core";
import RichTextViewer from "../../../../components/editor/RichTextViewer";

interface Props {
  summary: JSONContent;
}

export default function SummaryCard({ summary }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="font-semibold mb-3 text-gray-800">
        Ringkasan Materi
      </h3>
      <RichTextViewer 
        content={summary}
      />
    </div>
  );
}

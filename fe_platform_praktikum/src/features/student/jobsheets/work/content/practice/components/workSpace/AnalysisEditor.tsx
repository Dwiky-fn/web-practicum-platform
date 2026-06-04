import type { JSONContent } from "@tiptap/react";
import RichTextEditor from "../../../../../../../../components/editor/RichTextEditor";

interface Props {
  value: JSONContent;
  onChange: (content: JSONContent) => void;
}

export default function AnalysisEditor({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Analisis:
      </h3>

      <RichTextEditor
        value={value}
        onChange={onChange}
        editable
        placeholder="Tulis analisis hasil percobaan kamu di sini..."
      />
    </div>
  );
}
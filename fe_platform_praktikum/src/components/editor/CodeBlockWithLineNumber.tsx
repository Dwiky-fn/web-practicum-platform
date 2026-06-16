import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { createLowlight } from "lowlight";
import java from "highlight.js/lib/languages/java";
import python from "highlight.js/lib/languages/python";
import React from "react";

const lowlight = createLowlight();
lowlight.register("java", java);
lowlight.register("python", python);

const CodeBlockComponent: React.FC<NodeViewProps> = ({ node }) => {
  const code = node.textContent;
  const lines = code.split("\n");

  return (
    <NodeViewWrapper className="code-block-wrapper relative flex border border-[#dbe3ef] bg-white rounded-xl my-4 overflow-hidden select-text">
      {/* Line Numbers Column */}
      <div 
        className="line-numbers-container select-none text-right px-3 py-3.5 bg-slate-50 text-slate-500 font-mono border-r border-[#e2e8f0] flex-shrink-0" 
        contentEditable={false}
        style={{ userSelect: "none" }}
      >
        {lines.map((_, index) => (
          <div key={index} className="line-number-item text-xs font-mono" style={{ lineHeight: "1.6" }}>
            {index + 1}
          </div>
        ))}
      </div>
      {/* Code Text Area */}
      <pre className="flex-1 m-0 py-3.5 px-4 bg-transparent border-0 outline-none overflow-x-auto">
        <NodeViewContent 
          as={"code" as any} 
          className="block focus:outline-none text-xs text-slate-900 font-mono"
          style={{ lineHeight: "1.6", whiteSpace: "pre" }}
        />
      </pre>
    </NodeViewWrapper>
  );
};

export const CodeBlockWithLineNumber = CodeBlockLowlight.configure({
  lowlight,
}).extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});
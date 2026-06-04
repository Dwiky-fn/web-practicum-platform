import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { createLowlight } from "lowlight";
import java from "highlight.js/lib/languages/java";
import React from "react";

const lowlight = createLowlight();
lowlight.register("java", java);

const CodeBlockComponent: React.FC<NodeViewProps> = ({ node }) => {
  const code = node.textContent;
  const lines = code.split("\n");

  return (
    <NodeViewWrapper>
      <pre className="code-block-wrapper">
        {lines.map((line, index) => (
          <div
            key={index}
            className={`code-line ${index % 2 === 0 ? "even" : "odd"}`}
          >
            <span className="line-number">{index + 1}</span>
            <span className="line-content">{line || " "}</span>
          </div>
        ))}
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
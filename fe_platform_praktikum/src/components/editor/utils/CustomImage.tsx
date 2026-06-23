import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React, { useRef, useState, useEffect } from 'react';
import Image from '@tiptap/extension-image';

// We extend the schema attributes for our CustomImage extension
export const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => ({ src: attributes.src }),
      },
      alt: {
        default: 'Gambar pada jobsheet',
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => ({ alt: attributes.alt || 'Gambar pada jobsheet' }),
      },
      title: {
        default: null,
      },
      imageId: {
        default: null,
        parseHTML: element => element.getAttribute('data-image-id'),
        renderHTML: attributes => {
          if (!attributes.imageId) return {};
          return { 'data-image-id': attributes.imageId };
        },
      },
      widthMode: {
        default: 'custom',
        parseHTML: element => element.getAttribute('data-width-mode') || 'custom',
        renderHTML: attributes => ({ 'data-width-mode': attributes.widthMode }),
      },
      widthPx: {
        default: 640,
        parseHTML: element => {
          const val = element.getAttribute('data-width-px');
          return val ? parseInt(val, 10) : 640;
        },
        renderHTML: attributes => {
          if (attributes.widthPx === null || attributes.widthPx === undefined) return {};
          return { 'data-width-px': attributes.widthPx };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-alignment') || 'center',
        renderHTML: attributes => ({ 'data-alignment': attributes.alignment }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNode);
  },
});

function ResizableImageNode({ node, updateAttributes, editor }: any) {
  const { src, alt, widthMode, widthPx, alignment } = node.attrs;
  const isEditable = editor.isEditable;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);

  // Handle selection state
  useEffect(() => {
    if (!isEditable) return;
    const handleSelectionChange = () => {
      if (!editor || editor.isDestroyed) return;
      const { selection } = editor.state;
      let found = false;
      editor.state.doc.descendants((descNode: any, pos: number) => {
        if (descNode === node) {
          if (selection.from <= pos && selection.to >= pos + descNode.nodeSize) {
            found = true;
          }
          return false;
        }
        return true;
      });
      setIsSelected(found);
    };

    editor.on('selectionUpdate', handleSelectionChange);
    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
    };
  }, [editor, node, isEditable]);

  // Load natural width of the image
  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setNaturalWidth(img.naturalWidth);
    };
  }, [src]);

  // Apply default size rules for newly uploaded or non-dimensioned images
  useEffect(() => {
    if (naturalWidth !== null && (widthPx === 640 || !widthPx)) {
      // If natural width is smaller than 640, fit to natural width, otherwise max 640
      const defaultWidth = Math.min(naturalWidth, 640);
      if (widthPx !== defaultWidth) {
        updateAttributes({ widthPx: defaultWidth });
      }
    }
  }, [naturalWidth]);

  // Resolve current active styles based on widthMode, widthPx, alignment, and fallback logic
  const resolvedWidthMode = widthMode || 'custom';
  const resolvedAlignment = alignment || 'center';
  
  let resolvedWidthPx = widthPx;
  if (resolvedWidthPx === undefined || resolvedWidthPx === null) {
    resolvedWidthPx = 640;
  }
  if (naturalWidth !== null && resolvedWidthPx > naturalWidth) {
    resolvedWidthPx = naturalWidth;
  }

  // Margins for alignment
  let marginLeft = 'auto';
  let marginRight = 'auto';
  if (resolvedAlignment === 'left') {
    marginLeft = '0';
    marginRight = 'auto';
  } else if (resolvedAlignment === 'right') {
    marginLeft = 'auto';
    marginRight = '0';
  }

  const containerStyle: React.CSSProperties = {
    display: 'block',
    marginLeft,
    marginRight,
    width: resolvedWidthMode === 'full' ? '100%' : '100%',
    maxWidth: resolvedWidthMode === 'full' ? '100%' : `min(100%, ${resolvedWidthPx}px)`,
    position: 'relative',
  };

  const imageStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!isEditable || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = containerRef.current.getBoundingClientRect().width;
    const editorWidth = containerRef.current.closest('.ProseMirror')?.getBoundingClientRect().width || 900;
    
    // Max width is 900px, but bounded by editor width or natural width of image
    const maxWidth = Math.min(900, editorWidth, naturalWidth || 900);
    const minWidth = 160;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Since handle is on bottom-right, moving right increases width
      let newWidth = Math.round(startWidth + deltaX);
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      
      updateAttributes({
        widthMode: 'custom',
        widthPx: newWidth,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    // Select the node in editor
    if (editor && !editor.isDestroyed) {
      let resolvedPos = -1;
      editor.state.doc.descendants((descNode: any, pos: number) => {
        if (descNode === node) {
          resolvedPos = pos;
          return false;
        }
        return true;
      });
      if (resolvedPos !== -1) {
        editor.commands.setNodeSelection(resolvedPos);
      }
    }
  };

  return (
    <NodeViewWrapper className="jobsheet-rich-image-wrapper select-none" style={{ display: 'block', width: '100%', margin: '12px 0' }}>
      <div
        ref={containerRef}
        style={containerStyle}
        onClick={handleClick}
        className={`relative group/img border rounded-lg transition-all ${
          isSelected && isEditable ? 'ring-2 ring-blue-500 border-blue-500' : 'border-transparent'
        }`}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={imageStyle}
          className="rounded-lg shadow-sm"
        />

        {/* Drag handle resize - only visible when selected in editor mode */}
        {isEditable && isSelected && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-2 right-2 w-4 h-4 bg-white border border-gray-400 rounded-full shadow cursor-se-resize flex items-center justify-center z-10 hover:bg-blue-50 hover:border-blue-500"
            title="Tarik untuk mengubah ukuran gambar"
            style={{ touchAction: 'none' }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1v5H1" />
            </svg>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

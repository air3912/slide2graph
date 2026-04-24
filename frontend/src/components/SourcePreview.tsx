type SourcePreviewProps = {
  text: string;
};

export function SourcePreview({ text }: SourcePreviewProps) {
  if (!text) {
    return <div className="source-preview-empty">这里会显示提取出来的 PDF 文本。</div>;
  }

  return <pre className="source-preview">{text}</pre>;
}
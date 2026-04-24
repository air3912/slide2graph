import { useMemo, useState } from 'react';

import { AnalysisStats } from './components/AnalysisStats';
import { GraphCanvas } from './components/GraphCanvas';
import { SourcePreview } from './components/SourcePreview';
import type { PDFAnalysisResponse } from './types/graph';

const API_BASE = '';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'using',
  'use',
  'are',
  'was',
  'were',
  'been',
  'have',
  'has',
  'had',
  'can',
  'may',
  'will',
  'shall',
  'its',
  'their',
  'our',
  'your',
  'they',
  'them',
  'then',
  'than',
  'also',
  'such',
  'more',
  'most',
  'less',
  'when',
  'where',
  'what',
  'which',
  'who',
  'whom',
  'been',
  'being',
  'between',
  'among',
  'based',
  'into',
  'over',
  'under',
  'about',
  'paper',
  'model',
  'method',
  'approach',
  'results',
  'result',
  'study',
  'analysis',
  'system',
  'video',
  'image',
  'clip',
]);

function buildFallbackAnalysis(filename: string, text: string): PDFAnalysisResponse {
  const tokens = text
    .toLowerCase()
    .match(/[a-z][a-z0-9-]{2,}/g)
    ?.filter((token) => !STOP_WORDS.has(token)) ?? [];

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  const keywords = [...frequency.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([keyword]) => keyword);

  const nodes = [
    {
      id: 'document',
      label: filename.replace(/\.pdf$/i, '') || 'PDF 文档',
      type: 'document',
      level: 0,
      description: '上传的 PDF 文件',
    },
    {
      id: 'text',
      label: '提取文本',
      type: 'process',
      level: 1,
      parent_id: 'document',
      description: '后端解析得到的原始文本',
    },
    ...keywords.map((keyword, index) => ({
      id: `keyword-${index}`,
      label: keyword,
      type: 'topic',
      level: 2,
      parent_id: 'text',
      description: `文本中的高频词：${keyword}`,
    })),
  ];

  const edges = [
    { source: 'document', target: 'text', relation: 'extracts' },
    ...keywords.map((keyword, index) => ({
      source: 'text',
      target: `keyword-${index}`,
      relation: 'mentions',
      description: keyword,
      evidence: keyword,
    })),
  ];

  return {
    filename,
    text,
    character_count: text.length,
    summary: keywords.length > 0 ? `基于文本自动提取了 ${keywords.length} 个高频关键词。` : '文本已提取，但没有找到足够明显的关键词。',
    llm_model: 'local-fallback',
    knowledge_graph: {
      nodes,
      edges,
    },
  };
}

const SAMPLE_ANALYSIS: PDFAnalysisResponse = {
  filename: 'sample.pdf',
  text: 'Slide2Graph 通过解析 PDF 内容，抽取关键实体并构建知识网络。',
  character_count: 34,
  summary: '该文档描述了一个将 PDF 转成知识图谱的处理流程，包含解析、LLM 归纳与图结构输出。',
  llm_model: 'demo-model',
  knowledge_graph: {
    nodes: [
      { id: 'pdf', label: 'PDF 文档', type: 'document', description: '输入源文档' },
      { id: 'parse', label: '文本解析', type: 'process', description: '从 PDF 中提取纯文本' },
      { id: 'llm', label: 'LLM', type: 'model', description: '生成摘要和实体关系' },
      { id: 'graph', label: '知识网络', type: 'output', description: '结构化输出结果' },
    ],
    edges: [
      { source: 'pdf', target: 'parse', relation: 'extracts' },
      { source: 'parse', target: 'llm', relation: 'feeds' },
      { source: 'llm', target: 'graph', relation: 'produces' },
    ],
  },
};

export default function App() {
  const [analysis, setAnalysis] = useState<PDFAnalysisResponse | null>(SAMPLE_ANALYSIS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<'analyze' | 'extract-text'>('analyze');

  const title = useMemo(() => {
    return analysis ? `知识网络 | ${analysis.filename}` : '知识网络';
  }, [analysis]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setErrorDetails('');

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file');

    if (!(file instanceof File)) {
      setError('请先选择一个 PDF 文件。');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/pdf/${selectedEndpoint}`, {
        method: 'POST',
        body: (() => {
          const payload = new FormData();
          payload.append('file', file);
          return payload;
        })(),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({} as { detail?: string }));
        const rawDetail = typeof detail.detail === 'string' ? detail.detail : '';
        if (response.status === 503) {
          const fallbackMessage = '后端 LLM 服务不可用，请检查模型名、接口地址或上游服务状态。';
          throw new Error(rawDetail || fallbackMessage);
        }
        throw new Error(rawDetail || `请求失败: ${response.status}`);
      }

      const data = await response.json();
      if (selectedEndpoint === 'extract-text') {
        setAnalysis(buildFallbackAnalysis(data.filename, data.text));
      } else {
        setAnalysis(data);
      }
    } catch (uploadError) {
      if (uploadError instanceof TypeError) {
        setError('无法连接到后端，请确认 FastAPI 服务正在 http://127.0.0.1:8000 运行。');
        setErrorDetails('浏览器没有拿到有效响应，通常是后端没有启动、端口不对，或者代理没连上。');
        return;
      }

      const message = uploadError instanceof Error ? uploadError.message : '上传失败，请稍后重试。';
      if (message.includes('401 Unauthorized')) {
        setError('后端 LLM 鉴权失败，token 可能已失效或无效。');
        setErrorDetails(message);
      } else if (message.includes('503 Service Unavailable')) {
        setError('后端 LLM 服务返回 503，当前无法完成分析。');
        setErrorDetails(message);
      } else {
        setError('请求失败，请查看详情。');
        setErrorDetails(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="left-panel">
        <div className="hero-card">
          <p className="eyebrow">slide2graph</p>
          <h1>把 PDF 变成可视化知识图谱</h1>
          <p className="hero-copy">
            上传 PDF 后，前端会调用后端分析接口，展示摘要、节点、边和原始文本，便于调试和演示。
          </p>
        </div>

        <form className="upload-card" onSubmit={handleUpload}>
          <label className="field-label" htmlFor="file">
            选择 PDF
          </label>
          <input id="file" name="file" type="file" accept="application/pdf" required />

          <label className="field-label" htmlFor="endpoint">
            调用接口
          </label>
          <select id="endpoint" value={selectedEndpoint} onChange={(event) => setSelectedEndpoint(event.target.value as 'analyze' | 'extract-text')}>
            <option value="analyze">/api/v1/pdf/analyze（LLM 分析）</option>
            <option value="extract-text">/api/v1/pdf/extract-text（仅提取文本）</option>
          </select>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? '分析中...' : '开始分析'}
          </button>

          {error ? (
            <div className="error-panel" role="alert" aria-live="polite">
              <p className="error-text">{error}</p>
              {errorDetails ? (
                <details className="error-details">
                  <summary>查看详情</summary>
                  <p>{errorDetails}</p>
                </details>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="summary-card">
          <h2>摘要</h2>
          <p>{analysis?.summary ?? '暂无结果，先上传一个 PDF。'}</p>
        </div>

        <AnalysisStats analysis={analysis} />
      </aside>

      <main className="right-panel">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Knowledge graph</p>
            <h2>{title}</h2>
          </div>
          <div className="badge">{analysis?.llm_model ?? '等待分析'}</div>
        </header>

        <section className="visual-card">
          <GraphCanvas graph={analysis?.knowledge_graph ?? { nodes: [], edges: [] }} />
        </section>

        <section className="visual-card">
          <div className="section-header">
            <h3>原始文本</h3>
            <span>{analysis?.character_count ?? 0} 字符</span>
          </div>
          <SourcePreview text={analysis?.text ?? ''} />
        </section>
      </main>
    </div>
  );
}
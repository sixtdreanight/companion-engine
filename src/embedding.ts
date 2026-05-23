/**
 * EmbeddingProvider — 文本向量化接口，用于语义记忆检索。
 *
 * 默认 TfIdfEmbeddingProvider 零外部依赖，用于快速启动。
 * 可选接入 OpenAI embeddings 或 @xenova/transformers 本地模型。
 */

export interface EmbeddingProvider {
  /** 将文本转为向量 */
  embed(text: string): Promise<number[]>;
  /** 计算两个向量的余弦相似度 */
  similarity(a: number[], b: number[]): number;
  /** 向量维度 */
  readonly dimensions: number;
}

// ---- TF-IDF 实现（默认，零依赖） ----

interface TfIdfEntry {
  idf: number;
  tfByDoc: Map<number, number>;
}

export class TfIdfEmbeddingProvider implements EmbeddingProvider {
  private vocabulary = new Map<string, TfIdfEntry>();
  private docCount = 0;
  readonly dimensions: number;

  constructor(dimensions = 256) {
    this.dimensions = dimensions;
  }

  /** 用一组文档构建词汇表 */
  buildVocabulary(docs: string[]): void {
    this.vocabulary.clear();
    this.docCount = 0;

    for (const doc of docs) {
      const tokens = TfIdfEmbeddingProvider.tokenize(doc);
      const termSet = new Set(tokens);
      for (const term of termSet) {
        const entry = this.vocabulary.get(term) || {
          idf: 0,
          tfByDoc: new Map(),
        };
        entry.tfByDoc.set(this.docCount, (entry.tfByDoc.get(this.docCount) || 0) + 1);
        this.vocabulary.set(term, entry);
      }
      this.docCount++;
    }

    // 计算 IDF
    for (const [term, entry] of this.vocabulary) {
      entry.idf = Math.log(this.docCount / (1 + entry.tfByDoc.size));
    }
  }

  async embed(text: string): Promise<number[]> {
    const tokens = TfIdfEmbeddingProvider.tokenize(text);
    const vector = new Array(this.dimensions).fill(0);

    // 简单哈希映射：token → 维度位置
    for (const token of tokens) {
      const entry = this.vocabulary.get(token);
      if (!entry) continue;
      const tf = 1 + Math.log((entry.tfByDoc.get(this.docCount) || 0) + 1);
      const idf = entry.idf;
      const idx = TfIdfEmbeddingProvider.hashToDims(token, this.dimensions);
      vector[idx] += tf * idf;
    }

    // L2 归一化
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  similarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  // ---- 公开的工具函数 ----

  /** 分词：中文按字符切分 + bigram，英文按空格 */
  static tokenize(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\w一-鿿]/g, " ");
    const words = cleaned.split(/\s+/).filter(Boolean);

    const tokens: string[] = [];
    for (const word of words) {
      if (/^[一-鿿]/.test(word)) {
        // 中文：单字 + bigram
        const chars = [...word];
        for (const ch of chars) tokens.push(ch);
        for (let i = 0; i < chars.length - 1; i++) {
          tokens.push(chars[i] + chars[i + 1]);
        }
      } else {
        tokens.push(word);
      }
    }
    return tokens;
  }

  /** 字符串哈希到 [0, dims) */
  static hashToDims(text: string, dims: number): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % dims;
  }
}

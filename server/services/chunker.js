import crypto from 'crypto';

// RFC 4122 URL namespace -- matches Python uuid.NAMESPACE_URL
const NAMESPACE_URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

export function uuidv5(name, namespace = NAMESPACE_URL) {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = crypto
    .createHash('sha1')
    .update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')]))
    .digest();
  const bytes = Buffer.from(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Sentence-boundary chunking -- approximates LlamaIndex SentenceSplitter
// (chunk_size=1000 tokens, overlap=200 tokens) at ~4 chars/token.
export function chunkText(text, maxChars = 4000, overlap = 800) {
  const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      const tail = current.slice(-overlap);
      const tailStart = tail.search(/\s/);
      current = (tailStart >= 0 ? tail.slice(tailStart + 1) : tail) + ' ' + sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim().length > 50) {
    chunks.push(current.trim());
  }

  return chunks;
}

import * as Y from 'yjs';
import type {
  DocSnapshot,
  JsonObject,
  JsonValue,
  ParagraphKind,
  ParagraphSnapshot,
  SectionSnapshot,
} from '@vistrates/types';
import {
  META_FIELDS,
  META_KEY,
  PARAGRAPH_FIELDS,
  SCHEMA_VERSION,
  SECTIONS_KEY,
  SECTION_FIELDS,
} from './schema.js';
import { asYArrayOfYMap, asYMap, asYText, jsonToYMap, yMapToJson } from './yjsBridge.js';

export interface NewSection {
  readonly id: string;
  readonly name: string;
  readonly paragraphs?: readonly NewParagraph[];
}

export interface NewParagraph {
  readonly id: string;
  readonly kind: ParagraphKind;
  readonly name?: string;
  readonly code?: string;
  readonly data?: JsonObject;
  readonly view?: JsonObject;
  readonly props?: JsonObject;
}

/**
 * Typed wrapper over a Y.Doc for Vistrates document state.
 *
 * - All mutations go through methods that wrap `doc.transact()`.
 * - Reading via `snapshot()` returns a deep, immutable plain-JSON copy.
 * - The underlying Y.Doc is exposed via `yDoc` so collab providers
 *   (`y-indexeddb`, `y-websocket`, `y-codemirror.next`) can attach to it.
 */
export class DocStore {
  readonly yDoc: Y.Doc;

  constructor(yDoc?: Y.Doc) {
    this.yDoc = yDoc ?? new Y.Doc();
  }

  /** Initialize an empty doc with metadata. Idempotent. */
  init(opts: { id: string; title: string }): void {
    this.yDoc.transact(() => {
      const meta = this.yDoc.getMap<JsonValue>(META_KEY);
      if (!meta.has(META_FIELDS.schemaVersion)) {
        meta.set(META_FIELDS.id, opts.id);
        meta.set(META_FIELDS.title, opts.title);
        meta.set(META_FIELDS.schemaVersion, SCHEMA_VERSION);
      }
      // Touching the array materializes it inside the Y.Doc.
      this.yDoc.getArray<Y.Map<JsonValue>>(SECTIONS_KEY);
    });
  }

  /** Add a section (with optional initial paragraphs) to the end of the doc. */
  addSection(section: NewSection): void {
    this.yDoc.transact(() => {
      const sections = this.yDoc.getArray<Y.Map<JsonValue>>(SECTIONS_KEY);
      const sec = new Y.Map<JsonValue>();
      sec.set(SECTION_FIELDS.id, section.id);
      sec.set(SECTION_FIELDS.name, section.name);
      const paras = new Y.Array<Y.Map<JsonValue>>();
      sec.set(SECTION_FIELDS.paragraphs, paras as unknown as JsonValue);
      sections.push([sec]);
      for (const p of section.paragraphs ?? []) {
        paras.push([this.#buildParagraph(p)]);
      }
    });
  }

  /** Append a paragraph to an existing section by section id. */
  addParagraph(sectionId: string, paragraph: NewParagraph): void {
    this.yDoc.transact(() => {
      const sec = this.#findSection(sectionId);
      if (!sec) throw new Error(`section not found: ${sectionId}`);
      const paras = asYArrayOfYMap(sec.get(SECTION_FIELDS.paragraphs));
      paras.push([this.#buildParagraph(paragraph)]);
    });
  }

  /** Replace the code of a paragraph. */
  setParagraphCode(sectionId: string, paragraphId: string, code: string): void {
    this.yDoc.transact(() => {
      const para = this.#findParagraph(sectionId, paragraphId);
      if (!para) throw new Error(`paragraph not found: ${sectionId}/${paragraphId}`);
      const existingCode = para.get(PARAGRAPH_FIELDS.code);
      if (existingCode instanceof Y.Text) {
        // Replace contents (delete then insert) to keep the same Y.Text identity
        existingCode.delete(0, existingCode.length);
        existingCode.insert(0, code);
      } else {
        const text = new Y.Text(code);
        para.set(PARAGRAPH_FIELDS.code, text as unknown as JsonValue);
      }
    });
  }

  /** Merge fields into a paragraph's `data` Y.Map (creating it if absent). */
  patchParagraphData(sectionId: string, paragraphId: string, patch: JsonObject): void {
    this.#patchMapField(sectionId, paragraphId, PARAGRAPH_FIELDS.data, patch);
  }

  patchParagraphProps(sectionId: string, paragraphId: string, patch: JsonObject): void {
    this.#patchMapField(sectionId, paragraphId, PARAGRAPH_FIELDS.props, patch);
  }

  patchParagraphView(sectionId: string, paragraphId: string, patch: JsonObject): void {
    this.#patchMapField(sectionId, paragraphId, PARAGRAPH_FIELDS.view, patch);
  }

  /** Read a deep, plain-JSON snapshot of the entire document. */
  snapshot(): DocSnapshot {
    const meta = this.yDoc.getMap<JsonValue>(META_KEY);
    const id = stringField(meta, META_FIELDS.id, 'untitled');
    const title = stringField(meta, META_FIELDS.title, 'Untitled');
    const sectionsArr = this.yDoc.getArray<Y.Map<JsonValue>>(SECTIONS_KEY);
    const sections: SectionSnapshot[] = [];
    sectionsArr.forEach((sec) => sections.push(sectionToSnapshot(sec)));
    return {
      id,
      title,
      schemaVersion: SCHEMA_VERSION,
      sections,
    };
  }

  /** Encode the Y.Doc state to a binary update suitable for persistence. */
  encodeUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.yDoc);
  }

  /** Apply a previously-encoded binary update back into the Y.Doc. */
  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.yDoc, update);
  }

  // ----- internals -----

  #buildParagraph(p: NewParagraph): Y.Map<JsonValue> {
    const m = new Y.Map<JsonValue>();
    m.set(PARAGRAPH_FIELDS.id, p.id);
    m.set(PARAGRAPH_FIELDS.kind, p.kind);
    if (p.name !== undefined) m.set(PARAGRAPH_FIELDS.name, p.name);
    if (p.code !== undefined) {
      m.set(PARAGRAPH_FIELDS.code, new Y.Text(p.code) as unknown as JsonValue);
    }
    if (p.data !== undefined) {
      m.set(PARAGRAPH_FIELDS.data, jsonToYMap(p.data) as unknown as JsonValue);
    }
    if (p.view !== undefined) {
      m.set(PARAGRAPH_FIELDS.view, jsonToYMap(p.view) as unknown as JsonValue);
    }
    if (p.props !== undefined) {
      m.set(PARAGRAPH_FIELDS.props, jsonToYMap(p.props) as unknown as JsonValue);
    }
    return m;
  }

  #findSection(sectionId: string): Y.Map<JsonValue> | undefined {
    const sections = this.yDoc.getArray<Y.Map<JsonValue>>(SECTIONS_KEY);
    for (const sec of sections) {
      if (sec.get(SECTION_FIELDS.id) === sectionId) return sec;
    }
    return undefined;
  }

  #findParagraph(sectionId: string, paragraphId: string): Y.Map<JsonValue> | undefined {
    const sec = this.#findSection(sectionId);
    if (!sec) return undefined;
    const paras = asYArrayOfYMap(sec.get(SECTION_FIELDS.paragraphs));
    for (const p of paras) {
      if (p.get(PARAGRAPH_FIELDS.id) === paragraphId) return p;
    }
    return undefined;
  }

  #patchMapField(
    sectionId: string,
    paragraphId: string,
    field: 'data' | 'view' | 'props',
    patch: JsonObject,
  ): void {
    this.yDoc.transact(() => {
      const para = this.#findParagraph(sectionId, paragraphId);
      if (!para) throw new Error(`paragraph not found: ${sectionId}/${paragraphId}`);
      const existing = para.get(field);
      let map: Y.Map<JsonValue>;
      if (existing instanceof Y.Map) {
        map = existing as Y.Map<JsonValue>;
      } else {
        map = new Y.Map<JsonValue>();
        para.set(field, map as unknown as JsonValue);
      }
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        map.set(k, v);
      }
    });
  }
}

function stringField(map: Y.Map<JsonValue>, key: string, fallback: string): string {
  const v = map.get(key);
  return typeof v === 'string' ? v : fallback;
}

function sectionToSnapshot(sec: Y.Map<JsonValue>): SectionSnapshot {
  const id = stringField(sec, SECTION_FIELDS.id, '');
  const name = stringField(sec, SECTION_FIELDS.name, '');
  const parasRaw = sec.get(SECTION_FIELDS.paragraphs);
  const paragraphs: ParagraphSnapshot[] = [];
  if (parasRaw instanceof Y.Array) {
    for (const p of asYArrayOfYMap(parasRaw)) {
      paragraphs.push(paragraphToSnapshot(p));
    }
  }
  return { id, name, paragraphs };
}

function paragraphToSnapshot(p: Y.Map<JsonValue>): ParagraphSnapshot {
  const id = stringField(p, PARAGRAPH_FIELDS.id, '');
  const kind = stringField(p, PARAGRAPH_FIELDS.kind, 'data') as ParagraphKind;
  const out: {
    id: string;
    kind: ParagraphKind;
    name?: string;
    code?: string;
    data?: JsonObject;
    view?: JsonObject;
    props?: JsonObject;
  } = { id, kind };
  const name = p.get(PARAGRAPH_FIELDS.name);
  if (typeof name === 'string') out.name = name;
  const code = p.get(PARAGRAPH_FIELDS.code);
  if (code instanceof Y.Text) out.code = asYText(code).toJSON();
  const data = p.get(PARAGRAPH_FIELDS.data);
  if (data instanceof Y.Map) out.data = yMapToJson(asYMap(data));
  const view = p.get(PARAGRAPH_FIELDS.view);
  if (view instanceof Y.Map) out.view = yMapToJson(asYMap(view));
  const props = p.get(PARAGRAPH_FIELDS.props);
  if (props instanceof Y.Map) out.props = yMapToJson(asYMap(props));
  return out;
}

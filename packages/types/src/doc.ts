import type { JsonObject } from './json.js';

/**
 * Plain-JSON snapshot of a Vistrates document.
 *
 * The live source-of-truth is a Y.Doc (see @vistrates/doc); this snapshot
 * shape is what we serialize to disk / export to a `.vistrate.json` file.
 */
export interface DocSnapshot {
  readonly id: string;
  readonly title: string;
  readonly schemaVersion: 1;
  readonly sections: readonly SectionSnapshot[];
}

export interface SectionSnapshot {
  readonly id: string;
  readonly name: string;
  readonly paragraphs: readonly ParagraphSnapshot[];
}

export type ParagraphKind =
  | 'documentation'
  | 'properties'
  | 'code'
  | 'view'
  | 'data';

export interface ParagraphSnapshot {
  readonly id: string;
  readonly kind: ParagraphKind;
  readonly name?: string;
  readonly code?: string;
  readonly data?: JsonObject;
  readonly view?: JsonObject;
  readonly props?: JsonObject;
}

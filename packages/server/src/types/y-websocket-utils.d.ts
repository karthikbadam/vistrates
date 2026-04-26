declare module 'y-websocket/bin/utils' {
  import type * as Y from 'yjs';
  export function setupWSConnection(
    conn: unknown,
    req: { url?: string },
    options?: { docName?: string; gc?: boolean },
  ): void;
  export function setPersistence(p: {
    provider: string;
    bindState: (docName: string, ydoc: Y.Doc) => Promise<void> | void;
    writeState: (docName: string, ydoc: Y.Doc) => Promise<void> | void;
  }): void;
  export function getYDoc(name: string): Y.Doc;
  export const docs: Map<string, Y.Doc>;
}

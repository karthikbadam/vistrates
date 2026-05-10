/**
 * Top-level Y.Doc layout for a Vistrates document.
 *
 *   doc.getMap('meta')                       — { id, title, schemaVersion }
 *   doc.getArray<Y.Map>('sections')          — list of sections
 *     section.get('id')      : string
 *     section.get('name')    : string
 *     section.get('paragraphs') : Y.Array<Y.Map>
 *       paragraph.get('id')    : string
 *       paragraph.get('kind')  : ParagraphKind
 *       paragraph.get('name')  : string
 *       paragraph.get('code')  : Y.Text          (optional, only for code paragraphs)
 *       paragraph.get('data')  : Y.Map<JsonValue> (optional)
 *       paragraph.get('view')  : Y.Map<JsonValue> (optional)
 *       paragraph.get('props') : Y.Map<JsonValue> (optional)
 *
 * The runtime / UI never reads Y.* types directly — they go through DocStore.
 */
export const META_KEY = 'meta';
export const SECTIONS_KEY = 'sections';
export const PARAGRAPHS_KEY = 'paragraphs';

export const SCHEMA_VERSION = 1 as const;

export const META_FIELDS = {
  id: 'id',
  title: 'title',
  schemaVersion: 'schemaVersion',
} as const;

export const SECTION_FIELDS = {
  id: 'id',
  name: 'name',
  paragraphs: 'paragraphs',
} as const;

export const PARAGRAPH_FIELDS = {
  id: 'id',
  kind: 'kind',
  name: 'name',
  code: 'code',
  data: 'data',
  view: 'view',
  props: 'props',
} as const;

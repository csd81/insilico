/**
 * The preloaded `.m` library, bundled at build time.
 *
 * Two corpora:
 *  - Course examples (`mfiles/courses/**`) — the lecture scripts.
 *  - Chapter algorithms (`src/chapters/* /content/code/*.m`) — reference
 *    implementations shown in the chapter code boxes.
 *
 * Each folder is its own self-contained working directory. `folderSources(id)`
 * returns the sources to preload for that folder.
 */

const courseRaw = import.meta.glob('./mfiles/courses/**/*.m', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const chapterRaw = import.meta.glob('/src/chapters/*/content/code/*.m', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface MFile {
  id: string;        // unique path-based id
  name: string;      // file name without extension
  file: string;      // file name with extension
  folderId: string;
  source: string;
}
export interface MFolder {
  id: string;
  label: string;
  group: 'course' | 'chapter';
  onPath: boolean;   // reserved; currently always false (each folder is self-contained)
  files: MFile[];
}

const COURSE_LABELS: Record<string, string> = {
  '01-intro': '01 · Introduction',
  '02-root-finding': '02 · Root finding',
  '03-linear-system': '03 · Linear systems',
  '04-iterative': '04 · Iterative linear solvers',
  '05-decomposition': '05 · Matrix decompositions',
  '06-interpolation': '06 · Interpolation',
  '07-calculus': '07 · Numerical calculus',
  '08-minimization': '08 · Minimization',
  '09-curve-fitting': '09 · Curve fitting',
  '10-ode': '10 · ODE solvers',
};
function prettifySlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const folderMap = new Map<string, MFolder>();
function ensureFolder(id: string, label: string, group: 'course' | 'chapter', onPath: boolean): MFolder {
  let f = folderMap.get(id);
  if (!f) { f = { id, label, group, onPath, files: [] }; folderMap.set(id, f); }
  return f;
}

// Course files: ./mfiles/courses/<folder>/<file>.m
for (const [path, source] of Object.entries(courseRaw)) {
  const m = /\/courses\/([^/]+)\/([^/]+)\.m$/.exec(path);
  if (!m) continue;
  const [, folder, name] = m;
  const f = ensureFolder('course/' + folder, COURSE_LABELS[folder] ?? prettifySlug(folder), 'course', false);
  f.files.push({ id: path, name, file: name + '.m', folderId: f.id, source });
}

// Chapter files: /src/chapters/<slug>/content/code/<file>.m
for (const [path, source] of Object.entries(chapterRaw)) {
  const m = /\/chapters\/([^/]+)\/content\/code\/([^/]+)\.m$/.exec(path);
  if (!m) continue;
  const [, slug, name] = m;
  const f = ensureFolder('chapter/' + slug, prettifySlug(slug), 'chapter', false);
  f.files.push({ id: path, name, file: name + '.m', folderId: f.id, source });
}

for (const f of folderMap.values()) f.files.sort((a, b) => a.file.localeCompare(b.file));

const COURSE_ORDER = ['01-intro', '02-root-finding', '03-linear-system', '04-iterative', '05-decomposition', '06-interpolation', '07-calculus', '08-minimization', '09-curve-fitting', '10-ode'];
const GROUP_ORDER: Record<MFolder['group'], number> = { course: 0, chapter: 1 };

export const FOLDERS: MFolder[] = [...folderMap.values()].sort((a, b) => {
  if (a.group !== b.group) return GROUP_ORDER[a.group] - GROUP_ORDER[b.group];
  if (a.group === 'course') {
    const rank = (id: string) => { const i = COURSE_ORDER.indexOf(id.replace('course/', '')); return i < 0 ? Infinity : i; };  // unknown → bottom, not top
    return rank(a.id) - rank(b.id);
  }
  return a.label.localeCompare(b.label);
});

export const LIBRARY: MFile[] = FOLDERS.flatMap((f) => f.files);
export function fileById(id: string): MFile | undefined { return LIBRARY.find((f) => f.id === id); }
export function folderById(id: string): MFolder | undefined { return folderMap.get(id); }

/** All sources to preload when `folderId` is the working directory.
 *  Each folder is self-contained; no shared procedure path is needed. */
export function folderSources(folderId: string): string[] {
  return folderMap.get(folderId)?.files.map((f) => f.source) ?? [];
}

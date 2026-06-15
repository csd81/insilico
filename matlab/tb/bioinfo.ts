// Bioinformatics Toolbox — deterministic sequence lookup-table functions, ported
// directly from the MATLAB R2026a algorithm sources (`type <fn>`) and validated
// exactly against live MATLAB. Covers the amino-acid / nucleotide integer codecs
// (aa2int/int2aa, nt2int/int2nt), residue counters (aacount/basecount),
// sequence complement / reverse-complement / reverse, and the standard-code
// nucleotide→amino-acid translator nt2aa (frame 1, genetic code 1).
//
// Validated oracle values (MATLAB R2026a):
//   nt2int('ACGTN')                 = [1 2 3 4 15]
//   nt2int('ACGTURYKMSWBDHVN-')     = [1 2 3 4 4 5 6 7 8 9 10 11 12 13 14 15 16]
//   int2nt([1 2 3 4 16])            = 'ACGT-'
//   aa2int('ARN')                   = [1 2 3]
//   aa2int('ARNDCQEGHILKMFPSTWYV')  = [1..20]
//   int2aa([1 2 3 24 25])           = 'ARN*-'
//   seqreverse('ACGT')              = 'TGCA'
//   seqcomplement('ACGT')           = 'TGCA'
//   seqrcomplement('ACGT')          = 'ACGT'
//   seqcomplement('acgtACGT')       = 'tgcaTGCA'   (case preserved)
//   seqcomplement('ACGUACGU')       = 'UGCAUGCA'   (RNA → U)
//   nt2aa('AAACCCGGGTTT')           = 'KPGF'
//   nt2aa('ATGTAA')                 = 'M*'
//   basecount('AACGTTACGT')         = struct A:3 C:2 G:2 T:3
//   aacount('ARNDARN')              = struct A:2 R:2 N:2 D:1 (rest 0, 20 fields)

import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type StructV,
  isMat, str, rowVec, scalar, toArray, asString,
  toMat as m, MatError,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_BIOINFO } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ── nucleotide codec tables (MATLAB nt2int / int2nt) ─────────────────────────
// nt2int per-letter map for 'a'..'z' then '-'  (0 = unknown '*'/'?', 16 = gap '-')
//        a  b  c  d e f g  h i j k l m  n o p q r s t u  v  w  x y z  -
const NT_MAP = [1,11, 2,12,0,0,3,13,0,0,7,0,8,15,0,0,0,5,9,4,4,14,10,15,6,0,16];
// int2nt: code 0..16 → char
const INT2NT = '*ACGTRYKMSWBDHVN-';

function nt2intChar(ch: string): number {
  // map '*','?' → 0 ; '-' → gap(16) ; letters via NT_MAP ; else 0
  const c = ch.toLowerCase();
  if (c === '-') return 16;
  if (c === '*' || c === '?') return 0;
  const i = c.charCodeAt(0) - 97; // 'a'
  if (i >= 0 && i <= 26) return NT_MAP[i];
  return 0;
}

// ── amino-acid codec tables (MATLAB aa2int / int2aa) ─────────────────────────
// aa2int per-letter map for 'a'..'z' then '-' then '?' (0 = unknown)
//        a  b c d e f  g h i  j k  l  m  n o p  q r s  t  u v  w  x  y  z  -  ?
const AA_MAP = [1,21,5,4,7,14,8,9,10,0,12,11,13, 3,0,15, 6,2,16,17, 0,20,18,23,19,22, 25,26];
// int2aa: code 0..26 → char
const INT2AA = '?ARNDCQEGHILKMFPSTWYVBZX*-?';

function aa2intChar(ch: string): number {
  const c = ch.toLowerCase();
  if (c === '-') return 25; // gap
  if (c === '*') return 24; // stop
  if (c === '?') return 26; // unknown
  const i = c.charCodeAt(0) - 97;
  if (i >= 0 && i <= 25) return AA_MAP[i];
  return 0;
}

// Helper: coerce an arg into an array of integer codes (numeric vector) OR
// the characters of a char/string scalar.
function asChars(v: Value): string { return asString(v); }
function asCodes(v: Value): number[] { return toArray(m(v, 'bioinfo')); }
function isCharLike(v: Value): boolean {
  return (isMat(v) && !!(v as Mat).isChar) || v.kind === 'str';
}

// ── seqcomplement intermediate map ───────────────────────────────────────────
// MATLAB: map = nt2int('*TGCAYRMKSWVHDBN-'); complement-of-code table for codes 0..16
//   '*'->0 T->4 G->3 C->2 A->1 Y->6 R->5 M->8 K->7 S->9 W->10 V->14 H->13 D->12 B->11 N->15 '-'->16
const COMPL_CODE = [0,4,3,2,1,6,5,8,7,9,10,14,13,12,11,15,16];

// ── standard genetic code (geneticcode(1)), codon → amino-acid char ──────────
const CODON_TABLE: Record<string, string> = {
  AAA:'K',AAC:'N',AAG:'K',AAT:'N',ACA:'T',ACC:'T',ACG:'T',ACT:'T',
  AGA:'R',AGC:'S',AGG:'R',AGT:'S',ATA:'I',ATC:'I',ATG:'M',ATT:'I',
  CAA:'Q',CAC:'H',CAG:'Q',CAT:'H',CCA:'P',CCC:'P',CCG:'P',CCT:'P',
  CGA:'R',CGC:'R',CGG:'R',CGT:'R',CTA:'L',CTC:'L',CTG:'L',CTT:'L',
  GAA:'E',GAC:'D',GAG:'E',GAT:'D',GCA:'A',GCC:'A',GCG:'A',GCT:'A',
  GGA:'G',GGC:'G',GGG:'G',GGT:'G',GTA:'V',GTC:'V',GTG:'V',GTT:'V',
  TAA:'*',TAC:'Y',TAG:'*',TAT:'Y',TCA:'S',TCC:'S',TCG:'S',TCT:'S',
  TGA:'*',TGC:'C',TGG:'W',TGT:'C',TTA:'L',TTC:'F',TTG:'L',TTT:'F',
};

function mkStruct(fields: Map<string, Value[]>): StructV {
  return { kind: 'struct', rows: 1, cols: 1, fields };
}

// ── builtins ────────────────────────────────────────────────────────────────

const nt2int: Builtin = async (a) => {
  const v = a[0];
  if (isMat(v) && (v as Mat).data.length === 0 && !(v as Mat).isChar) return ret(rowVec([]));
  const s = asChars(v);
  if (s.length === 0) return ret(rowVec([]));
  return ret(rowVec([...s].map(nt2intChar)));
};

const int2nt: Builtin = async (a) => {
  const codes = asCodes(a[0]);
  if (codes.length === 0) return ret(str(''));
  const out = codes.map((c) => {
    let i = Math.round(c);
    if (i > 16) i = 0;
    if (i < 0) i = 0;
    return INT2NT[i];
  }).join('');
  return ret(str(out));
};

const aa2int: Builtin = async (a) => {
  const v = a[0];
  if (isMat(v) && (v as Mat).data.length === 0 && !(v as Mat).isChar) return ret(rowVec([]));
  const s = asChars(v);
  if (s.length === 0) return ret(rowVec([]));
  return ret(rowVec([...s].map(aa2intChar)));
};

const int2aa: Builtin = async (a) => {
  const codes = asCodes(a[0]);
  if (codes.length === 0) return ret(str(''));
  const out = codes.map((c) => {
    let i = Math.round(c);
    if (i > 26) i = 0;
    if (i < 0) i = 0;
    return INT2AA[i];
  }).join('');
  return ret(str(out));
};

const seqreverse: Builtin = async (a) => {
  const v = a[0];
  if (isCharLike(v)) return ret(str([...asChars(v)].reverse().join('')));
  const codes = asCodes(v).slice().reverse();
  return ret(rowVec(codes));
};

const seqcomplement: Builtin = async (a) => {
  const v = a[0];
  const charForm = isCharLike(v);
  const orig = charForm ? asChars(v) : '';
  // operate on integer codes
  const codes = charForm ? [...orig].map(nt2intChar) : asCodes(v).map((x) => Math.round(x));
  const comp = codes.map((c) => (c >= 0 && c <= 16 ? COMPL_CODE[c] : 0));
  if (!charForm) return ret(rowVec(comp));
  // back to chars (default int2nt map, code clamped to 0..16)
  let out = comp.map((c) => INT2NT[c < 0 || c > 16 ? 0 : c]);
  // RNA: if original contained any U/u, T → U
  const isRna = /u/i.test(orig);
  if (isRna) out = out.map((ch) => (ch === 'T' ? 'U' : ch));
  // restore lowercase where original was lowercase
  const res = out.map((ch, i) => (orig[i] && orig[i] === orig[i].toLowerCase() ? ch.toLowerCase() : ch));
  return ret(str(res.join('')));
};

const seqrcomplement: Builtin = async (a) => {
  const c = await seqcomplement(a, 1, undefined as never);
  return seqreverse(c, 1, undefined as never);
};

const basecount: Builtin = async (a) => {
  const v = a[0];
  const codes = isCharLike(v) ? [...asChars(v)].map(nt2intChar) : asCodes(v).map((x) => Math.round(x));
  let A = 0, C = 0, G = 0, T = 0;
  for (const c of codes) {
    if (c === 1) A++;
    else if (c === 2) C++;
    else if (c === 3) G++;
    else if (c === 4) T++;
  }
  const fields = new Map<string, Value[]>([
    ['A', [scalar(A)]], ['C', [scalar(C)]], ['G', [scalar(G)]], ['T', [scalar(T)]],
  ]);
  return ret(mkStruct(fields));
};

const aacount: Builtin = async (a) => {
  const v = a[0];
  const codes = isCharLike(v) ? [...asChars(v)].map(aa2intChar) : asCodes(v).map((x) => Math.round(x));
  const buckets = new Array(21).fill(0); // index 1..20 = standard amino acids
  for (const c of codes) if (c >= 1 && c <= 20) buckets[c]++;
  const fields = new Map<string, Value[]>();
  for (let i = 1; i <= 20; i++) fields.set(INT2AA[i], [scalar(buckets[i])]);
  return ret(mkStruct(fields));
};

const nt2aa: Builtin = async (a) => {
  // Default: frame 1, standard genetic code, char output for a single sequence row.
  const v = a[0];
  const intInput = !isCharLike(v);
  let nt = intInput ? toArray(m(v, 'nt2aa')).map((c) => INT2NT[Math.round(c) < 0 || Math.round(c) > 16 ? 0 : Math.round(c)]).join('') : asChars(v);
  // uppercase + RNA→DNA (U→T) for codon lookup
  nt = nt.toUpperCase().replace(/U/g, 'T');
  const seqLen = nt.length;
  const numCodons = Math.floor(seqLen / 3);
  let out = '';
  for (let i = 0; i < numCodons; i++) {
    const triplet = nt.substr(i * 3, 3);
    if (triplet === '---') { out += '-'; continue; }
    const aa = CODON_TABLE[triplet];
    if (aa === undefined) {
      throw new MatError(`nt2aa: the codon '${triplet}' could not be mapped to an amino acid (only ACGTU codons are supported).`);
    }
    out += aa;
  }
  if (intInput) {
    // convert amino-acid chars back to integer codes
    return ret(rowVec([...out].map(aa2intChar)));
  }
  return ret(str(out));
};

export const BIOINFO: ToolboxModule = {
  id: 'bioinfo',
  name: 'Bioinformatics Toolbox',
  docBase: 'https://www.mathworks.com/help/bioinfo/ref/',
  builtins: {
    nt2int, int2nt, aa2int, int2aa,
    seqreverse, seqcomplement, seqrcomplement,
    basecount, aacount, nt2aa,
  },
  help: HELP_BIOINFO,
};

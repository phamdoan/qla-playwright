/**
 * Gom các bộ UT biểu mẫu báo cáo + các bảng tra dùng chung cho spec UT.
 *
 * TỆP NÀY SINH TỰ ĐỘNG: node tools/bctk/sinh-ut.js 2A 2B 4A 4B 4C 4D
 */
import { UT_2A } from './2A.ts';
import { UT_2B } from './2B.ts';
import { UT_4A } from './4A.ts';
import { UT_4B } from './4B.ts';
import { UT_4C } from './4C.ts';
import { UT_4D } from './4D.ts';
import type { BoUt, UtCot } from './loai.ts';

export const BO_UT: Record<string, BoUt> = {
  "2A": UT_2A,
  "2B": UT_2B,
  "4A": UT_4A,
  "4B": UT_4B,
  "4C": UT_4C,
  "4D": UT_4D,
};

export const DS_BIEU_MAU_BAO_CAO = Object.keys(BO_UT);

/** Mọi UT của mọi biểu mẫu, phẳng. */
export const DS_UT: UtCot[] = Object.values(BO_UT).flatMap(b => b.cot);

/** Gom theo thứ phải tìm trên màn: mã biểu mẫu → những ô báo cáo phụ thuộc nó. */
function gom(chon: (u: UtCot) => string[]): Map<string, UtCot[]> {
  const m = new Map<string, UtCot[]>();
  for (const u of DS_UT) {
    for (const k of chon(u)) {
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
  }
  return new Map([...m].sort((a, b) => a[0].localeCompare(b[0])));
}

export const THEO_MA_BIEU_MAU = gom(u => u.maBieuMauCanCo);
export const THEO_NHOM_DANH_MUC = gom(u => u.nhomDanhMucCanCo);
export const THEO_COT_DB = gom(u => u.cotDbCanCo);

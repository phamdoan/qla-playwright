/**
 * Bộ bản án cho luồng GĐT/TT án DÂN SỰ ngày 26-09-2026: các bản án dân sự sơ thẩm đã ký trên STG,
 * sinh ra bởi tests/don-khoi-kien-dan-su-26-09-2026.spec.ts (S10) hoặc làm tay.
 *
 * Nguồn: seed-output/toan-bo-data-stg.csv — các dòng "Dân sự" đã có đủ Số bản án / Ngày bản án /
 * Tòa ra bản án (lấy từ DB STG: BAN_AN.SO_BAN_AN, NGAY_BAN_AN, TEN_DONVI_RA_BANAN của bản án đã ký).
 * Số bản án giữ NGUYÊN VĂN như DB ("107" hoặc "105/2026/DS-ST"): màn Thêm mới đơn so khớp chính xác
 * chuỗi số bản án với dữ liệu tra cứu (ThongTinBanAnStep.khopSoNgayToa).
 *
 * "Loại vụ án" (quan hệ pháp luật) lấy từ data/data-test-dan-su.xlsx, ghép qua sổ cái
 * seed-output/dan-su-so-tham.stg.ledger.json (maVuAnThuLy → dòng Excel).
 */
import fs from 'fs';
import path from 'path';
import { BanAnSoTham, chuanNgay } from '../common/ban-an-so-tham';
import { docVuAnDanSu } from '../common/du-lieu-dan-su';
import { khoaVuAn } from '../common/so-cai-dan-su';

export const FILE_DS_BAN_AN = path.resolve(__dirname, '../seed-output/toan-bo-data-stg.csv');

export interface BanAnDanSuGdt extends BanAnSoTham {
  /** Tên đương sự nguyên văn trong CSV: "Nguyên đơn / Bị đơn" */
  duongSu: string;
  /** Loại vụ án (quan hệ pháp luật) theo Excel dân sự; không ghép được thì rỗng */
  loaiVuAn: string;
}

/** Tách một dòng CSV có ô bọc "…" (dữ liệu không chứa dấu " bên trong) */
const tachDong = (dong: string) => [...dong.matchAll(/"([^"]*)"/g)].map(m => m[1]);

/** Mã vụ án hệ thống (VA26-00xxxx) → Loại vụ án trong Excel, qua sổ cái luồng dân sự sơ thẩm */
function loaiVuAnTheoMa(): Map<string, string> {
  const kq = new Map<string, string>();
  const fSoCai = path.resolve(__dirname, '../seed-output/dan-su-so-tham.stg.ledger.json');
  if (!fs.existsSync(fSoCai)) return kq;
  const soCai: Record<string, { maVuAnThuLy?: string }> = JSON.parse(fs.readFileSync(fSoCai, 'utf8'));
  const excel = new Map(docVuAnDanSu().map(v => [khoaVuAn(v), v.loaiVuAn]));
  for (const [khoa, dong] of Object.entries(soCai)) {
    if (dong.maVuAnThuLy && excel.has(khoa)) kq.set(dong.maVuAnThuLy, excel.get(khoa)!);
  }
  return kq;
}

export function docBanAnDanSu(): BanAnDanSuGdt[] {
  const dong = fs.readFileSync(FILE_DS_BAN_AN, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const tieuDe = dong[0].split(',');
  const cot = (ten: string) => {
    const i = tieuDe.indexOf(ten);
    if (i < 0) throw new Error(`${FILE_DS_BAN_AN} thiếu cột "${ten}"`);
    return i;
  };
  const c = {
    loai: cot('Loại án'),
    ma: cot('Mã vụ án'),
    duongSu: cot('Bị cáo/Đương sự'),
    so: cot('Số bản án'),
    ngay: cot('Ngày bản án'),
    toa: cot('Tòa ra bản án'),
  };
  const loaiVuAn = loaiVuAnTheoMa();
  return dong
    .slice(1)
    .map(tachDong)
    .filter(o => o[c.loai] === 'Dân sự' && o[c.so] && o[c.ngay] && o[c.toa])
    .map((o, i) => {
      const ngayBanAn = chuanNgay(o[c.ngay]);
      const [nguyenDon] = o[c.duongSu].split('/').map(s => s.trim());
      return {
        dong: i + 1,
        soBanAn: o[c.so],
        ngayBanAn,
        toaAn: o[c.toa],
        toaAnTrongFile: o[c.toa],
        capXetXu: 'Sơ thẩm',
        loaiAn: 'Dân sự',
        // Người đứng đơn đề nghị GĐT/TT: nguyên đơn của bản án sơ thẩm (chọn từ "người từ bản án cũ")
        biCao: nguyenDon,
        maVuAn: o[c.ma],
        duongSu: o[c.duongSu],
        loaiVuAn: loaiVuAn.get(o[c.ma]) || '',
        quanHePhapLuat: loaiVuAn.get(o[c.ma]) || undefined,
        // FE: `Khiếu nại ${loại QĐ/BA} số ${số} ngày ${ngày} của ${tên tòa}` (mặc định Loại QĐ/BA = Bản án)
        noiDungGoiY: `Khiếu nại Bản án số ${o[c.so]} ngày ${ngayBanAn} của ${o[c.toa]}`,
      };
    });
}

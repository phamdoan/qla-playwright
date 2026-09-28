/**
 * LUỒNG GĐT/TT — ĐỢT NGÀY 26-09-2026, BIỂU 1C1: trọn "Luồng nhập data.txt" (xem common/luong-gdt-tt.ts)
 * cho các bản án HÌNH SỰ SƠ THẨM của pháp nhân thương mại trong sheet "25_QD_GDT_PHAP_NHAN_1C1"
 * (data/data-test-hinh-su-gdt-tai-tham.xlsx, đọc qua data/ban-an-gdt-1c1.ts).
 *
 * Mỗi dòng một nhóm test riêng, tên theo mẫu
 *   VG01 · Công ty CP Khoáng sản Tây Bắc - Tội buôn lậu-<số bản án>-<ngày bản án>-<tòa ra bản án>
 * Dòng chưa có ký hiệu bản án hiện thành test bị bỏ qua kèm lý do.
 * Trên UI bấm ▶ ở nhóm muốn chạy. Lọc tuỳ chọn: QLA_GDT_MA=VG01,VG04
 *
 * Sổ cái: seed-output/luong-gdt-tt-26-09-2026-hinh-su-1C1.<env>.ledger.json → chạy lại bỏ qua bước đã xong.
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *   npm run gdt-tt:26-09-hinh-su-1c1:stg:ui     (UI)      npm run gdt-tt:26-09-hinh-su-1c1:stg     (chạy hết, dòng lệnh)
 */
import { test } from '@playwright/test';
import { dangKyLuongGdtTT } from '../common/luong-gdt-tt';
import { DS_BAN_AN_GDT_1C1, DS_THIEU_BAN_AN_1C1 } from '../data/ban-an-gdt-1c1';

const chiDinh = (process.env.QLA_GDT_MA || '').split(',').map(s => s.trim()).filter(Boolean);
const chon = <T extends { maExcel: string }>(ds: T[]) => (chiDinh.length ? ds.filter(b => chiDinh.includes(b.maExcel)) : ds);

dangKyLuongGdtTT(
  chon(DS_BAN_AN_GDT_1C1).map(b => ({
    tieuDe: `${b.maExcel} · ${b.tenPhapNhan} - ${b.toiDanh}-${b.soBanAn}-${b.ngayBanAn}-${b.toaAnTrongFile}`,
    banAn: b,
  })),
  { tenSoCai: 'luong-gdt-tt-26-09-2026-hinh-su-1C1' },
);

for (const d of chon(DS_THIEU_BAN_AN_1C1)) {
  test(`${d.maExcel} · ${d.tenPhapNhan} — chưa có bản án`, () => test.skip(true, d.lyDo));
}

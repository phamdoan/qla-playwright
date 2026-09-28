/**
 * LUỒNG GĐT / TÁI THẨM HÌNH SỰ PHÁP NHÂN — ĐỢT 27/09/2026.
 *
 * Dữ liệu: data/gdt-tai-tham-phap-nhan-27-09-2026.ts
 *   · sheet 25_QD_GDT_PHAP_NHAN_1C1  → thủ tục "Giám đốc thẩm"  (mã VG..)
 *   · sheet 26_TAI_THAM_PHAP_NHAN_1D1 → thủ tục "Tái thẩm"      (mã VT..)
 *   · sheet 23_TAI_THAM_1D            → thủ tục "Tái thẩm"      (mã VA1..)
 *
 * Các bước dùng chung common/luong-gdt-tt.ts, đánh số KHỚP 100% tài liệu
 * "Playwright nhập data GDT-TT-báo cáo thống kê.txt" (23 bước):
 *   B1–B2 · B3 · B4 · B7a · B9 · B5 · B7b · B10 · B10b · B11 · B12a · B12b ·
 *   B13 · B13b · B14 · B15 · B16 · B17 · B18 · B19 · B20 · B21 · B22
 * Hai bước mang số phụ là bước hệ thống có mà tài liệu thiếu: B10b (Giao tiểu hồ sơ) và
 * B13b (Người ký ban hành Quyết định kháng nghị).
 *
 * Hai thủ tục chỉ khác nhau ở ô "Thủ tục giải quyết" của Bước 2 (Giám đốc thẩm / Tái thẩm).
 *
 * Lọc khi chạy: QLA_GDT_MA=VG07,VT01,VA123  (mã dòng trong sheet)
 * Sổ cái: seed-output/gdt-tai-tham-phap-nhan-27-09-2026.<env>.ledger.json
 *
 * ⚠ TẠO DỮ LIỆU THẬT trên STG. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 */
import { dangKyLuongGdtTT } from '../common/luong-gdt-tt';
import { DS_GDT_TAI_THAM_27_09 } from '../data/gdt-tai-tham-phap-nhan-27-09-2026';

const chiDinh = (process.env.QLA_GDT_MA || '').split(',').map(s => s.trim()).filter(Boolean);
const DS_CHAY = chiDinh.length ? DS_GDT_TAI_THAM_27_09.filter(v => chiDinh.includes(v.maSheet)) : DS_GDT_TAI_THAM_27_09;

dangKyLuongGdtTT(
  DS_CHAY.map(v => ({
    tieuDe: `${v.maSheet} · ${v.thuTucGiaiQuyet} · ${v.biCao || v.maVuAn}-${v.soBanAn}-${v.ngayBanAn}-${v.toaAn}`,
    banAn: v,
  })),
  { tenSoCai: 'gdt-tai-tham-phap-nhan-27-09-2026' },
);

/**
 * LUỒNG GĐT/TT — ĐỢT NHẬP DỮ LIỆU NGÀY 24-09-2026: trọn "Luồng nhập data.txt" (B1 → B12a, xem
 * common/luong-gdt-tt.ts) cho 6 bản án sơ thẩm do người dùng cung cấp (data/ban-an-24-09-2026.ts).
 *
 * Sổ cái: seed-output/luong-24-09-2026.<env>.ledger.json (giữ tên cũ để bản án đã chạy được bỏ qua).
 *
 * ⚠ TẠO DỮ LIỆU THẬT trên môi trường đang chọn. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *   npm run ui:dev:ghi -- --file=luong-gdt-tt-24-09-2026     (DEV)      npm run ui:stg:24-09   (STAGING)
 *   Chạy vài bản án:  npm run ui:stg:24-09 -- --dong=1,2
 */
import { dangKyLuongGdtTT } from '../common/luong-gdt-tt';
import { DS_BAN_AN_24_09_2026 } from '../data/ban-an-24-09-2026';

/** Chạy hết 6 bản án; thu hẹp bằng QLA_TKM_DONG=1,2 hoặc QLA_TKM_SO_DONG=2 */
const chiDinh = (process.env.QLA_TKM_DONG || '').split(',').map(s => Number(s.trim())).filter(Boolean);
const soDong = Number(process.env.QLA_TKM_SO_DONG || 0);
const DS_CHAY = chiDinh.length
  ? DS_BAN_AN_24_09_2026.filter(b => chiDinh.includes(b.dong))
  : soDong
    ? DS_BAN_AN_24_09_2026.slice(0, soDong)
    : DS_BAN_AN_24_09_2026;

dangKyLuongGdtTT(
  DS_CHAY.map(b => ({ tieuDe: `24-09-2026 · bản án ${b.soBanAn} ngày ${b.ngayBanAn}`, banAn: b })),
  { tenSoCai: 'luong-24-09-2026' },
);

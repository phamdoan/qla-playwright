/**
 * LUỒNG GĐT/TT — ĐỢT NGÀY 26-09-2026: trọn "Luồng nhập data.txt" (B1 → B12a, xem common/luong-gdt-tt.ts)
 * cho 22 bản án HÌNH SỰ SƠ THẨM đã ký, sinh từ luồng vu-an-hinh-su-so-tham (data/ban-an-hinh-su-26-09-2026.ts).
 *
 * Mỗi vụ một nhóm test riêng, tên theo mẫu
 *   VA017 · Hoàng Minh Tuấn (17 tuổi) - Tội cố ý gây thương tích-<số bản án>-<ngày bản án>-<tòa ra bản án>
 * Nhóm chạy tuần tự bên trong; vụ nào lỗi chỉ dừng vụ đó, các vụ khác vẫn chạy tiếp.
 * Trên UI bấm ▶ ở nhóm vụ muốn chạy. Lọc tuỳ chọn: QLA_GDT_MA=VA017,VA020
 *
 * Màn Thêm mới đơn: tra cứu hiện "Không tìm thấy bản án trong hệ thống" → báo lỗi, dừng trước khi Lưu.
 * Sổ cái: seed-output/luong-gdt-tt-26-09-2026.<env>.ledger.json → chạy lại bỏ qua bước đã xong.
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1. Bản án chỉ có trên STG (VA26-0034xx…).
 *   npm run gdt-tt:26-09:stg:ui     (UI)      npm run gdt-tt:26-09:stg     (chạy hết, dòng lệnh)
 */
import { dangKyLuongGdtTT } from '../common/luong-gdt-tt';
import { docVuAnHinhSu } from '../common/du-lieu-hinh-su';
import { DS_BAN_AN_HINH_SU_26_09_2026 } from '../data/ban-an-hinh-su-26-09-2026';

/** Tên vụ án theo Excel hình sự (VA017 → "Hoàng Minh Tuấn (17 tuổi) - Tội cố ý gây thương tích") */
const TEN_VU = new Map(docVuAnHinhSu().map(v => [v.maVuAn, v.tenVuAn]));

const chiDinh = (process.env.QLA_GDT_MA || '').split(',').map(s => s.trim()).filter(Boolean);
const DS_CHAY = chiDinh.length
  ? DS_BAN_AN_HINH_SU_26_09_2026.filter(b => chiDinh.includes(b.maExcel))
  : DS_BAN_AN_HINH_SU_26_09_2026;

dangKyLuongGdtTT(
  DS_CHAY.map(b => ({
    tieuDe: `${b.maExcel} · ${TEN_VU.get(b.maExcel) || b.biCao}-${b.soBanAn}-${b.ngayBanAn}-${b.toaAn}`,
    banAn: b,
  })),
  { tenSoCai: 'luong-gdt-tt-26-09-2026' },
);

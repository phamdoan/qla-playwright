/**
 * LUỒNG GĐT/TT ÁN DÂN SỰ — ĐỢT NGÀY 26-09-2026: trọn "Luồng nhập data.txt" (xem common/luong-gdt-tt.ts)
 * cho các bản án dân sự sơ thẩm đã ký trên STG, lấy Số bản án / Ngày bản án / Tòa ra bản án từ
 * seed-output/toan-bo-data-stg.csv (data/ban-an-dan-su-26-09-2026.ts).
 *
 * Mỗi vụ một nhóm test riêng, tên theo mẫu
 *   VA26-003439 · Mạnh Duy Chức / Đỗ Hạ Vũ - Tranh chấp hợp đồng vận chuyển-<số bản án>-<ngày bản án>-<tòa ra bản án>
 * Nhóm chạy tuần tự bên trong; vụ nào lỗi chỉ dừng vụ đó, các vụ khác vẫn chạy tiếp.
 * Trên UI bấm ▶ ở nhóm vụ muốn chạy. Lọc tuỳ chọn: QLA_GDT_MA=VA26-003439,VA26-003440
 *
 * Khác luồng hình sự:
 *   - Đơn chuyển tới "Vụ Giám đốc, kiểm tra về dân sự"; người đứng đơn là nguyên đơn của bản án sơ thẩm.
 *   - Nhánh Vụ GĐKT (B10+) dùng tài khoản Vụ dân sự trong config/luong-gdt.json: vuTruongDanSu,
 *     thamTraVienDanSu, thuKyVuDanSu. Thiếu tài khoản nào thì B10+ bỏ qua, nêu rõ vai còn thiếu.
 *
 * Màn Thêm mới đơn: tra cứu hiện "Không tìm thấy bản án trong hệ thống" → báo lỗi, dừng trước khi Lưu.
 * Sổ cái: seed-output/luong-gdt-tt-dan-su-26-09-2026.<env>.ledger.json → chạy lại bỏ qua bước đã xong.
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1. Bản án chỉ có trên STG.
 *   npm run gdt-tt-dan-su:26-09:stg:ui     (UI)      npm run gdt-tt-dan-su:26-09:stg     (chạy hết, dòng lệnh)
 */
import { VuGdkt, dangKyLuongGdtTT } from '../common/luong-gdt-tt';
import { docBanAnDanSu } from '../data/ban-an-dan-su-26-09-2026';

/** Vụ Giám đốc, kiểm tra về dân sự (D01.107) */
const VU_GDKT_DAN_SU: VuGdkt = {
  thuKyVu: 'thuKyVuDanSu',
  vuTruong: 'vuTruongDanSu',
  thamTraVien: 'thamTraVienDanSu',
  doiGiaTri: { thamTraVien: 'thamTraVienDanSu', lanhDaoPhuTrach: 'lanhDaoPhuTrachDanSu', nguoiNhanTieuHoSo: 'nguoiNhanTieuHoSoDanSu' },
};

const DS_BAN_AN = docBanAnDanSu();
const chiDinh = (process.env.QLA_GDT_MA || '').split(',').map(s => s.trim()).filter(Boolean);
const DS_CHAY = chiDinh.length ? DS_BAN_AN.filter(b => chiDinh.includes(b.maVuAn!)) : DS_BAN_AN;

dangKyLuongGdtTT(
  DS_CHAY.map(b => ({
    tieuDe: `${b.maVuAn} · ${b.duongSu}${b.loaiVuAn ? ` - ${b.loaiVuAn}` : ''}-${b.soBanAn}-${b.ngayBanAn}-${b.toaAn}`,
    banAn: b,
  })),
  { tenSoCai: 'luong-gdt-tt-dan-su-26-09-2026', vuGdkt: VU_GDKT_DAN_SU },
);

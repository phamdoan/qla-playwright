/**
 * LUỒNG NHẬP DATA GĐT/TT · DANH SÁCH CASE (22 bước, BƯỚC 2–23 của đặc tả).
 *
 * ───────────────────────── BẢN ÁN ĐẦU VÀO PHẢI CÓ THẬT ─────────────────────────
 *
 * Đặc tả bắt đầu từ MỘT BẢN ÁN ĐÃ TỒN TẠI; nó không có bước nào tạo bản án. Nên case phải trỏ vào
 * một bản án CÓ THẬT trên môi trường đang chạy, khai qua biến môi trường:
 *
 *   QLA_BA_SO=321/2026/DS-PT  QLA_BA_NGAY=28/09/2026  QLA_BA_TOA="Tòa án nhân dân tỉnh Bắc Ninh" \
 *   QLA_BA_LOAI_AN="Kinh doanh thương mại"  npm run gdt:preprod
 *
 * Vì sao KHÔNG gieo cứng một số bản án vào tệp này: mỗi môi trường có bộ bản án khác nhau. Gieo
 * cứng thì chạy ở môi trường khác là trỏ vào bản án không tồn tại — mà bước 24 có TRA CỨU, nên nó sẽ
 * dừng với "Không tìm thấy bản án trong hệ thống". Dừng như vậy đúng, nhưng thông báo sẽ hướng người
 * chạy đi sửa sai chỗ.
 *
 * Thiếu biến thì NÉM LỖI NGAY lúc nạp spec, kèm đúng cách sửa.
 *
 * ⚠ `QLA_BA_LOAI_AN` là nhãn MÀ HỆ THỐNG TRẢ VỀ sau khi tra cứu, không phải nhãn ô "Loại đơn":
 * "Kinh doanh thương mại" (KHÔNG dấu phẩy) chứ không phải "Kinh doanh, thương mại".
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputGdtTt } from '../../../flows/quan-ly-don/flow-002-gdt-tt-nhap-data/cai-dat';
import { FLOW_QLD_002 } from '../../../flows/quan-ly-don/flow-002-gdt-tt-nhap-data/flow';
import type { DinhDanhCase } from '../../../khung/case-state';
import { INPUT as INPUT_KDTM } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

export function ddCase(caseId: string): DinhDanhCase {
  return {
    phanHe: FLOW_QLD_002.phanHe,
    flow: FLOW_QLD_002.flow,
    caseId,
    module: FLOW_QLD_002.module,
    rootCaseKey: `${FLOW_QLD_002.module}|${FLOW_QLD_002.flow}|${caseId}`,
  };
}

/** Bản án đầu vào — đọc từ môi trường, thiếu là dừng kèm cách sửa */
function banAnTuMoiTruong(): InputGdtTt['banAnGdt'] | undefined {
  const so = process.env.QLA_BA_SO?.trim();
  const ngay = process.env.QLA_BA_NGAY?.trim();
  const toa = process.env.QLA_BA_TOA?.trim();
  if (!so && !ngay && !toa) return undefined;
  const thieu = [
    !so && 'QLA_BA_SO',
    !ngay && 'QLA_BA_NGAY (dd/MM/yyyy)',
    !toa && 'QLA_BA_TOA (tên tòa đúng như danh mục)',
  ].filter(Boolean);
  if (thieu.length) {
    throw new Error(
      `Luồng GĐT/TT thiếu ${thieu.join(', ')}. Bản án đầu vào phải CÓ THẬT trên môi trường đang chạy ` +
        '— xem ghi chú đầu data/quan-ly-don/flow-002-gdt-tt-nhap-data/cases.ts.',
    );
  }
  return {
    soBanAn: so!,
    ngayBanAn: ngay!,
    toaAn: toa!,
    loaiAn: process.env.QLA_BA_LOAI_AN?.trim() || 'Kinh doanh thương mại',
    capXetXu: process.env.QLA_BA_CAP?.trim() || 'Phúc thẩm',
  };
}

const banAn = banAnTuMoiTruong();

/**
 * Không khai bản án thì danh sách case RỖNG — khung in "bỏ qua luồng" chứ không ném lỗi, để lượt
 * chạy của các luồng khác không bị giết (cùng bài học với `locCase` và `caseVuAnThuc`).
 */
export const DS_CASE: CaseChay<InputGdtTt>[] = banAn
  ? [
      {
        dd: ddCase('gdt-01'),
        input: { ...INPUT_KDTM, banAnGdt: banAn } as InputGdtTt,
      },
    ]
  : [];

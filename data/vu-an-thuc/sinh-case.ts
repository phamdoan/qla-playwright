/**
 * SINH CASE TỪ BẢN ÁN THẬT — biến mỗi bản ghi của `ban-an-cong-bo.ts` thành một case của luồng
 * sơ thẩm → phúc thẩm, để một lượt chạy sinh ra nhiều bản án thuộc nhiều quan hệ pháp luật.
 *
 * Khuôn mẫu lấy đúng case-ds-003 / case-ds-004 (hai case đã chạy xanh 23/23 ngày 03/10/2026):
 * GIỮ TOÀN BỘ seed của tòa KDTM (tài khoản, người ký, Viện kiểm sát, chủ toạ — chúng nhất quán với
 * nhau), chỉ thay phần nghiệp vụ: loại đơn, quan hệ pháp luật, đương sự, nội dung yêu cầu.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 * PHẢI BẬT MỚI CHẠY. Mặc định `DS_CASE` của luồng dân sự vẫn chỉ có 4 case viết tay; 81 case sinh
 * từ bộ bản án thật chỉ vào danh sách khi có biến môi trường:
 *
 *   QLA_VU_AN_THUC=1                    thêm TẤT CẢ case sinh được
 *   QLA_VU_AN_THUC=bacb-010,bacb-034    chỉ thêm các bản án này
 *
 * Vì sao không bật sẵn: một case là 23 bước, ~9 phút. Bật cả bộ là hàng chục giờ chạy — đó phải là
 * quyết định của người chạy, không phải tác dụng phụ của việc thêm file dữ liệu.
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 *
 * CHỈ SINH CHO LUỒNG DÂN SỰ (`flow-001-st-pt`). Luồng này nhận cả ba loại đơn "Dân sự",
 * "Hôn nhân và gia đình", "Lao động" — ba loại cùng một bộ bước (Step3–8 sơ thẩm, Step1–4 phúc
 * thẩm), chỉ khác loại đơn và quan hệ pháp luật. ĐÃ CHẠY THẬT: chỉ loại "Dân sự" (case-ds-002/003/004).
 * Hai loại còn lại đi cùng đường theo đặc tả nhưng CHƯA có lượt chạy nào chứng minh — case đầu tiên
 * của mỗi loại nên chạy riêng trước khi chạy cả bộ.
 *
 * 30 bản ghi KDTM trong bộ dữ liệu KHÔNG sinh case ở đây: luồng KDTM là 45 bước và có cụm GĐT/TT,
 * cần hạt giống khác (xem `data/kinh-doanh-thuong-mai/.../cases.ts`).
 */
import type { CaseChay } from '../../khung/luong';
import type { DinhDanhCase } from '../../khung/case-state';
import { tenDuongSu } from '../../khung/ten-viet';
import { FLOW_DS_001 } from '../../flows/dan-su/flow-001-st-pt/flow';
import { INPUT as INPUT_KDTM } from '../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';
import { DS_BAN_AN_CONG_BO, type BanAnCongBo } from './ban-an-cong-bo';

/** Loại đơn mà luồng dân sự `flow-001-st-pt` nhận được */
const LOAI_DON_LUONG_DAN_SU = ['Dân sự', 'Hôn nhân và gia đình', 'Lao động'];

/** Mã case của một bản án — tất định theo id bản ghi, nên tên đương sự cũng tất định */
export function maCaseTuBanAn(ba: BanAnCongBo): string {
  return `case-${ba.id}`;
}

export function caseTuBanAn(ba: BanAnCongBo): CaseChay<typeof INPUT_KDTM> {
  const caseId = maCaseTuBanAn(ba);
  const dd: DinhDanhCase = {
    phanHe: FLOW_DS_001.phanHe,
    flow: FLOW_DS_001.flow,
    caseId,
    module: FLOW_DS_001.module,
    rootCaseKey: `${FLOW_DS_001.module}|${FLOW_DS_001.flow}|${caseId}`,
  };

  const tenNguyenDon = tenDuongSu(caseId, 'nguyenDon');
  const tenBiDon = tenDuongSu(caseId, 'biDon', 'nu');
  /** Chữ đầu viết thường để câu "Đề nghị Tòa án giải quyết …" đọc được, trừ khi tên lá bắt đầu bằng tên riêng */
  const viecKien = ba.tenQhpl.charAt(0).toLowerCase() + ba.tenQhpl.slice(1);

  const input = {
    ...INPUT_KDTM,

    // ───────── Nghiệp vụ: lấy từ bản án thật + danh mục máy chủ ─────────
    loaiDon: ba.loaiDon,
    /** Có tên nhánh cha thì `chonQhplThongKe` MỞ NHÁNH rồi bấm lá (cây nạp lười, lọc chữ ra rỗng) */
    qhplChaThongKe: ba.qhplCha,
    maQhplThongKe: ba.maQhpl,
    tenQhplThongKe: ba.tenQhpl,
    quanHePhapLuatChiTiet: ba.tenQhpl,
    quanHePhapLuatThongKe: ba.locQhpl,

    // ───────── Đương sự: tên SINH TẤT ĐỊNH, không dùng tên thật (cổng đã che tên) ─────────
    nguyenDon: { ...INPUT_KDTM.nguyenDon, nguyenVan: tenNguyenDon, hoTen: tenNguyenDon },
    biDon: { ...INPUT_KDTM.biDon, nguyenVan: tenBiDon, hoTen: tenBiDon },

    /**
     * Nội dung yêu cầu: câu việc kiện đứng TRƯỚC, phần tham chiếu nguồn đứng sau, để nếu ô có giới
     * hạn độ dài thì phần bị cắt là phần tham chiếu chứ không phải nội dung nghiệp vụ.
     */
    noiDungYeuCau:
      `Đề nghị Tòa án giải quyết ${viecKien} giữa ${tenNguyenDon} và ${tenBiDon}. ` +
      `Tham chiếu bản án số ${ba.soBanAn} ngày ${ba.ngay} của ${ba.toaAn}.`,

    tenNguoiKhangCao: tenBiDon,
    tieuDeLichXetXu: `Phiên tòa sơ thẩm ${ba.loaiDon.toLowerCase()} — ${tenNguyenDon}`,
  };

  return { dd, input };
}

/**
 * Các case sinh từ bản án thật, theo biến `QLA_VU_AN_THUC`. Không bật thì trả về mảng rỗng.
 *
 * Mã bản án gõ sai sẽ NÉM LỖI ngay lúc nạp spec — chọn nhầm mã mà im lặng bỏ qua thì người chạy
 * tưởng đã chạy case mình muốn.
 */
export function caseVuAnThuc(): CaseChay<typeof INPUT_KDTM>[] {
  const bat = (process.env.QLA_VU_AN_THUC || '').trim();
  if (!bat) return [];

  const dungLuong = DS_BAN_AN_CONG_BO.filter(b => LOAI_DON_LUONG_DAN_SU.includes(b.loaiDon));
  if (bat === '1' || bat.toLowerCase() === 'all') return dungLuong.map(caseTuBanAn);

  const chon = bat.split(',').map(s => s.trim()).filter(Boolean);
  const ra = chon.map(id => {
    const b = dungLuong.find(x => x.id === id);
    if (!b) {
      throw new Error(
        `QLA_VU_AN_THUC="${id}" không có trong bộ bản án thật dùng được cho luồng dân sự. ` +
          `Mã hợp lệ là bacb-xxx với loại đơn thuộc {${LOAI_DON_LUONG_DAN_SU.join(', ')}} ` +
          `(xem data/vu-an-thuc/ban-an-cong-bo.ts).`,
      );
    }
    return b;
  });
  return ra.map(caseTuBanAn);
}

/**
 * CASE PRE-PROD — chạy trọn 45 bước trên https://e-qlta-uat.toaan.gov.vn (môi trường TRẮNG).
 *
 * Vì sao có case riêng thay vì dùng case-001: hạt giống của case-001 là người và đơn vị của TANDTC /
 * Hà Nội, còn pre-prod là **TAND tỉnh Bắc Ninh**. Những ô dưới đây là ô mang TÊN NGƯỜI hoặc TÊN ĐƠN
 * VỊ — chúng chỉ tồn tại ở đúng một môi trường.
 *
 * ───────────────────────── CHỖ SẼ HỎNG NẾU KHÔNG SỬA ─────────────────────────
 *
 * Chạy bước 01 trên pre-prod ngày 04/10/2026, ghi chú của bước nói:
 *
 *     · người nhận đơn: danh mục không có "Nguyễn Mậu Trường" → lấy mục đầu theo thứ tự chữ cái
 *     · người nhận đơn (đã chọn): Chu Lệ Hường
 *
 * Bước 01 vẫn xanh vì mã có đường lùi "lấy mục đầu". Nhưng BẢN ÁN KHOÁ NGƯỜI KÝ THEO CHỦ TOẠ: chủ
 * toạ không phải tài khoản đang chạy thì văn bản chỉ "Trình ký" được, nằm chờ chữ ký, và bước lập
 * bản án đứng lại. Đó đúng là chỗ hai case HNGĐ/Lao động chết ở bước 12 hôm nay. Nên ở đây gieo chủ
 * toạ = CHÍNH TÀI KHOẢN chạy sơ thẩm.
 *
 * Tài khoản pre-prod (map vai → người ở `config/tai-khoan.preprod.local.json`):
 *   chanhAnDanSu / chanhAn / toaKhuVuc → Chu Lệ Hường (Chánh án TAND tỉnh Bắc Ninh)
 *   phoChanhAn                        → Nguyễn Trọng Trường
 *   chanhVanPhong                     → Hoàng Thị Hạnh
 *   vuTruongDanSu                     → Ngô Xuân Ninh (Trưởng phòng GĐKT)
 *   thamTraVienDanSu                  → Nguyễn Thị Hồng Nhung
 *   canBo / thuKyVuDanSu              → Đồng Khánh Ly / Hà Thị Loan
 *
 * ⚠ CÁC Ô DƯỚI ĐÂY CHƯA ĐƯỢC ĐO HẾT. Chỉ "quan hệ pháp luật" là đã đo xanh ở bước 01. Những ô mang
 * tên người/đơn vị khác (người ký phân công, Viện kiểm sát) suy từ tài khoản và quy ước đặt tên, nên
 * bước nào dùng tới chúng mà đỏ thì ĐỌC THÔNG BÁO: mã liệt kê giá trị thật có trong danh mục.
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { tenDuongSu } from '../../../../khung/ten-viet';
import { FLOW_001 } from '../../../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';
import { INPUT as INPUT_GOC } from '../case-001/input';

export const CASE_ID = 'case-preprod';
export const ROOT_CASE_KEY = `${FLOW_001.module}|${FLOW_001.flow}|${CASE_ID}`;

export const DD: DinhDanhCase = {
  phanHe: FLOW_001.phanHe,
  flow: FLOW_001.flow,
  caseId: CASE_ID,
  module: FLOW_001.module,
  rootCaseKey: ROOT_CASE_KEY,
};

export const TEN_NGUYEN_DON = tenDuongSu(CASE_ID, 'nguyenDon');
export const TEN_BI_DON = tenDuongSu(CASE_ID, 'biDon', 'nu');

/** Chánh án TAND tỉnh Bắc Ninh — cũng là tài khoản của vai `chanhAnDanSu` chạy sơ thẩm */
const CHANH_AN = 'Chu Lệ Hường';
/** Phó Chánh án — vai `phoChanhAn`, người ký ở các bước phúc thẩm và phê duyệt GĐT */
const PHO_CHANH_AN = 'Nguyễn Trọng Trường';

export const INPUT = {
  ...INPUT_GOC,

  // ───────── Chủ toạ & người ký: phải là tài khoản đang chạy ─────────
  /** Chủ toạ HĐXX sơ thẩm = tài khoản vai `chanhAnDanSu` → bản án ký được bằng "Ký logic" */
  tenThamPhanChuToa: CHANH_AN,
  nguoiKyBanHanh62DS: CHANH_AN,
  /** Người ký bản án phúc thẩm = tài khoản vai `phoChanhAn` */
  nguoiKyPhucTham: PHO_CHANH_AN,
  nguoiKyPhanCong: CHANH_AN,

  /**
   * Viện kiểm sát gieo dạng TIỀN TỐ — tên đầy đủ khác nhau theo địa bàn, helper khớp kiểu CHỨA nên
   * tiền tố này lấy mục đầu của chính tòa đang chạy. Không gieo tên Hà Nội / khu vực 1 như case gốc.
   */
  vienKiemSatCungCap: 'Viện kiểm sát nhân dân',
  vienKiemSatNhan: 'Viện kiểm sát nhân dân',

  // ───────── Đương sự riêng của case ─────────
  nguyenDon: { ...INPUT_GOC.nguyenDon, nguyenVan: TEN_NGUYEN_DON, hoTen: TEN_NGUYEN_DON },
  biDon: { ...INPUT_GOC.biDon, nguyenVan: TEN_BI_DON, hoTen: TEN_BI_DON },
  noiDungYeuCau: `Đề nghị Tòa án giải quyết tranh chấp hợp đồng mua bán hàng hóa giữa ${TEN_NGUYEN_DON} và ${TEN_BI_DON}.`,
  tenNguoiKhangCao: TEN_BI_DON,
  tieuDeLichXetXu: `Phiên tòa sơ thẩm kinh doanh thương mại — ${TEN_NGUYEN_DON}`,
};

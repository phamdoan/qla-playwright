/**
 * Bộ dữ liệu GĐT / TÁI THẨM HÌNH SỰ PHÁP NHÂN — đợt 27/09/2026.
 *
 * Nguồn: "DATA TEST HÌNH SỰ - GĐT TÁI THẨM (1).xlsx"
 *   - sheet 25_QD_GDT_PHAP_NHAN_1C1      → thủ tục "Giám đốc thẩm"
 *   - sheet 26_TAI_THAM_PHAP_NHAN_1D1    → thủ tục "Tái thẩm"
 *
 * Số/ngày bản án trong sheet để TRỐNG, nên lấy từ DB STG (VUAN + BAN_AN) theo "Mã vụ án thực tế" —
 * đúng cách tra "Trạng thái tố tụng" ở màn Quản lý án sơ thẩm. Khảo sát đầy đủ và các dòng bị loại:
 * seed-output/khao-sat-gdt-tai-tham-27-09.md.
 *
 * Đã loại khỏi bộ này:
 *   - VG05: nghiệp vụ đã bổ sung mã VA26-002515 (27/09/2026) → đã đưa vào bộ.
 *   - VG19 (VA26-003376): chưa có bản án sơ thẩm (TRANG_THAI_VU_AN = TT_VUAN.002.001).
 *   - Cả sheet 23_TAI_THAM_1D: 5 dòng đã Done, 2 dòng còn lại đã có đơn GĐT và lệch mã vụ án ↔ tên
 *     bị cáo so với DB (xem khảo sát) → chờ nghiệp vụ xác nhận.
 *
 * Khác biệt duy nhất giữa hai thủ tục nằm ở Bước 2, ô "Thủ tục giải quyết" (tài liệu Playwright nhập
 * data GDT-TT): chọn "Giám đốc thẩm" hay "Tái thẩm". Các bước sau dùng chung.
 */
import { BanAnSoTham } from '../common/ban-an-so-tham';

export interface VuGdtTaiTham extends BanAnSoTham {
  /** Mã dòng trong sheet (VG07, VT01…) — dùng lọc bằng QLA_GDT_MA */
  maSheet: string;
  /** Bước 23 · tab Kết quả xét xử — Nguyên nhân (danh mục theo thủ tục) */
  nguyenNhan?: string;
  /** Bước 23 · tab Kết quả xét xử — Kết quả giải quyết (mỗi vụ một giá trị) */
  ketQuaXetXu?: string;
}

/** Tên tòa đúng như danh mục đơn vị trên hệ thống (VUAN.DON_VI_KHOI_TAO → DON_VI.TEN_DONVI) */
const TOA = 'Tòa án nhân dân khu vực 9 - Hà Nội';
/** VG01–VG03 do Tòa án nhân dân thành phố Hà Nội xử sơ thẩm — sheet ghi tắt "Tòa án TP Hà Nội" */
const TOA_HN = 'Tòa án nhân dân thành phố Hà Nội';

const vu = (
  maSheet: string,
  maVuAn: string,
  soBanAn: string,
  ngayBanAn: string,
  thuTucGiaiQuyet: 'Giám đốc thẩm' | 'Tái thẩm',
  phuThem: Partial<VuGdtTaiTham> = {},
): VuGdtTaiTham => ({
  dong: 0,
  maSheet,
  maVuAn,
  soBanAn,
  ngayBanAn,
  toaAn: TOA,
  toaAnTrongFile: TOA,
  capXetXu: 'Sơ thẩm',
  loaiAn: 'Hình sự',
  thuTucGiaiQuyet,
  noiDungGoiY: `Khiếu nại Bản án số ${soBanAn} ngày ${ngayBanAn} của ${TOA}`,
  ...phuThem,
});

/**
 * Sheet 25_QD_GDT_PHAP_NHAN_1C1 — 20/22 dòng chạy được.
 *
 * Cột "Trạng thái tạo đơn GDT = Done" chỉ có nghĩa ĐÃ TẠO ĐƠN, không phải đã xong luồng: cột
 * "Trạng thái kết quả vụ GDT" của cả sheet còn trống. Vì vậy bộ này gồm CẢ 11 dòng đã có đơn —
 * B1–B2 tự nhận lại đơn cũ theo nội dung bản án nên không tạo trùng — và 9 dòng chưa có đơn.
 */
export const DS_GDT_PHAP_NHAN: VuGdtTaiTham[] = [
  // ── Đã có đơn từ trước, chạy tiếp từ B3 ──
  vu('VG01', 'VA26-002472', '377', '01/09/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Khoáng sản Tây Bắc',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
      toaAn: TOA_HN,
    toaAnTrongFile: TOA_HN,
    noiDungGoiY: `Khiếu nại Bản án số 377 ngày 01/09/2024 của ${TOA_HN}`,
  }),
  vu('VG02', 'VA26-002494', '515', '09/09/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Khoáng sản Lào Cai',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
      toaAn: TOA_HN,
    toaAnTrongFile: TOA_HN,
    noiDungGoiY: `Khiếu nại Bản án số 515 ngày 09/09/2024 của ${TOA_HN}`,
  }),
  vu('VG03', 'VA26-002497', '514', '16/09/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Xuất nhập khẩu Tây Bắc',
    nguoiKhangNghi: 'Viện trưởng Viện kiểm sát',
      toaAn: TOA_HN,
    toaAnTrongFile: TOA_HN,
    noiDungGoiY: `Khiếu nại Bản án số 514 ngày 16/09/2024 của ${TOA_HN}`,
  }),
  vu('VG04', 'VA26-002501', '16', '23/09/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Dệt may Phương Đông',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG06', 'VA26-002518', '515', '07/10/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH May mặc Đông Á',
    nguoiKhangNghi: 'Viện trưởng Viện kiểm sát',
  }),
  vu('VG08', 'VA26-003267', '25', '21/10/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Vận tải Hải Đăng',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG09', 'VA26-003276', '26', '28/10/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Giao nhận Cát Lái',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
  }),
  vu('VG10', 'VA26-003315', '27', '04/11/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Kho vận Đình Vũ',
    nguoiKhangNghi: 'Viện trưởng Viện kiểm sát',
  }),
  vu('VG11', 'VA26-003318', '28', '11/11/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Hóa chất Bình Minh',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG12', 'VA26-003326', '29', '18/11/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Môi trường Bình Minh',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
  }),
  vu('VG13', 'VA26-003338', '30', '25/11/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Xử lý chất thải Miền Trung',
    nguoiKhangNghi: 'Viện trưởng Viện kiểm sát',
  }),
  // ── Chưa có đơn, tạo mới từ B1–B2 ──
  // VG05: mã vụ án do nghiệp vụ bổ sung 27/09/2026 (sheet để trống). Bản án 5161 đã CO_HIEU_LUC.
  vu('VG05', 'VA26-002515', '5161', '30/09/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Dệt may Sài Gòn',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
  }),
  vu('VG07', 'VA26-002521', '511', '16/10/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Logistics Hải Phòng',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG14', 'VA26-003344', '31', '02/12/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Tái chế Việt Nhật',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG15', 'VA26-003352', '32', '09/12/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Xây lắp Thành Công',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
  }),
  vu('VG16', 'VA26-003356', '33', '16/12/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Xây dựng Thành Đô',
    nguoiKhangNghi: 'Viện trưởng Viện kiểm sát',
  }),
  vu('VG17', 'VA26-003370', '34', '23/12/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Tư vấn Đấu thầu Việt',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG18', 'VA26-003373', '35', '30/12/2024', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Đầu tư Xây dựng An Phú',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
  }),
  vu('VG20', 'VA26-003876', '45', '13/01/2025', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Xuất nhập khẩu Đại Dương',
    nguoiKhangNghi: 'Chánh án Tòa án nhân dân tối cao',
  }),
  vu('VG21', 'VA26-003878', '46', '20/01/2025', 'Giám đốc thẩm', {
    biCao: 'Công ty CP Đại Dương Miền Bắc',
    nguoiKhangNghi: 'Chánh án Tòa án có thẩm quyền (TAND cấp tỉnh, Tòa án quân sự Trung ương)',
  }),
  vu('VG22', 'VA26-003879', '47', '27/01/2025', 'Giám đốc thẩm', {
    biCao: 'Công ty TNHH Đại Dương Miền Nam',
    nguoiKhangNghi: 'Viện trưởng Viện kiểm sát',
  }),
];

/**
 * Sheet 26_TAI_THAM_PHAP_NHAN_1D1 — 7 vụ, chưa vụ nào có đơn.
 * Sheet không có cột tên pháp nhân (chỉ có "Số pháp nhân"), nên để trống `biCao`: màn Thêm mới đơn
 * tự lấy người/pháp nhân từ bản án cũ.
 */
export const DS_TAI_THAM_PHAP_NHAN: VuGdtTaiTham[] = [
  vu('VT01', 'VA26-003896', '62', '09/06/2025', 'Tái thẩm'),
  vu('VT02', 'VA26-003898', '63', '16/06/2025', 'Tái thẩm'),
  vu('VT03', 'VA26-003884', '53', '23/06/2025', 'Tái thẩm'),
  vu('VT04', 'VA26-003886', '55', '30/06/2025', 'Tái thẩm'),
  vu('VT05', 'VA26-003889', '57', '07/07/2025', 'Tái thẩm'),
  vu('VT06', 'VA26-003890', '59', '14/07/2025', 'Tái thẩm'),
  vu('VT07', 'VA26-003892', '61', '21/07/2025', 'Tái thẩm'),
];

/**
 * Sheet 23_TAI_THAM_1D — 2 dòng chưa đánh dấu Done (VA123, VA124). Thủ tục Tái thẩm.
 * Lưu ý: cả hai bản án ĐÃ có đơn GĐT từ đợt trước (BA 34 → đơn 9349, BA 3 → đơn 8276…8306), nên B1–B2
 * nhiều khả năng nhận lại đơn cũ mang thủ tục GIAM_DOC_THAM thay vì tạo đơn Tái thẩm mới — kiểm DB sau
 * khi chạy, giống trường hợp VT01/đơn 9683.
 * Sheet ghi tên bị cáo lệch với DB (VA123 ghi "Nguyễn Văn Tài" nhưng VA26-003639 là Trần Văn Thẩm;
 * VA124 ghi "Trần Văn Thẩm" nhưng VA26-002462 là Lê Văn Tuyên) → để trống biCao, lấy người từ bản án cũ.
 */
export const DS_TAI_THAM_SHEET23: VuGdtTaiTham[] = [
  vu('VA123', 'VA26-003639', '34', '06/03/2025', 'Tái thẩm'),
  vu('VA124', 'VA26-002462', '3', '13/03/2025', 'Tái thẩm'),
];

/**
 * Bước 23 — tab "Kết quả xét xử": mỗi vụ một Nguyên nhân và một Kết quả giải quyết.
 *
 * Nguyên nhân: danh mục chia theo thủ tục — nhóm giám đốc thẩm dùng cho VG.., nhóm tái thẩm dùng cho
 * VT../VA12.. Mỗi vụ chọn một giá trị, được phép lặp giữa các vụ.
 *
 * Kết quả giải quyết: yêu cầu MỖI VỤ MỘT GIÁ TRỊ KHÁC NHAU. Danh mục có 24 mục mà bộ này 30 vụ, nên
 * 21 vụ giám đốc thẩm dùng 21 giá trị riêng biệt; 9 vụ tái thẩm dùng 3 giá trị riêng của tái thẩm
 * (HUY_QD_GDT_TT_*) và 6 giá trị còn lại buộc phải trùng nhãn với nhóm giám đốc thẩm — đã đánh dấu
 * bằng chú thích "trùng nhãn" để nghiệp vụ đổi nếu cần.
 */
export const KET_QUA_XET_XU: Record<string, { nguyenNhan: string; ketQua: string }> = {
  // ── 21 vụ Giám đốc thẩm: 21 kết quả khác nhau ──
  VG01: { nguyenNhan: 'Kháng nghị không có căn cứ', ketQua: 'Không chấp nhận kháng nghị, giữ nguyên bản án, quyết định có hiệu lực pháp luật' },
  VG02: { nguyenNhan: 'Do cấp xét xử sai', ketQua: 'Sửa toàn bộ bản án, quyết định của Tòa án đã có hiệu lực pháp luật' },
  VG03: { nguyenNhan: 'Do có tình tiết mới', ketQua: 'Sửa một phần bản án, quyết định của Tòa án đã có hiệu lực pháp luật' },
  VG04: { nguyenNhan: 'Do lý do khác', ketQua: 'Sửa phần bồi thường thiệt hại' },
  VG05: { nguyenNhan: 'Vi phạm nghiêm trọng thủ tục tố tụng', ketQua: 'Sửa phần hình phạt' },
  VG06: { nguyenNhan: 'Kết luận trong bản án không phù hợp tình tiết khách quan', ketQua: 'Sửa khác' },
  VG07: { nguyenNhan: 'Áp dụng sai pháp luật nghiêm trọng', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật để xét xử lại theo thủ tục sơ thẩm' },
  VG08: { nguyenNhan: 'Do kết luận bản án/quyết định sai', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật để điều tra lại theo thủ tục sơ thẩm' },
  VG09: { nguyenNhan: 'Kháng nghị không có căn cứ', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật để xét xử lại theo thủ tục phúc thẩm' },
  VG10: { nguyenNhan: 'Do cấp xét xử sai', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật để điều tra lại theo thủ tục phúc thẩm' },
  VG11: { nguyenNhan: 'Do có tình tiết mới', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật và đình chỉ giải quyết vụ án' },
  VG12: { nguyenNhan: 'Do lý do khác', ketQua: 'Hủy bản án, quyết định phúc thẩm, giữ nguyên bản án, quyết định sơ thẩm' },
  VG13: { nguyenNhan: 'Vi phạm nghiêm trọng thủ tục tố tụng', ketQua: 'Hủy quyết định giám đốc thẩm, giữ nguyên bản án, quyết định sơ thẩm' },
  VG14: { nguyenNhan: 'Kết luận trong bản án không phù hợp tình tiết khách quan', ketQua: 'Hủy quyết định giám đốc thẩm, giữ nguyên bản án, quyết định phúc thẩm' },
  VG15: { nguyenNhan: 'Áp dụng sai pháp luật nghiêm trọng', ketQua: 'Hủy quyết định của giám đốc thẩm, bản án quyết định phúc thẩm, giữ nguyên bản án, quyết định sơ thẩm' },
  VG16: { nguyenNhan: 'Do kết luận bản án/quyết định sai', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật và tuyên bố bị cáo không có tội' },
  VG17: { nguyenNhan: 'Thuộc trường hợp không được khởi kiện', ketQua: 'Rút kháng nghị' },
  VG18: { nguyenNhan: 'Do có tình tiết mới', ketQua: 'Giải quyết khác' },
  VG20: { nguyenNhan: 'Kháng nghị không có căn cứ', ketQua: 'Quyết định đình chỉ xét xử giám đốc thẩm' },
  VG21: { nguyenNhan: 'Do cấp xét xử sai', ketQua: 'Nhất trí yêu cầu, kiến nghị xem xét lại quyết định của Hội đồng Thẩm phán Tòa án nhân dân tối cao' },
  VG22: { nguyenNhan: 'Do lý do khác', ketQua: 'Không nhất trí yêu cầu, kiến nghị xem xét lại quyết định của Hội đồng Thẩm phán Tòa án nhân dân tối cao' },

  // ── 9 vụ Tái thẩm: 3 giá trị riêng của tái thẩm + 6 giá trị trùng nhãn với nhóm trên ──
  VT01: { nguyenNhan: 'Phát hiện tình tiết mới làm thay đổi bản chất', ketQua: 'Hủy quyết định giám đốc thẩm, tái thẩm để điều tra lại' },
  VT02: { nguyenNhan: 'Lý do khác', ketQua: 'Hủy quyết định giám đốc thẩm, tái thẩm để xét xử lại theo thủ tục sơ thẩm' },
  VT03: { nguyenNhan: 'Do kết luận bản án sai và đủ chứng cứ để kết luận lại', ketQua: 'Hủy quyết định giám đốc thẩm, tái thẩm để xét xử lại theo thủ tục phúc thẩm' },
  VT04: { nguyenNhan: 'Phát hiện tình tiết mới làm thay đổi bản chất', ketQua: 'Không chấp nhận kháng nghị, giữ nguyên bản án, quyết định có hiệu lực pháp luật' }, // trùng nhãn VG01
  VT05: { nguyenNhan: 'Lý do khác', ketQua: 'Sửa một phần bản án, quyết định của Tòa án đã có hiệu lực pháp luật' }, // trùng nhãn VG03
  VT06: { nguyenNhan: 'Do kết luận bản án sai và đủ chứng cứ để kết luận lại', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật để xét xử lại theo thủ tục sơ thẩm' }, // trùng nhãn VG07
  VT07: { nguyenNhan: 'Phát hiện tình tiết mới làm thay đổi bản chất', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật để điều tra lại theo thủ tục sơ thẩm' }, // trùng nhãn VG08
  VA123: { nguyenNhan: 'Lý do khác', ketQua: 'Hủy bản án, quyết định có hiệu lực pháp luật và đình chỉ giải quyết vụ án' }, // trùng nhãn VG11
  VA124: { nguyenNhan: 'Do kết luận bản án sai và đủ chứng cứ để kết luận lại', ketQua: 'Giải quyết khác' }, // trùng nhãn VG18
};

export const DS_GDT_TAI_THAM_27_09 = [...DS_GDT_PHAP_NHAN, ...DS_TAI_THAM_PHAP_NHAN, ...DS_TAI_THAM_SHEET23].map((v, i) => ({
  ...v,
  dong: i + 1,
  ...(KET_QUA_XET_XU[v.maSheet] ? { nguyenNhan: KET_QUA_XET_XU[v.maSheet].nguyenNhan, ketQuaXetXu: KET_QUA_XET_XU[v.maSheet].ketQua } : {}),
}));

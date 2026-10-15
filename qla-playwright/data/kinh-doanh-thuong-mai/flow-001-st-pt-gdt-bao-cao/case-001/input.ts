/**
 * CASE-001 của FLOW-001 KDTM — dữ liệu GIEO, TẤT ĐỊNH.
 *
 * Không đọc Excel, không `Math.random`, không `Date.now()` làm khoá nghiệp vụ. Mọi giá trị mô tả
 * sinh từ `ROOT_CASE_KEY` nên chạy bao nhiêu lần cũng ra cùng một bộ.
 *
 *
 * Cái gì là OUTPUT thì KHÔNG khai ở đây: số tiếp nhận, mã vụ án, số/ngày thụ lý, số bản án sơ thẩm
 * và phúc thẩm đều do hệ thống cấp ở bước "Lấy số" — chúng nằm trong CaseState
 * (`state/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001.<env>.state.json`).
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { tenDuongSu } from '../../../../khung/ten-viet';
import { FLOW_001 } from '../../../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';

export const CASE_ID = 'case-001';
export const ROOT_CASE_KEY = `${FLOW_001.module}|${FLOW_001.flow}|${CASE_ID}`;

/** Định danh dùng cho CaseState và mọi file spec của case */
export const DD: DinhDanhCase = {
  phanHe: FLOW_001.phanHe,
  flow: FLOW_001.flow,
  caseId: CASE_ID,
  module: FLOW_001.module,
  rootCaseKey: ROOT_CASE_KEY,
};

/**
 * Tên đương sự là HỌ TÊN NGƯỜI VIỆT THẬT, sinh tất định từ mã case (xem `khung/ten-viet.ts`).
 *
 * Bản trước ghép nhãn case vào tên ("Trần Kinh Doanh Aab") để tra trên lưới bằng một lần tìm.
 * Tiện cho máy nhưng "Aab" không phải tiếng Việt, dữ liệu nhìn giả và không demo được. Nay cùng
 * mã case luôn cho cùng một tên nên vẫn tra lại được, mà tên thì đọc như người thật.
 *
 *   case-001 → nguyên đơn "Thái Minh Thắng" · bị đơn "Phạm Thị …" (nữ)
 */
export const TEN_NGUYEN_DON = tenDuongSu(CASE_ID, 'nguyenDon');
export const TEN_BI_DON = tenDuongSu(CASE_ID, 'biDon', 'nu');

/**
 * Ô BẮT BUỘC CỦA TỪNG BIỂU MẪU — khai NHÃN → GIÁ TRỊ ở đây, không để code "chọn mục đầu".
 *
 * Vì sao: để code tự chọn thì mỗi môi trường ra một giá trị khác nhau, và khi ô không tìm thấy thì
 * kẹt mà không biết đáng lẽ phải điền gì. Khai sẵn thì sai sẽ báo rõ "đang có những mục nào".
 * Giá trị so khớp KHÔNG PHÂN BIỆT HOA THƯỜNG và chỉ cần CHỨA chuỗi khai ở đây.
 *
 * Nguồn: thông báo của chính form 32DS khi thiếu —
 * "Vui lòng chọn Giờ mở phiên họp | Vui lòng chọn Phân loại | Vui lòng chọn Lý do/căn cứ cụ thể".
 */
export const O_BAT_BUOC_32DS: [RegExp, string | undefined][] = [
  // Vụ này được đánh dấu không tiến hành hòa giải → phân loại theo Điều 206
  [/^Phân loại/i, 'Không được hòa giải'],
  // Ô này nạp lại theo "Phân loại" nên phải điền SAU. Chưa chốt giá trị → để rỗng, lấy mục đầu
  // theo thứ tự chữ cái và GHI LẠI vào báo cáo để chốt sau.
  // Ô này là DANH SÁCH CHECKBOX, không phải Select. Hai lựa chọn của Điều 206; chọn cái hợp với
  // tranh chấp hợp đồng mua bán hàng hoá.
  [/Lý do[/]căn cứ cụ thể/i, 'giao dịch dân sự vi phạm điều cấm'],
  // Textbox, placeholder "VD: 08:30" — gõ thiếu phút thì ô báo invalid
  [/Giờ mở phiên họp/i, '08:30'],
];

export const INPUT = {
  /**
   * TÀI KHOẢN.
   *
   * StepData b1: Tòa án cấp sơ thẩm = 001072038795 → chính là vai `chanhAnDanSu` trong
   * `config/tai-khoan.local.json`. Tài liệu ghi mọi bước ký là **"Ký logic"**.
   *
   * ĐÍNH CHÍNH 30/09/2026: ghi chú cũ ở đây nói `chanhAnDanSu` mở màn danh sách đơn ra
   * "Không tìm thấy trang" — SAI, phép đo đó dính 503/sai môi trường. Đo lại: HTTP 200, không lỗi,
   * menu có đủ "Kinh doanh và thương mại", "Đơn khởi kiện / yêu cầu", "Phân công thẩm phán".
   *
   * Chạy bằng `chanhAn` (Chánh án TANDTC) thì biểu mẫu KHÔNG có nút "Ký logic", chỉ có "Trình ký"
   * → quyết định dừng ở "Chờ ký" và luồng tắc ở bước 12.
   */
  vaiSoTham: 'chanhAnDanSu',
  /** Tòa cấp tỉnh quản lý Tòa sơ thẩm ở trên (StepData · Phúc thẩm b1) */
  vaiPhucTham: 'chanhAnPhucThamHanhChinh',

  // ───────── Bước 01 · b4 Thông tin đơn ─────────
  hinhThucNhanDon: 'Trực tiếp',
  /** StepData b4.5 — giá trị mong muốn của ô "Người nhận đơn" (danh mục cán bộ của đơn vị đăng nhập) */
  nguoiNhanDon: 'Nguyễn Mậu Trường',
  loaiDon: 'Kinh doanh, thương mại',
  phanLoaiDon: 'Đơn khởi kiện',
  /**
   * Quan hệ pháp luật (Thống kê) — khai bằng TÊN ĐÚNG TRONG DANH MỤC, không dò từ khoá.
   *
   * Với KDTM + Đơn khởi kiện, FE tính mã gốc `QHPL_TC_KDTM`
   * (`ThemMoi/payload/qhplThongKe.ts · tinhMaQhplThongKeGoc`).
   *
   * ⚠ DANH MỤC ĐÃ BỊ TÁI CẤU TRÚC NGÀY 03/10/2026 — hỏi thẳng CSDL STG ngày 04/10/2026
   * (`QTDM.DANHMUC` nơi `MA_LOAI_DANHMUC='QHPL_TC_KDTM'`, mọi dòng đều có `NGAY_SUA=2026-10-03`):
   *   · thêm nhóm mới `.030 Tranh chấp hợp đồng thương mại` (cấp 1), và
   *   · ĐƯA 12 lá hợp đồng xuống LÀM CON của `.030`, đồng thời ĐỔI TÊN chúng:
   *     `.001` từ "Mua bán hàng hoá" → **"Tranh chấp hợp đồng mua bán hàng hóa"** (hoá → hóa).
   *
   * Hệ quả: hạt giống cũ (`tenQhplThongKe: 'Mua bán hàng hoá'`, không có nhánh cha) KHÔNG còn mục
   * nào khớp — cây chỉ nạp cấp 1, mà lá giờ ở cấp 2. Phải khai `qhplChaThongKe` để
   * `chonQhplThongKe` MỞ NHÁNH rồi bấm lá, y như luồng dân sự.
   *
   * Danh mục lá chọn được của cả 4 loại án nằm ở `data/vu-an-thuc/ban-an-cong-bo.ts` (đọc máy móc
   * từ CSDL, không gõ tay).
   */
  maQhplThongKe: 'QHPL_TC_KDTM.001',
  tenQhplThongKe: 'Tranh chấp hợp đồng mua bán hàng hóa',
  /** Nhánh cha cấp 1 của lá — bắt buộc từ 03/10/2026, xem ghi chú trên */
  qhplChaThongKe: 'Tranh chấp hợp đồng thương mại',
  /** Ô "Quan hệ pháp luật chi tiết" — chữ tự do, không phải danh mục */
  quanHePhapLuatChiTiet: 'Tranh chấp hợp đồng mua bán hàng hóa',
  lyDoKhongHoaGiai: 'Các bên đã thỏa thuận không tiến hành hòa giải tại Tòa án.',

  // ───────── Bước 01 · b6 Đương sự ─────────
  /**
   * ⚠ LỆCH ĐẶC TẢ: StepData b6.2/b6.3 yêu cầu "Doanh nghiệp / Tổ chức". Helper dùng chung
   * (`common/form-nguoi.ts`) hiện CHỈ có nhánh cá nhân. Để thông luồng một vụ KDTM trước, tạm dùng
   * đương sự CÁ NHÂN; nhánh pháp nhân bổ sung sau (việc riêng, không chặn luồng).
   */
  /**
   * `diaChi` điền vào ô "Địa chỉ chi tiết" của CẢ "Nơi thường trú" và "Nơi ở hiện tại" — hai dòng
   * FE bắt buộc với đương sự trên đơn (QLN-12466, `FormDuongSu/sections/ThongTinDiaChiSection.tsx`;
   * `TableDuongSu/index.tsx:1249` bật `batBuocThuongTruNhomBiKien` khi nguồn dữ liệu là đơn).
   * Tỉnh/Phường/Quốc gia KHÔNG bắt buộc → không mở dropdown địa giới, bớt hai lần gọi danh mục
   * cho mỗi đương sự.
   */
  nguyenDon: {
    nguyenVan: TEN_NGUYEN_DON,
    hoTen: TEN_NGUYEN_DON,
    tuoi: 45,
    laToChuc: false,
    diaChi: 'Số 1, phố Trần Hưng Đạo',
  },
  biDon: {
    nguyenVan: TEN_BI_DON,
    hoTen: TEN_BI_DON,
    tuoi: 50,
    laToChuc: false,
    diaChi: 'Số 2, phố Lý Thường Kiệt',
  },

  // ───────── Bước 01 · b7 Yêu cầu ─────────
  noiDungYeuCau: `Đề nghị Tòa án giải quyết tranh chấp kinh doanh thương mại giữa ${TEN_NGUYEN_DON} và ${TEN_BI_DON}.`,
  giaTriYeuCau: '150000000',

  // ───────── Bước 02 · phân công Thẩm phán xử lý đơn ─────────
  nguoiKyPhanCong: 'Dương Văn Hải',
  vaiTroPhanCongDon: 'Thẩm phán xử lý đơn',
  /**
   * Thẩm phán được phân công xử lý đơn. Để RỖNG thì lấy mục đầu theo thứ tự chữ cái (tất định).
   * Đo 30/09/2026 trên STG với tài khoản TANDTC: danh mục là Thẩm phán TAND tối cao,
   * vd. "Nguyễn Biên Thùy - 26/03/1970 - Thẩm phán TAND tối cao".
   */
  thamPhanXuLyDon: '',

  // ───────── Bước 03 · Thông báo 26-DS ─────────
  bieuMauSuaDoiBoSung: 'Yêu cầu sửa đổi, bổ sung đơn khởi kiện (26-DS)',
  lyDoXuLyDon: 'Đơn khởi kiện thiếu nội dung theo quy định',
  /**
   * Ba ô chữ bắt buộc còn lại của 26-DS (FE: BieuMauMS_26-DS/index.tsx):
   * NOI_DUNG_YEU_CAU_SUA_DOI · CAN_CU_DIEU · NGAY_SUA_DOI_BO_SUNG (hạn = hôm nay + 30 ngày).
   */
  noiDungYeuCauSuaDoi:
    'Đơn khởi kiện chưa nêu rõ yêu cầu cụ thể đối với bị đơn; đề nghị người khởi kiện sửa đổi, bổ sung.',
  canCuPhapLySuaDoi: 'Điều 193 Bộ luật Tố tụng dân sự năm 2015',

  // ───────── Bước 04 · tạm ứng án phí ─────────
  thuTucDuKien: 'Thủ tục thông thường',
  bieuMauTamUngAnPhi: 'Thông báo nộp tiền tạm ứng án phí (Dành cho Thẩm phán được phân công)(29-DS)',
  /** Án phí KDTM không có giá ngạch (StepData mục 3.15) */
  soTienTamUng: '3000000',

  // ───────── Bước 05 · thụ lý ─────────
  bieuMauThongBaoThuLy: 'Thông báo về việc thụ lý vụ án',

  // ───────── Bước 07 · phân công sơ thẩm ─────────
  quyetDinhPhanCongThamPhan: 'Quyết định phân công Thẩm phán giải quyết vụ án dân sự',
  quyetDinhPhanCongThuKy: 'Quyết định phân công Thư ký Tòa án tiến hành tố tụng',
  quyetDinhPhanCongHoiTham: 'Quyết định phân công Hội thẩm nhân dân',
  soHoiThamNhanDan: 2,
  /** Vai trò chọn trong ô 'Vai trò' của từng quyết định phân công (StepData Step4.5, 4.8, 4.10) */
  vaiTroThamPhanChuToa: 'Thẩm phán chủ tọa',
  /**
   * Tên Thẩm phán chủ tọa MONG MUỐN — ưu tiên chính người đang đăng nhập.
   *
   * Vì sao: quyết định đưa vụ án ra xét xử (47-DS) ghi rõ "do Thẩm phán được phân công giải quyết
   * vụ án ký". Phân công người khác thì tài khoản đang chạy chỉ bấm được "Trình ký", quyết định
   * nằm ở "Chờ ký" và luồng tắc ở bước 12 (đo 30/09/2026: chủ tọa Doãn Văn Tuyến → 47DS treo).
   * StepData cho một tài khoản làm hết mọi bước, nên chủ tọa phải là chính tài khoản đó.
   * Không có tên này trong danh mục thì lùi về mục đầu theo thứ tự chữ cái.
   */
  tenThamPhanChuToa: 'Nguyễn Mậu Trường',
  vaiTroThuKy: 'Thư ký',
  vaiTroHoiTham: 'Hội thẩm nhân dân',

  // ───────── Bước 08 · chuẩn bị xét xử sơ thẩm ─────────
  bieuMauThongBaoPhienHop:
    'Thông báo về phiên họp kiểm tra việc giao nộp, tiếp cận, công khai chứng cứ và hòa giải (31-DS)',
  bieuMauBienBanChungCu: 'Biên bản về kiểm tra việc giao nộp, tiếp cận, công khai chứng cứ (35-DS)',
  bieuMauBienBanHoaGiai: 'Biên bản hòa giải (34-DS)',
  ketQuaHoaGiai: 'Hòa giải không thành',
  bieuMauDuaRaXetXuSoTham: 'Quyết định đưa vụ án ra xét xử sơ thẩm (Mẫu 47-DS)',
  /** Ô chữ của các biên bản chuẩn bị xét xử (StepData Step5) */
  diaDiemPhienHop: 'Phòng họp số 1, trụ sở Tòa án',
  /** Ô "Giờ mở phiên họp" của 32DS — bắt buộc */
  gioMoPhienHop: '08:00',
  diaDiemPhienToa: 'Phòng xử án số 1, trụ sở Tòa án',
  /**
   * Form "Thêm lịch xét xử (mở phiên tòa)" — mở từ 47DS → Chọn lịch xét xử → click ngày.
   * Để RỖNG (undefined) thì lấy mục đầu theo thứ tự chữ cái, vẫn tất định.
   */
  /** Cặp giờ của lịch xét xử — kết thúc PHẢI lớn hơn bắt đầu, nếu không hệ thống chặn */
  gioBatDauXetXu: '08:00',
  gioKetThucXetXu: '11:00',
  tieuDeLichXetXu: `Phiên tòa sơ thẩm KDTM — ${TEN_NGUYEN_DON}`,
  tinhChatPhienToa: undefined as string | undefined,
  /**
   * PHẢI khai rõ một PHÒNG XỬ CÓ THẬT. Để code tự lấy mục đầu bảng chữ cái thì trúng
   * "Phòng xử lưu động" — chọn nó là màn hiện thêm ô bắt buộc "Địa điểm xét xử (chi tiết)"
   * rồi chặn lưu bằng "Địa điểm xét xử không được để trống" (đo 30/09/2026).
   */
  diaDiemXetXu: 'Phòng xét xử 102 (PXX102)',
  /** Chỉ dùng khi màn hiện ô "(chi tiết)" — vd. khi chọn phòng xử lưu động. */
  diaDiemXetXuChiTiet: 'Hội trường UBND phường, trụ sở Tòa án',
  noiDungBienBanChungCu:
    'Các bên đã giao nộp, tiếp cận và công khai chứng cứ theo quy định; không có ý kiến bổ sung.',

  // ───────── Bước 09 · xét xử sơ thẩm ─────────
  bieuMauBienBanPhienToaSoTham: 'Biên bản phiên tòa sơ thẩm (48-DS)',
  bieuMauBienBanNghiAn: 'Biên bản nghị án (51-DS)',
  /** Ô soạn thảo của 48-DS và 51-DS (StepData Step6.2, 6.3 ghi "nhập nội dung Random") */
  noiDungBienBanPhienToaSoTham:
    'Phiên tòa khai mạc đúng giờ; Hội đồng xét xử kiểm tra căn cước những người được triệu tập, ' +
    'công bố tài liệu chứng cứ và tiến hành tranh tụng theo quy định.',
  noiDungBienBanNghiAn:
    'Hội đồng xét xử nghị án và thống nhất chấp nhận toàn bộ yêu cầu khởi kiện của nguyên đơn.',
  /**
   * Bảy ô BẮT BUỘC của 51-DS (đo 30/09/2026 — biểu mẫu chỉ hiện sau khi 47-DS đã ký thật).
   * Ngày nghị án lấy từ `ngayMoPhienToaSoTham` do bước 10 sinh, không gieo ở đây.
   */
  gioBatDauNghiAn: '13:30',
  gioKetThucNghiAn: '15:00',
  diaDiemNghiAn: 'Phòng nghị án, trụ sở Tòa án',
  canCuNghiAn:
    'Điều 264 Bộ luật Tố tụng dân sự; các điều luật về hợp đồng mua bán hàng hoá của Luật Thương mại.',
  yKienHoiDongXetXu:
    'Hội đồng xét xử thảo luận, biểu quyết theo đa số và thống nhất chấp nhận toàn bộ yêu cầu khởi kiện của nguyên đơn.',
  bieuMauBanAnSoTham: 'Bản án sơ thẩm',
  /** Card "QUYẾT ĐỊNH" của 52-DS — chốt tất định thay vì Random để đối chiếu báo cáo được */
  ketQuaTungYeuCau: 'Chấp nhận toàn bộ',
  /** Popup "Bản án sơ thẩm — soạn thảo (Mẫu 52-DS)" · StepData Step6.5 */
  tomTatBanAnSoTham:
    'Chấp nhận toàn bộ yêu cầu khởi kiện của nguyên đơn; buộc bị đơn thanh toán tiền hàng còn nợ.',
  /** Ô chữ của bản án sơ thẩm (màn cũ: tab Kết quả sơ thẩm) */
  noiDungBanAnSoTham:
    'Nguyên đơn khởi kiện yêu cầu bị đơn thanh toán tiền hàng theo hợp đồng mua bán hàng hoá đã ký.',
  nhanDinhBanAnSoTham:
    'Hợp đồng mua bán hàng hoá giữa các bên là hợp pháp; bị đơn chưa thực hiện nghĩa vụ thanh toán.',
  /**
   * Tòa ra bản án — đầu vào của bước 24 (đơn GĐT tra cứu bản án theo Tòa).
   * ĐO 30/09/2026 với vai `chanhAnDanSu`: vụ nằm ở **Tòa án nhân dân khu vực 9 - Hà Nội**.
   * (Giá trị cũ "Tòa án nhân dân tối cao" là do trước đây chạy nhầm bằng vai `chanhAn`.)
   */
  toaRaBanAnSoTham: 'Tòa án nhân dân khu vực 9 - Hà Nội',

  // ───────── Bước 10 · kháng cáo ─────────
  /**
   * Card "Thông tin kháng cáo" (StepData 7.2). Tài liệu ghi "Random" cho mấy ô này — ta CHỐT giá
   * trị để chạy lại cho ra cùng dữ liệu. Ô nào để `undefined` thì lấy mục đầu theo thứ tự chữ cái.
   * "Bản án/quyết định bị kháng cáo" KHÔNG gieo ở đây: phải chọn đúng bản án bước 12 vừa ký.
   */
  hinhThucTiepNhanKhangCao: 'Trực tiếp',
  loaiKhangCao: undefined as string | undefined,
  phamViKhangCao: undefined as string | undefined,
  yeuCauKhangCao: 'Đề nghị Tòa án cấp phúc thẩm sửa bản án sơ thẩm, bác toàn bộ yêu cầu khởi kiện.',
  /**
   * ĐO 30/09/2026: danh mục ô này chỉ có "Nguyên đơn | Bị đơn" — KHÔNG có "Đương sự" như
   * StepData 7.2 mô tả. Người bị kiện kháng cáo (StepData) → chọn "Bị đơn".
   */
  loaiNguoiKhangCao: 'Bị đơn',
  /** StepData 7.2 — người bị kiện kháng cáo */
  tenNguoiKhangCao: TEN_BI_DON,
  /**
   * Ô của biểu mẫu 61-DS (Thông báo nộp tiền tạm ứng án phí phúc thẩm) — bản FE 02/10/2026 bắt lập 61-DS
   * TRƯỚC 62-DS (mã lỗi máy chủ DON_KHANG_CAO_CHUA_LAP_THONG_BAO_TAM_UNG_61DS).
   * Án phí phúc thẩm vụ KDTM: 2.000.000đ (Nghị quyết 326/2016/UBTVQH14).
   */
  soTienTamUngAnPhiPhucTham: '2000000',
  diaChiNguoiKhangCao: 'Số 2, phố Lý Thường Kiệt, Huyện Đông Anh, Thành phố Hà Nội',
  /** Ô bắt buộc của 55-DS; để rỗng thì lấy mục đầu theo thứ tự chữ cái */
  phuongThucNopDon: undefined as string | undefined,
  bieuMauGiayXacNhanKhangCao: 'Giấy xác nhận đã nhận đơn kháng cáo (55-DS)',
  /**
   * Người ký ban hành 62-DS — ƯU TIÊN chính tài khoản đang chạy.
   * Để hệ thống lấy mục đầu bảng chữ cái thì trúng 'Doãn Văn Tuyến - Phó Chánh án', và thông báo
   * dừng ở 'Chờ ký' thay vì được ban hành (đo 30/09/2026) — cùng bẫy đã gặp ở 47-DS bước 10.
   */
  nguoiKyBanHanh62DS: 'Nguyễn Mậu Trường',
  /** Ô 'Những vấn đề yêu cầu Tòa án cấp phúc thẩm giải quyết' của 62-DS — bắt buộc */
  /**
   * Ô "Viện kiểm sát cùng cấp" của 62-DS. PHẢI GIEO GIÁ TRỊ: ô dùng labelInValue nên để code tự lấy
   * mục đầu thì ô HIỂN THỊ tên mà giá trị form vẫn rỗng → lưu báo "Vui lòng chọn Viện kiểm sát cùng
   * cấp" (đo 02/10/2026 ở case-002). Giá trị đo được trên STG của Tòa khu vực 9 - Hà Nội.
   */
  vienKiemSatCungCap: 'Viện kiểm sát nhân dân khu vực 1',
  noiDungThongBao62DS:
    'Xem xét lại toàn bộ bản án sơ thẩm theo nội dung kháng cáo của bị đơn.',
  bieuMauThongBaoKhangCao: 'Thông báo về việc kháng cáo (62-DS)',
  noiDungKhangCao: 'Không đồng ý với toàn bộ nội dung bản án sơ thẩm, đề nghị Tòa phúc thẩm xét xử lại.',

  // ───────── Bước 13–16 · phúc thẩm ─────────
  /**
   * Biên bản giao nhận hồ sơ ở bước 16 (Tòa phúc thẩm tiếp nhận). Người đại diện bên GIAO là
   * cán bộ của Tòa sơ thẩm — chính tài khoản đã chạy giai đoạn sơ thẩm.
   */
  tenNguoiGiaoHoSo: 'Nguyễn Mậu Trường',
  chucVuNguoiGiaoHoSo: 'Chánh án',
  /**
   * Người ký các văn bản của Tòa PHÚC THẨM — ưu tiên chính tài khoản đang chạy (ông Nguyễn Xuân
   * Kỳ). Để hệ thống lấy mặc định thì rơi vào Phó Chánh án và văn bản chỉ dừng ở 'Chờ ký'.
   */
  nguoiKyPhucTham: 'Nguyễn Xuân Kỳ',
  /** Ô bắt buộc của mẫu thông báo tạm ứng án phí 05-TB-DS */
  diaChiCoQuanThiHanhAn: 'Số 1, phố Lý Thường Kiệt, Hà Nội',
  /** HĐXX phúc thẩm gồm 03 Thẩm phán (StepData Phúc thẩm 2.4) */
  /**
   * ĐO 01/10/2026: danh mục vai trò của 84-DS là "Thẩm phán chủ tọa phiên tòa phúc thẩm" và
   * "Thành viên …" — KHÔNG có "Thẩm phán - Thành viên HĐXX" như StepData 2.4 viết.
   */
  vaiTroThamPhanChuToaPhucTham: 'Thẩm phán chủ tọa phiên tòa phúc thẩm',
  vaiTroThamPhanThanhVien: 'Thành viên',
  noiDungThongBao65DS:
    'Tòa án đã thụ lý vụ án để xét xử phúc thẩm theo kháng cáo của bị đơn; đề nghị các đương sự thực hiện quyền và nghĩa vụ theo quy định.',
  truongHopThuLyPhucTham: 'Thụ lý phúc thẩm theo kháng cáo',
  bieuMauThongBaoThuLyPhucTham: 'Thông báo về việc thụ lý vụ án để xét xử phúc thẩm',
  quyetDinhPhanCongPhucTham: 'Quyết định phân công người tiến hành tố tụng giải quyết vụ án dân sự (phúc thẩm) (84-DS)',
  bieuMauTamUngAnPhiPhucTham: 'Thông báo nộp tiền tạm ứng án phí phúc thẩm (83-DS)',
  bieuMauDuaRaXetXuPhucTham: 'Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS)',
  bieuMauBienBanPhienToaPhucTham: 'Biên bản phiên tòa phúc thẩm (73-DS)',
  ketQuaPhucTham: 'Không chấp nhận kháng cáo/kháng nghị',
  bieuMauBanAnPhucTham: 'Bản án phúc thẩm',
  /**
   * Ba ô BẮT BUỘC khác của 73-DS, ngoài ô soạn thảo "Báo cáo của Thư ký".
   * Form báo đúng tên khi thiếu: "Vui lòng nhập Nội dung tranh tụng | Phát biểu của Kiểm sát viên |
   * Kết thúc phiên tòa" (đo 02/10/2026).
   */
  noiDungTranhTung:
    'Các đương sự tranh luận về phạm vi kháng cáo; bị đơn không cung cấp thêm tài liệu, chứng cứ mới.',
  phatBieuKiemSatVien:
    'Đại diện Viện kiểm sát đề nghị Hội đồng xét xử không chấp nhận kháng cáo, giữ nguyên bản án sơ thẩm.',
  /**
   * Ô giờ bắt buộc của 73-DS bản FE 02/10/2026: "Phiên tòa kết thúc vào hồi". Lịch xét xử phúc thẩm
   * mở 07:00 nên chọn 11:30 cùng ngày.
   */
  gioKetThucPhienToaPhucTham: '11:30',
  ketThucPhienToa:
    'Chủ tọa tuyên bố kết thúc phần tranh tụng, Hội đồng xét xử vào phòng nghị án.',

  /** Ô soạn thảo của 73-DS (spec Phúc thẩm Step4.1 ghi "nhập Random") */
  noiDungBienBanPhienToaPhucTham:
    'Hội đồng xét xử phúc thẩm tiến hành phiên tòa theo đúng thủ tục; các đương sự trình bày ý kiến ' +
    'về kháng cáo; đại diện Viện kiểm sát phát biểu quan điểm.',
  /** Mục "Nội dung vụ án" / "Nhận định của Tòa án" / "Nội dung quyết định" của 75-DS */
  noiDungBanAnPhucTham:
    'Bị đơn kháng cáo toàn bộ bản án sơ thẩm nhưng không xuất trình được tài liệu, chứng cứ mới.',
  nhanDinhToaAnPhucTham:
    'Bản án sơ thẩm đã xem xét đầy đủ tài liệu, chứng cứ và áp dụng đúng pháp luật; kháng cáo không có căn cứ.',
  /** Ô bắt buộc của 75-DS mà spec không nhắc — form liệt kê khi thiếu (đo 02/10/2026) */
  noiDungQuyetDinhPhucTham:
    'Không chấp nhận kháng cáo của bị đơn; giữ nguyên bản án dân sự sơ thẩm. Án phí phúc thẩm do ' +
    'người kháng cáo chịu.',
  tomTatBanAnPhucTham: 'Giữ nguyên bản án sơ thẩm, không chấp nhận kháng cáo của bị đơn.',
  /**
   * 75-DS bắt buộc "Số bản án" và KHÔNG có nút "Lấy số" (khác 52-DS sơ thẩm) — phải nhập tay.
   * Dạng đầy đủ, không đặt số trần 1/2/3: số trần từng làm vụ KDTM 28/09 thành đơn phụ.
   */
  soBanAnPhucThamNhapTay: '12/2026/DS-PT',
  /**
   * Khối "Nơi nhận" của 75-DS. Ô BẮT BUỘC (form kêu "Viện kiểm sát nhận không được bỏ trống" —
   * đo 02/10/2026) mà spec dân sự không nhắc, nên phải gieo tay.
   */
  vienKiemSatNhan: 'Viện kiểm sát nhân dân thành phố Hà Nội',
  /**
   * Ô "Quan hệ pháp luật thống kê" ở tab Thông tin vụ án của VỤ GĐT — ô bắt buộc duy nhất còn thiếu
   * khi vụ GĐT sinh từ đơn (đo 02/10/2026). Danh mục THỐNG KÊ, chữ có thể khác ô "Quan hệ pháp luật".
   */
  /**
   * Giá trị gieo là CHUỖI LỌC, không phải nhãn đầy đủ: danh mục thống kê là cây ảo hoá và chỉ lọc
   * trên các nút ĐÃ NẠP, nên gõ trọn tên lá cấp 2 là ra rỗng. Lọc quá ngắn ("mua bán") thì trúng
   * "Mua bán cổ phiếu, trái phiếu…" (đo 02/10/2026).
   *
   * Từ 03/10/2026 lá `.001` nằm ở cấp 2 nên `chonQhplThongKe` dùng `qhplChaThongKe` để mở nhánh và
   * KHÔNG dùng chuỗi lọc nữa; chuỗi này còn được màn "Thông tin vụ án" của cụm GĐT dùng (bước 33).
   */
  quanHePhapLuatThongKe: 'mua bán hàng hóa',
  /**
   * 75-DS: thẻ chọn trong khối `role=radiogroup` "Quyết định đối với bản án sơ thẩm". Không chọn thì
   * bấm "Thêm mới bản án" chỉ hiện toast "Không thể lưu bản án — Chọn quyết định đối với bản án sơ
   * thẩm (Giữ nguyên / Sửa / Hủy)" và KHÔNG có request nào được gửi (đo 02/10/2026).
   * Khớp với kết quả đã chốt ở 51-DS: không chấp nhận kháng cáo → giữ nguyên.
   */
  quyetDinhVoiBanAnSoTham: 'Giữ nguyên',
  /**
   * Khối thứ hai, cùng `aria-label` với khối trên: "Ý kiến của Viện kiểm sát đối với bản án sơ thẩm".
   * Khớp với phát biểu của kiểm sát viên đã ghi ở 73-DS.
   */
  yKienVksVoiBanAnSoTham: 'Giữ nguyên',
  /**
   * Dùng cho thao tác SỬA tay (QLA_SUA_CHU_TOA=1): quyết định 85-DS thay đổi người tiến hành tố tụng,
   * đổi chủ tọa thành tài khoản đang chạy để bản án phúc thẩm ký được.
   */
  lyDoDoiChuToaPhucTham: 'Thay đổi Thẩm phán chủ tọa phiên tòa phúc thẩm theo phân công của Chánh án.',
} as const;

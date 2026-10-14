/**
 * NEO — chỗ phải đi tìm TRÊN MÀN cho từng thứ mà mapping yêu cầu.
 *
 * Vì sao phải khai tay: mapping nói bằng ngôn ngữ DB (`VUAN.THOIHAN_XETXU`, `QHPL_TC_DS`), còn màn
 * hình nói bằng NHÃN tiếng Việt ("Thời hạn xét xử"). Không có phép biến đổi tự động nào đúng, và
 * đoán nhãn là cách nhanh nhất để có một UT xanh vô nghĩa (CLAUDE.md · R0, R4).
 *
 * Quy tắc: CHƯA KHAI thì UT đánh `fixme` kèm lý do — **không** tự khớp mờ theo từ khoá.
 * Khai thêm một dòng thì phải kèm `bangChung`: `file:line` trong `qla-webapp/` hoặc lần chạy thật.
 */
import type { Neo, NeoNhomDanhMuc } from './loai.ts';

/** Màn Quản lý biểu mẫu — nơi tra "mã biểu mẫu đã có trên hệ thống chưa". */
export const MAN_QUAN_LY_BIEU_MAU = {
  route: 'cau-hinh/bieu-mau',
  tenMan: 'Cấu hình · Quản lý biểu mẫu',
  /** nhãn ô mã trong "Tìm kiếm nâng cao" */
  nhanOMa: 'Mã biểu mẫu',
  /**
   * Tên nút phải khớp bằng REGEX có neo cuối, KHÔNG `exact`: antd ghép chữ của icon vào tên khả
   * truy cập nên nút thật tên là **"search Tìm kiếm"** / **"up Thu gọn"** (đo trên STG 14/10/2026 —
   * `exact: 'Tìm kiếm'` chờ hết 30 s rồi hỏng). Neo `$` để không trúng "Tìm kiếm nâng cao".
   */
  nutMoTimNangCao: /Tìm kiếm nâng cao$/,
  nutTim: /Tìm kiếm$/,
  bangChung:
    'qla-webapp/src/pages/QuanLyBieuMau/index.tsx:45-50 (ProFormText name="ma" label="Mã biểu mẫu"), ' +
    ':233-245 (cột lưới "Mã biểu mẫu"); nhãn nút ở components/SearchableProTable/index.tsx:109,156; ' +
    'route ở components/HuongDan/kich-ban/cauHinh.ts:6 và layouts/MenuV3/du-lieu/quyTacAnhXa.ts:381',
} as const;

/**
 * Nhóm danh mục (mã trong mapping) → tổ hợp (Loại đơn × Phân loại đơn) mở ra nhóm đó trên ô
 * "Quan hệ pháp luật (Thống kê)".
 *
 * Số nhánh và nhánh mẫu đo trên STG 14/10/2026 bằng `tests/bao-cao-thong-ke/ut-do-nhom-danh-muc.spec.ts`
 * (bản đầy đủ: `state/bao-cao-thong-ke/ut-mapping/nhom-danh-muc-qhpl.<env>.txt`). Tên nhánh do máy
 * chủ cấp và ĐÃ đổi một lần (danh mục KDTM tái cấu trúc 03/10/2026) nên `nhanhMau` chỉ để đối chiếu
 * đúng nhóm, UT không khớp cứng theo nó.
 */
export const NHAN_NHOM_DANH_MUC: Record<string, NeoNhomDanhMuc | undefined> = {
  QHPL_TC_DS: {
    loaiDon: 'Dân sự',
    phanLoai: 'Đơn khởi kiện',
    soNhanhDaDo: 10,
    nhanhMau: 'Tranh chấp về giao dịch dân sự, hợp đồng dân sự',
    bangChung: 'dò STG 14/10/2026 · 10 nhánh cấp 1',
  },
  QHPL_YC_DS: {
    loaiDon: 'Dân sự',
    phanLoai: 'Đơn yêu cầu',
    soNhanhDaDo: 5,
    nhanhMau: 'Yêu cầu tuyên bố văn bản công chứng vô hiệu',
    bangChung: 'dò STG 14/10/2026 · 5 nhánh cấp 1',
  },
  QHPL_TC_KDTM: {
    loaiDon: 'Kinh doanh, thương mại',
    phanLoai: 'Đơn khởi kiện',
    soNhanhDaDo: 6,
    nhanhMau: 'Tranh chấp hợp đồng thương mại',
    bangChung: 'dò STG 14/10/2026 · 6 nhánh cấp 1',
  },
  QHPL_YC_KDTM: {
    loaiDon: 'Kinh doanh, thương mại',
    phanLoai: 'Đơn yêu cầu',
    soNhanhDaDo: 5,
    nhanhMau: 'Yêu cầu bắt giữ tàu bay, tàu biển',
    /**
     * Lượt dò đầu đọc được 0 nhánh cho tổ hợp này và suýt thành kết luận "nhóm chưa có"; UT chạy
     * lại với cách mở dropdown chắc tay (Escape → click → chờ dropdown, 3 lần) thì ra 5 nhánh.
     * Cây rỗng vì dropdown CHƯA MỞ, không phải vì danh mục trống.
     */
    bangChung: 'UT STG 14/10/2026 · 5 nhánh cấp 1 (lượt dò đầu đọc nhầm 0 nhánh do dropdown chưa mở)',
  },
};

/**
 * Màn có ô "Quan hệ pháp luật (Thống kê)" — dùng cho UT nhóm danh mục.
 *
 * KHÔNG phải `quan-ly-don/them-moi`: route đó là "Thêm mới Đơn đề nghị GĐT/TT" (tự mở popup Tải lên
 * tài liệu), không có ô `#qhplThongKe`. Ô này ở wizard "Thêm mới đơn khởi kiện và yêu cầu", vào bằng
 * nút trên màn danh sách — `page.goto` thẳng route wizard của SPA này trả về vỏ rỗng
 * (pages/them-moi-don.page.ts:1253).
 */
export const MAN_QHPL_THONG_KE = {
  route: 'quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL',
  tenMan: 'Quản lý đơn · Thêm mới đơn khởi kiện và yêu cầu',
  nutThemMoi: /Thêm mới đơn$/,
  tieuDeWizard: /Thêm mới đơn khởi kiện và yêu cầu/i,
  /** id ô TreeSelect + hai ô quyết định danh mục nào được nạp vào nó */
  o: '#qhplThongKe',
  oLoaiDon: '#loaiDon',
  oPhanLoai: '#phanLoai',
  bangChung:
    'flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/tao-don.flow.ts:21-28 (đường vào) và :68 ' +
    '(page.locator("#qhplThongKe"))',
} as const;

/**
 * Cột DB → trường trên màn. TRỐNG hết: chưa đối chiếu được trường nào, và 34 cột DB trong mapping
 * trải trên nhiều màn (thụ lý, chuẩn bị xét xử, xét xử, kết quả, người tham gia tố tụng).
 *
 * Khai một dòng theo mẫu:
 *
 *   'VUAN.THOIHAN_XETXU': {
 *     route: 'vu-an/dan-su/so-tham/chi-tiet?id={idVuAn}&tab=chuan-bi-xet-xu',
 *     tenMan: 'Chi tiết vụ án sơ thẩm · tab Chuẩn bị xét xử',
 *     nhan: 'Thời hạn xét xử',
 *     bangChung: 'qla-webapp/src/pages/…:123',
 *   },
 */
export const NEO_COT_DB: Record<string, Neo | undefined> = {};

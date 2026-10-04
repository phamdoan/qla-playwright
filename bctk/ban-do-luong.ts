/**
 * BẢN ĐỒ LUỒNG → BIỂU MẪU BÁO CÁO THỐNG KÊ.
 *
 * Trả lời đúng một câu hỏi: **chạy luồng nào thì có số liệu cho biểu mẫu nào**, và luồng đó đã đi
 * tới chốt cuối chưa.
 *
 * ───────────────────────── CHỐT CUỐI LÀ "KẾT QUẢ GIẢI QUYẾT" ─────────────────────────
 *
 * Một case chạy xanh hết các bước mà vụ chưa lên "Kết quả giải quyết" thì BCTK **không đếm được**:
 * nó chỉ nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết" và không có ô nào trong nhóm
 * "Kết quả xét xử". Bốn nhóm chỉ tiêu của mọi biểu mẫu vụ/việc (đọc từ sheet "Gộp" của
 * `80 báo cáo.xlsx`) là:
 *
 *   Phải giải quyết · Đã giải quyết · Còn lại chưa giải quyết · Kết quả xét xử · Hình thức xét xử
 *
 * Vì thế mỗi luồng ở đây khai `chotKetQua`: tên bước mà sau nó vụ có "Kết quả giải quyết" +
 * "Tình trạng giải quyết" trên màn. Luồng chưa có chốt đó thì dù xanh vẫn **chưa dùng được cho
 * BCTK** — ghi `chotKetQua: null` và nói rõ ở `ghiChu`.
 *
 * ───────────────────────── HAI KHUÔN LUỒNG, KHÔNG PHẢI MƯỜI BA ─────────────────────────
 *
 * Đọc hết 13 đặc tả trong `docs/stepdata/` thì chỉ có HAI khuôn lặp lại:
 *
 *   khuôn VỤ ÁN   (4 đặc tả: DS · HNGĐ · KDTM · LĐ — trùng nhau từng Step)
 *     sơ thẩm   Step3 Thụ lý → Step4 Phân công → Step5 Chuẩn bị xét xử → Step6 Xét xử
 *               → Step7 Kháng cáo → Step8 Chuyển hồ sơ lên phúc thẩm
 *     phúc thẩm Step1 Thụ lý → Step2 Phân công → Step3 Chuẩn bị xét xử → Step4 Xét xử
 *
 *   khuôn VỤ VIỆC (4 đặc tả: DS · HNGĐ · KDTM · LĐ — cũng trùng nhau từng Step)
 *     sơ thẩm   Step3 Thụ lý → Step4 Phân công → Step5 Chuẩn bị giải quyết
 *               → Step6 Phiên họp giải quyết (22-VDS) → Step7 Kháng cáo → Step8 Chuyển lên PT
 *     phúc thẩm Step1 Kháng cáo, kháng nghị → Step2 Thụ lý → Step3 Phân công
 *               → Step4 Phiên họp phúc thẩm (27-VDS)
 *
 * Còn lại là khuôn riêng: hình sự (có Thi hành án), phá sản, BPXLHC, và cụm GĐT/TT dùng chung.
 *
 * Hệ quả cho việc chia thư mục: luồng mới **sao khuôn**, không viết lại — y như
 * `flows/dan-su/flow-001-st-pt` đang dùng lại nguyên bộ bước 01→23 của luồng KDTM.
 *
 * ───────────────────────── TÊN THƯ MỤC ─────────────────────────
 *
 * Luồng MỚI đặt tên `flow-NNN-<khuôn>-<phạm vi>`, vd. `flow-002-vu-viec-st-pt`.
 * Ba luồng ĐÃ CÓ giữ nguyên tên cũ (`flow-001-st-pt`, `flow-001-so-tham`,
 * `flow-001-st-pt-gdt-bao-cao`) — tên luồng nằm trong `rootCaseKey`, đổi là mất trạng thái đã gieo.
 */
/**
 * Ghi rõ đuôi `.ts` (khác lệ chung của repo là nhập không đuôi): hai tệp trong `bctk/` không do
 * spec nào nhập, mà do công cụ `tools/bctk/do-phu.mjs` chạy bằng
 * `node --experimental-strip-types` nhập — Node ESM đòi đường dẫn đầy đủ, không tự thêm đuôi.
 */
import { DS_BAO_CAO, type MaBaoCao } from './danh-muc-80-bao-cao.ts';

/** Khuôn bước mà luồng đi theo (xem ghi chú đầu tệp) */
export type KhuonLuong = 'vu-an' | 'vu-viec' | 'hinh-su' | 'pha-san' | 'bpxlhc' | 'gdt-tt';

export type TrangThaiLuong =
  /** Đã có case chạy xanh tới chốt "Kết quả giải quyết" trên môi trường thật */
  | 'xong'
  /** Có mã, chạy được một phần, chưa tới chốt */
  | 'dang-lam'
  /** Chỉ có đặc tả, chưa có mã */
  | 'chua-lam';

export type LuongBctk = {
  /** Thư mục phân hệ dưới `flows/` và `data/` */
  phanHe: string;
  /** Thư mục luồng — tên ĐÃ CHỐT theo chuẩn, kể cả khi thư mục chưa tồn tại */
  flow: string;
  /** Đã có MÃ chưa (thư mục giữ chỗ kèm README thì vẫn là false) */
  daTao: boolean;
  khuon: KhuonLuong;
  /** Đặc tả nguồn trong `docs/stepdata/` */
  dacTa: string;
  /** Biểu mẫu BCTK mà luồng này nuôi số liệu */
  bieuMau: MaBaoCao[];
  trangThai: TrangThaiLuong;
  /**
   * Bước mà sau nó vụ có "Kết quả giải quyết" trên màn. `null` = luồng chưa tới chốt BCTK.
   * KHÔNG suy diễn: chỉ ghi khi đã thấy bước đó xanh trên môi trường thật.
   */
  chotKetQua: string | null;
  ghiChu?: string;
};

export const DS_LUONG_BCTK: LuongBctk[] = [
  // ───────────────────────── Đã có mã ─────────────────────────
  {
    phanHe: 'kinh-doanh-thuong-mai',
    flow: 'flow-001-st-pt-gdt-bao-cao',
    daTao: true,
    khuon: 'vu-an',
    dacTa: 'StepData_KinhDoanhThuongMai_VuAn.txt + StepData sơ thẩm_KDTM.txt + GDT-TT-bao-cao-thong-ke.txt',
    bieuMau: ['4A', '4B', '4C', '4D'],
    trangThai: 'xong',
    chotKetQua: '23-phuc-tham-kiem-ket-qua',
    ghiChu:
      'case-002 xanh trọn 01→45 trên STG. Đây là luồng DUY NHẤT hiện có cụm GĐT/TT (bước 24→45) ' +
      'nên cũng là luồng duy nhất nuôi được 4C/4D. ⚠ Hạt giống quan hệ pháp luật vừa phải sửa vì ' +
      'danh mục KDTM đổi 03/10/2026 — lượt chạy tới là lượt đầu kiểm lại chỗ sửa đó.',
  },
  {
    phanHe: 'dan-su',
    flow: 'flow-001-st-pt',
    daTao: true,
    khuon: 'vu-an',
    dacTa: 'StepData_DanSu_VuAn.txt',
    bieuMau: ['2A', '2B'],
    trangThai: 'xong',
    chotKetQua: '23-phuc-tham-kiem-ket-qua',
    ghiChu:
      'case-ds-002/003/004 xanh 23/23 trên STG. Dừng ở phúc thẩm theo đúng đặc tả (không có GĐT) ' +
      'nên KHÔNG nuôi được 2C/2D. Luồng này cũng nhận loại đơn HNGĐ và Lao động qua bộ 111 bản án ' +
      'thật (xem docs/vu-an-thuc.md) — nhưng hai loại đó chưa có lượt chạy nào.',
  },
  {
    phanHe: 'hinh-su',
    flow: 'flow-001-so-tham',
    daTao: true,
    khuon: 'hinh-su',
    dacTa: 'ST_PT_Hinh_su.txt',
    bieuMau: ['1A', '1B'],
    trangThai: 'dang-lam',
    chotKetQua: null,
    ghiChu:
      'Kẹt ở mẫu 020: xanh 4/7 bước rồi FE không phơi mẫu 020, nút "Mở phiên tòa" vô hiệu — đã thử ' +
      '4 đường trên cả STG và UAT. Chưa qua được Step4 "Xét xử" nên chưa có "Kết quả sơ thẩm", ' +
      'tức chưa có số liệu cho 1A.',
  },

  // ───────────────────────── Chỉ có đặc tả ─────────────────────────
  {
    phanHe: 'dan-su',
    flow: 'flow-002-vu-viec-st-pt',
    daTao: false,
    khuon: 'vu-viec',
    dacTa: 'StepData_DanSu_VuViec.txt',
    bieuMau: ['2A', '2B'],
    trangThai: 'chua-lam',
    chotKetQua: null,
    ghiChu: 'Biểu mẫu 2A/2B đếm CẢ "vụ" lẫn "việc" nhưng khác cột — thiếu luồng này là thiếu cột việc.',
  },
  {
    phanHe: 'hon-nhan-gia-dinh',
    flow: 'flow-001-vu-an-st-pt',
    daTao: false,
    khuon: 'vu-an',
    dacTa: 'StepData_HonNhanGiaDinh_VuAn.txt',
    bieuMau: ['3A', '3B'],
    trangThai: 'chua-lam',
    chotKetQua: null,
    ghiChu:
      'Trùng khuôn vụ án từng Step với đặc tả dân sự → sao khuôn, chỉ đổi loại đơn + quan hệ pháp ' +
      'luật. Bộ 111 bản án thật đã có 8 bản ghi HNGĐ sẵn sàng gieo.',
  },
  {
    phanHe: 'hon-nhan-gia-dinh',
    flow: 'flow-002-vu-viec-st-pt',
    daTao: false,
    khuon: 'vu-viec',
    dacTa: 'StepData_HonNhanGiaDinh_VuViec.txt',
    bieuMau: ['3A', '3B'],
    trangThai: 'chua-lam',
    chotKetQua: null,
  },
  {
    phanHe: 'kinh-doanh-thuong-mai',
    flow: 'flow-002-vu-viec-st-pt',
    daTao: false,
    khuon: 'vu-viec',
    dacTa: 'StepData_KinhDoanhThuongMai_VuViec.txt',
    bieuMau: ['4A', '4B'],
    trangThai: 'chua-lam',
    chotKetQua: null,
  },
  {
    phanHe: 'lao-dong',
    flow: 'flow-001-vu-an-st-pt',
    daTao: false,
    khuon: 'vu-an',
    dacTa: 'StepData_LaoDong_VuAn.txt',
    bieuMau: ['5A', '5B'],
    trangThai: 'chua-lam',
    chotKetQua: null,
    ghiChu: 'Trùng khuôn vụ án với dân sự. Bộ 111 bản án thật đã có 13 bản ghi Lao động.',
  },
  {
    phanHe: 'lao-dong',
    flow: 'flow-002-vu-viec-st-pt',
    daTao: false,
    khuon: 'vu-viec',
    dacTa: 'StepData_LaoDong_VuViec.txt',
    bieuMau: ['5A', '5B'],
    trangThai: 'chua-lam',
    chotKetQua: null,
  },
  {
    phanHe: 'pha-san',
    flow: 'flow-001-phuc-hoi-pha-san',
    daTao: false,
    khuon: 'pha-san',
    dacTa: 'StepData_PhaSan.txt',
    bieuMau: ['4E', '4F', '4G', '4H'],
    trangThai: 'chua-lam',
    chotKetQua: null,
    ghiChu: 'Khuôn riêng (phục hồi / tuyên bố phá sản), không sao được từ khuôn vụ án hay vụ việc.',
  },
  {
    phanHe: 'bien-phap-xu-ly-hanh-chinh',
    flow: 'flow-001-xem-xet-quyet-dinh',
    daTao: false,
    khuon: 'bpxlhc',
    dacTa: 'StepData_BPXLHC.txt',
    bieuMau: ['7A', '7B', '7C', '7D'],
    trangThai: 'chua-lam',
    chotKetQua: null,
    ghiChu:
      'Khuôn riêng: đặc tả có hẳn tab "Kết quả giải quyết" với khối "Chấp hành quyết định ' +
      '(Điều 27-29)". Có nhánh TRẢ LẠI hồ sơ — nhánh đó nuôi cột 4 của mẫu 7A/7B.',
  },
];

/** Biểu mẫu nào đã có luồng đi tới chốt "Kết quả giải quyết" */
export function bieuMauDaCoSoLieu(): MaBaoCao[] {
  const ra = new Set<MaBaoCao>();
  for (const l of DS_LUONG_BCTK) {
    if (l.trangThai === 'xong' && l.chotKetQua) for (const m of l.bieuMau) ra.add(m);
  }
  return [...ra];
}

/** Biểu mẫu chưa có luồng nào nuôi được — kể cả biểu mẫu chưa có đặc tả nào trỏ tới */
export function bieuMauChuaCoSoLieu(): MaBaoCao[] {
  const co = new Set(bieuMauDaCoSoLieu());
  return DS_BAO_CAO.map(b => b.ma).filter(m => !co.has(m));
}

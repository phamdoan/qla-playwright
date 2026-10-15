/**
 * FLOW-001 · CẦU NỐI GIAI ĐOẠN C → D: bản án của case, KHÔNG đọc Excel.
 *
 * VẤN ĐỀ: `common/luong-gdt-tt.ts` (B1–B23, đã chạy thật trên STG 27–29/09/2026) nhận một
 * `BanAnSoTham` đọc từ Excel (`common/ban-an-so-tham.ts` · FILE_INPUT / FILE_DOI_CHIEU). Trong
 * FLOW_KDTM_GDT_TT, bản án ĐÃ do bước 12/22 của chính flow tạo ra — đọc lại Excel là hard-code
 * đúng cái vừa sinh, và sai ngay khi số bản án hệ thống cấp khác con số trong file.
 *
 * CÁCH LÀM: dựng `BanAnSoTham` từ CaseState. Thiếu khoá thì NÉM LỖI nói rõ phải chạy lại bước nào —
 * không lặng lẽ rơi về giá trị mặc định (rơi về mặc định là tạo đơn GĐT cho bản án của vụ khác).
 *
 * Dùng ở bước 24 (`24-gdt-tao-don-de-nghi`) và mọi bước GĐT sau đó cần dấu hiệu nhận vụ.
 */
import type { BanAnSoTham } from '../../../common/ban-an-so-tham';
import { chuanNgay } from '../../../common/ban-an-so-tham';
import { DinhDanhCase, moCase } from '../../../khung/case-state';
import { FLOW_001 } from './flow';
import { bangPhuThuoc } from '../../../khung/flow';
import { Locator, Page, expect, test } from '@playwright/test';
import { choHetSpin, chonSelect, dienTrongO, hienTrong, nghi, toastGanDay } from '../../../common/antd';
import { nhapDonTuBanAn } from '../../../common/buoc-nhap-don';
import { taiKhoan, cauHinhLuong, giaTri } from '../../../common/cau-hinh-luong';
import { moMenu } from '../../../common/menu';
import { moTab } from '../../../common/bieu-mau';
import { GdtPage } from '../../../pages/gdt.page';
import { HctpPage } from '../../../pages/hctp.page';
import { PheDuyetPage } from '../../../pages/phe-duyet.page';
import { ThemMoiDonPage } from '../../../pages/them-moi-don.page';
import { banAnCuaVuAn, donViCuaVuAn, layToken, maToaTheoTen, traCuuBanAnCu } from '../../../common/api-don';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

/** Cấp bản án mà đơn GĐT đề nghị xem xét lại */
export type CapDeNghi = 'phuc-tham' | 'so-tham';

export interface TuyChonBanAnTuState {
  /**
   * Đề nghị GĐT theo bản án PHÚC THẨM (mặc định — luồng chuẩn của case-001) hay theo bản án
   * SƠ THẨM (khi vụ không bị kháng cáo, bản án sơ thẩm có hiệu lực).
   */
  cap?: CapDeNghi;
  /**
   * BẢN ÁN DO CASE GIEO — dùng khi chạy RIÊNG cụm GĐT (BƯỚC 2→23 của đặc tả), không có bước 22 nào
   * để lấy từ state. Phải là bản án CÓ THẬT trên môi trường đang chạy: bước nhập đơn vẫn tra cứu,
   * không tìm thấy thì dừng ngay. Xem `banAnTuState`.
   */
  banAnGieo?: {
    soBanAn: string;
    ngayBanAn: string;
    toaAn: string;
    /** Nhãn "Loại án" MÀ HỆ THỐNG TRẢ VỀ sau tra cứu (vd. "Kinh doanh thương mại" — KHÔNG dấu phẩy) */
    loaiAn: string;
    capXetXu?: string;
  };
  /** Ô "Thủ tục giải quyết" ở tab Thông tin bản án đề nghị */
  thuTucGiaiQuyet?: 'Giám đốc thẩm' | 'Tái thẩm';
  /** Cột "Người kháng nghị" dùng ở bước lập dự thảo kháng nghị */
  nguoiKhangNghi?: string;
  /** Quan hệ pháp luật của vụ sơ thẩm — điền ô "Quan hệ pháp luật" của đơn (án dân sự/KDTM) */
  quanHePhapLuat?: string;
  /** Tên đương sự để CHỐT DANH TÍNH VỤ trên các màn phê duyệt (dauHieuVu) */
  nguyenDon?: string;
}

/**
 * Đọc CaseState của case rồi dựng đúng ba ô nhập của tab "Thông tin bản án đề nghị":
 * `soBanAn` → thongTinBanAn.soBanAnQd, `ngayBanAn` → ngayBanAnQd, `toaAn` → tenToaXetXu/maToaXetXu
 * (đối chiếu FE: `qla-webapp/src/pages/QuanLyDon/ThemMoiDon/type.ts` · FIELD_NAMES.THONG_TIN_BAN_AN).
 */
export function banAnTuState(dd: DinhDanhCase, tuyChon: TuyChonBanAnTuState = {}): BanAnSoTham {
  const { cap = 'phuc-tham' } = tuyChon;
  const state = moCase(dd, bangPhuThuoc(FLOW_001));
  const duLieu = state.doc().duLieu;

  /**
   * ĐƯỜNG THỨ HAI: bản án do CASE GIEO, không lấy từ state.
   *
   * Vì sao cần: đặc tả `GDT-TT-bao-cao-thong-ke.txt` BẮT ĐẦU TỪ MỘT BẢN ÁN ĐÃ CÓ — BƯỚC 2 là "nhập
   * dữ liệu đơn", đặc tả không có bước nào tạo bản án. Trên STG ta chạy trọn 45 bước nên bước 22
   * sinh ra bản án và state có sẵn số/ngày/tòa. Nhưng muốn chạy RIÊNG cụm GĐT (BƯỚC 2→23) — ví dụ
   * trên một môi trường mới, theo đúng phạm vi đặc tả — thì không có bước 22 nào để lấy.
   *
   * Khai `banAnGieo` thì dùng thẳng, và bước nhập đơn vẫn TRA CỨU bản án đó trên hệ thống: bản án
   * không tồn tại thì dừng ngay với "Không tìm thấy bản án trong hệ thống", KHÔNG nhập tay thành
   * đơn trỏ vào bản án không có thật.
   */
  if (tuyChon.banAnGieo) {
    const g = tuyChon.banAnGieo;
    return {
      dong: 0,
      soBanAn: g.soBanAn,
      ngayBanAn: chuanNgay(g.ngayBanAn),
      toaAn: g.toaAn,
      toaAnTrongFile: g.toaAn,
      capXetXu: g.capXetXu ?? (cap === 'phuc-tham' ? 'Phúc thẩm' : 'Sơ thẩm'),
      loaiAn: g.loaiAn,
      quanHePhapLuat: tuyChon.quanHePhapLuat,
      thuTucGiaiQuyet: tuyChon.thuTucGiaiQuyet ?? 'Giám đốc thẩm',
      nguoiKhangNghi: tuyChon.nguoiKhangNghi,
      noiDungGoiY: '',
      ...(tuyChon.nguyenDon ? { nguyenDon: tuyChon.nguyenDon } : {}),
    } as BanAnSoTham;
  }

  // Khoá + bước sinh ra khoá đó, đúng theo `flow.ts` — thiếu thì chỉ tên bước phải chạy lại
  const nguon =
    cap === 'phuc-tham'
      ? {
          so: ['soBanAnPhucTham', '22-phuc-tham-ban-an-75-ds'],
          ngay: ['ngayBanAnPhucTham', '22-phuc-tham-ban-an-75-ds'],
          toa: ['toaRaBanAnPhucTham', '22-phuc-tham-ban-an-75-ds'],
          capXetXu: 'Phúc thẩm',
        }
      : {
          so: ['soBanAnSoTham', '12-so-tham-ban-an-52-ds'],
          ngay: ['ngayBanAnSoTham', '12-so-tham-ban-an-52-ds'],
          toa: ['toaRaBanAnSoTham', '12-so-tham-ban-an-52-ds'],
          capXetXu: 'Sơ thẩm',
        };

  const can = ([khoa, buoc]: string[]): string => {
    const v = duLieu[khoa];
    if (!v?.trim()) {
      throw new Error(
        `Chưa dựng được bản án cho đơn GĐT: state của ${dd.caseId} thiếu "${khoa}" → chạy lại bước ` +
          `"${buoc}". KHÔNG được thay bằng số bản án trong Excel: đơn GĐT phải trỏ đúng bản án của case này.`,
      );
    }
    return v.trim();
  };

  return {
    dong: 0, // không đến từ Excel nên không có số dòng
    soBanAn: can(nguon.so),
    ngayBanAn: chuanNgay(can(nguon.ngay)),
    toaAn: can(nguon.toa),
    toaAnTrongFile: can(nguon.toa),
    capXetXu: nguon.capXetXu,
    /**
     * KHÔNG DẤU PHẨY. Tra cứu bản án xong, hệ thống tự điền "Loại án" theo bản án gốc và trả về
     * "Kinh doanh thương mại"; khai "Kinh doanh, thương mại" (như ô "Loại đơn") thì bước nhập đơn
     * dừng ở so khớp loại án (đo 02/10/2026). Đây là nhãn của bản án, khác nhãn danh mục loại đơn.
     */
    loaiAn: 'Kinh doanh thương mại',
    maVuAn: duLieu.maVuAnSoTham,
    quanHePhapLuat: tuyChon.quanHePhapLuat,
    thuTucGiaiQuyet: tuyChon.thuTucGiaiQuyet ?? 'Giám đốc thẩm',
    nguoiKhangNghi: tuyChon.nguoiKhangNghi,
    // Nút [Gợi ý] của màn sinh nội dung đơn — để rỗng thì bước nhập đơn tự bấm Gợi ý và đọc lại
    noiDungGoiY: '',
    // Dấu hiệu chốt danh tính vụ trên các màn phê duyệt (common/luong-gdt-tt.ts · dauHieuVu)
    ...(tuyChon.nguyenDon ? { nguyenDon: tuyChon.nguyenDon } : {}),
  } as BanAnSoTham;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// GIAI ĐOẠN D · GĐT/TT — bước 24→45
//
// Thân nghiệp vụ lấy nguyên từ `common/luong-gdt-tt.ts` (B1–B23, đã chạy thật trên STG 27–29/09/2026),
// chỉ đổi ba thứ:
//   1. KHÔNG tự mở phiên: khung đã mở sẵn `page` đúng vai khai trong flow.ts.
//   2. KHÔNG dùng sổ cái riêng (`seed-output/*.ledger.json`): dữ liệu nối bước lấy từ CaseState qua
//      `can('<khoá>')`, trả về bằng chứng để khung tự ghi.
//   3. Bản án không đọc Excel mà dựng từ CaseState (`banAnTuState`) — đơn GĐT phải trỏ đúng bản án
//      mà bước 22 vừa ký.
//
// VAI trong flow.ts đã sửa theo vai code chạy thật: B15/B16/B18/B19/B21/B23 là **Vụ trưởng**, B20 là
// **Chánh án** (đo 28/09/2026: vai Phó Chánh án không thấy biểu mẫu CTLVHDXX nào).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

type GhiChu = (nhan: string, mo: string) => void;
type DuLieuVao = typeof INPUT;

/** Người duyệt / người ký của Văn phòng HCTP (Luồng nhập data.txt · B4–B5) */
/**
 * Tên loại văn bản tờ trình trên màn Phê duyệt — khớp RỘNG vì tên khác nhau theo môi trường:
 * STG "Tờ trình phân công thẩm phán", pre-prod "Tờ trình khác" (xem HctpPage.lapTamTrinhPhanCong).
 * Đây là đường LÙI khi tìm theo id trượt, nên khớp rộng là đúng — id mới là cái chốt danh tính.
 */
const TEN_TO_TRINH = /Tờ trình/i;

const NGUOI_DUYET = giaTri('nguoiDuyetVanBan');
const NGUOI_KY = giaTri('nguoiKyVanBan');

/**
 * Giá trị nghiệp vụ của nhánh Vụ GĐKT **về dân sự** (D01.107) — vụ KDTM đi về Vụ này, không phải Vụ
 * hình sự. Ba khoá có bản riêng cho Vụ dân sự trong `config/luong-gdt.json`; khoá nào không có bản
 * riêng thì dùng khoá chung.
 */
const KHOA_DAN_SU: Record<string, string> = {
  thamTraVien: 'thamTraVienDanSu',
  lanhDaoPhuTrach: 'lanhDaoPhuTrachDanSu',
  nguoiNhanTieuHoSo: 'nguoiNhanTieuHoSoDanSu',
};
const gt = (khoa: string) => giaTri(KHOA_DAN_SU[khoa] ?? khoa);

/** Bản án của case + dấu hiệu nhận vụ trên các màn phê duyệt */
const banAnCase = (dd: Parameters<typeof banAnTuState>[0], input: DuLieuVao) =>
  banAnTuState(dd, {
    cap: 'phuc-tham',
    thuTucGiaiQuyet: 'Giám đốc thẩm',
    quanHePhapLuat: input.quanHePhapLuatChiTiet,
    nguyenDon: input.nguyenDon.hoTen,
    /**
     * Case khai `banAnGdt` → cụm GĐT chạy RIÊNG theo đúng phạm vi đặc tả (BƯỚC 2→23), lấy bản án
     * đã có trên môi trường thay vì bản án do bước 22 của chính case sinh ra.
     */
    ...((input as { banAnGdt?: NonNullable<TuyChonBanAnTuState['banAnGieo']> }).banAnGdt
      ? { banAnGieo: (input as { banAnGdt: NonNullable<TuyChonBanAnTuState['banAnGieo']> }).banAnGdt }
      : {}),
  });

/**
 * Dấu hiệu chốt danh tính vụ trên màn phê duyệt: số bản án + tên đương sự CỦA CHÍNH CASE.
 *
 * Bản trước lấy hằng `TEN_NGUYEN_DON` import từ `case-001/input` — tức mọi case đều tra lưới bằng tên
 * đương sự của case-001. Chạy case-002 là dò sai người (chưa lộ vì còn khớp theo số bản án), và luồng
 * dân sự dùng chung thân bước thì sai hẳn. Lấy từ `input` của case đang chạy (03/10/2026).
 */
const dauHieu = (b: { soBanAn: string }, input: DuLieuVao) => [b.soBanAn, input.nguyenDon.hoTen].filter(Boolean);

/** Thoát ký tự đặc biệt để ghép chuỗi vào RegExp */
const thoatRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Bảy ngày trở lại — cửa sổ tìm đề xuất khi không còn id trong sổ cái */
const BAY_NGAY = () => new Date(Date.now() - 7 * 24 * 3600_000);

// ───────────── BƯỚC 24 · Nhập đơn đề nghị GĐT theo bản án phúc thẩm (B1–B2) ─────────────
/**
 * Đơn phải trỏ ĐÚNG bản án mà bước 22 vừa ký. Chạy lại thì KHÔNG nhập đơn mới: tìm đơn đã có theo
 * bản án (`timDonDaCoTheoBanAn`) — nhập lại là sinh đơn trùng cho cùng một bản án.
 */
export async function gdtTaoDonDeNghi(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  ghi('24 đơn GĐT', `bản án đề nghị: ${b.soBanAn} — ${b.ngayBanAn} — ${b.toaAn}`);

  const daCo = await new ThemMoiDonPage(page).timDonDaCoTheoBanAn({
    soBanAn: b.soBanAn,
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
  });
  /**
   * Bản án đã có đơn thì DỪNG, không nhập thêm: đơn thứ hai cho cùng một bản án thành ĐƠN PHỤ, nằm ở
   * Vụ khác và cả nhánh GĐT sau đó đi sai vụ (đo 28/09/2026). Số thụ lý ĐƠN không đọc được từ danh
   * sách (dòng chỉ hiện "Thụ lý mới" của VỤ ÁN) nên không tự nối tiếp được — người chạy phải quyết
   * định dùng đơn nào.
   */
  if (daCo) {
    throw new Error(
      `Bản án ${b.soBanAn} (${b.ngayBanAn}) ĐÃ CÓ đơn GĐT mã ${daCo}. Nhập thêm sẽ thành đơn phụ.\n` +
        '  → Nếu muốn tiếp tục với đơn đó: điền "gdtMaDon" + "gdtSoThuLyDon" vào state của case rồi ' +
        'đánh dấu bước 24 PASSED. Nếu đơn đó của lượt chạy bỏ dở thì xoá nó trên hệ thống trước.',
    );
  }

  const kq = await nhapDonTuBanAn(page, b, test.info()).catch(async (loi: Error) => {
    if (/Không tìm thấy bản án trong hệ thống/.test(loi.message)) {
      throw new Error(`${loi.message}
  ${await doTraCuuBanAn(page, dd, ghi, input)}`);
    }
    throw loi;
  });
  if (!kq.maDon) throw new Error('Nhập đơn xong nhưng hệ thống không cấp mã đơn');
  if (!kq.soThuLy) throw new Error(`Đơn ${kq.maDon} chưa có số thụ lý — chưa thụ lý được đơn`);
  return { gdtMaDon: kq.maDon, gdtIdDon: kq.idDon || '', gdtSoThuLyDon: kq.soThuLy };
}

// ───────────── BƯỚC 25 · Phân công thẩm phán xử lý đơn (ngẫu nhiên) (B3) ─────────────
export async function gdtPhanCongThamPhanDon(page: Page, ghi: GhiChu, soThuLyDon: string) {
  await new HctpPage(page).phanCongThamPhanNgauNhien(soThuLyDon);
  ghi('25 phân công TP', `đã phân công ngẫu nhiên cho đơn số thụ lý ${soThuLyDon}`);
  // Hệ thống tự chọn thẩm phán nên bằng chứng là chính số thụ lý đã được phân công
  return { gdtThamPhanXuLyDon: `đã phân công ngẫu nhiên · đơn ${soThuLyDon}` };
}

// ───────────── BƯỚC 26 · Tờ trình phân công thẩm phán → Trình ký (B4) ─────────────
export async function gdtToTrinhPhanCong(page: Page, ghi: GhiChu, maDon: string) {
  const trang = new HctpPage(page);
  const khoa = await trang.lapTamTrinhPhanCong(maDon, NGUOI_DUYET, NGUOI_KY);
  if (!khoa) throw new Error('Lập tờ trình xong nhưng không lấy được id yêu cầu phê duyệt');
  // Tên loại văn bản khác nhau giữa các môi trường → ghi lại tên THỰC SỰ đã dùng
  ghi('26 loại văn bản', trang.loaiVanBanDaDung || '(không ghi được)');
  ghi('26 tờ trình', `khoá yêu cầu phê duyệt = ${khoa}`);
  return { gdtKhoaToTrinh: String(khoa) };
}

// ───────────── BƯỚC 27 · CVP cho ý kiến, trình Phó Chánh án (B7a) ─────────────
export async function gdtCvpTrinhPca(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao, khoaToTrinh: string) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  await pd.mo();
  const con = await moDeXuat(pd, khoaToTrinh, TEN_TO_TRINH, dauHieu(b, input));
  if (con) {
    const kq = await pd.ykienVaKyLogic(
      'Đồng ý phân công Thẩm phán, kính trình Phó Chánh án phê duyệt.',
      giaTri('capTrinhTiep'),
      giaTri('nguoiTrinhTiep'),
    );
    ghi('27 CVP', kq.moTa);
    /**
     * TRÌNH TIẾP KHÔNG LÀM ĐƯỢC THÌ PHẢI ĐỎ Ở ĐÂY, không để bước 28 đỏ thay.
     *
     * Trước 04/10/2026 bước này ghi bằng chứng "đã cho ý kiến và trình <cấp> (<người>)" lấy thẳng từ
     * dữ liệu gieo, KHÔNG kiểm màn có ô "Đề xuất trình tiếp" hay không. Trên pre-prod màn ký không có
     * ô đó, nên văn bản chỉ được KÝ chứ chưa chuyển cho ai — mà bước 27 vẫn xanh và vẫn báo đã trình.
     * Bước 28 sau đó đỏ với "Không thấy đề xuất …", khiến người đọc đi tìm sai chỗ (tôi mất ba lượt
     * chạy để nhận ra).
     */
    if (!kq.daTrinhTiep) {
      throw new Error(
        `Đã ký tờ trình nhưng KHÔNG trình tiếp được: ${kq.moTa}.\n` +
          `  → Văn bản không vào hộp phê duyệt của ${giaTri('capTrinhTiep')} ` +
          `(${giaTri('nguoiTrinhTiep')}), nên bước 28 sẽ không tìm thấy.\n` +
          '  → Cần biết trên môi trường này văn bản chuyển tiếp bằng đường nào: ' +
          'dò bằng `npm run don:do-phe-duyet` với vai nhận.',
      );
    }
  } else {
    ghi('27 CVP', 'đề xuất không còn ở danh sách chờ duyệt → đã xử lý ở lượt trước');
  }
  /**
   * BẰNG CHỨNG PHẢI LÀ KHOÁ SẠCH, không nối thêm nhãn.
   *
   * Trước đây trả `${khoaToTrinh} · đã trình <cấp>` — một chuỗi TỰ DỰNG, không phải thứ máy chủ trả,
   * và bước 28 dùng chuỗi đó để tra id nên không bao giờ khớp. Khung đòi "bằng chứng do hệ thống
   * cấp"; nối nhãn vào giá trị là lách đúng quy tắc đó.
   */
  return { gdtToTrinhDaTrinhPca: khoaToTrinh };
}

// ───────────── BƯỚC 28 · Phó Chánh án phê duyệt tờ trình (B9) ─────────────
/** Vụ án CHỈ SINH RA sau bước này — bước 31 kiểm "Đã có vụ án" phụ thuộc trực tiếp vào đây. */
export async function gdtPcaPheDuyetToTrinh(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao, khoaToTrinh: string) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  await pd.mo();
  const con = await moDeXuat(pd, khoaToTrinh, TEN_TO_TRINH, dauHieu(b, input));
  if (con) {
    await pd.ykienVaPheDuyet('Đồng ý phân công Thẩm phán theo tờ trình.');
    ghi('28 PCA', 'đã phê duyệt tờ trình phân công');
  } else {
    ghi('28 PCA', 'đề xuất không còn ở danh sách chờ duyệt → đã phê duyệt ở lượt trước');
  }
  return { gdtToTrinhDaPheDuyet: `${khoaToTrinh} · đã phê duyệt` };
}

// ───────────── BƯỚC 29 · Thông báo phân công TP → Trình ký (B5) ─────────────
/**
 * Chỉ lập được SAU KHI tờ trình đã duyệt. Đơn KHÔNG còn trong danh sách khi lọc loại văn bản này
 * nghĩa là thông báo đã lập ở lượt trước (bộ lọc chỉ liệt kê đơn CHƯA có văn bản đó) — lập lại là
 * sinh thêm một thông báo thừa, nên coi như xong và để bước 30 tìm theo tên loại văn bản.
 */
export async function gdtThongBaoPhanCong(page: Page, ghi: GhiChu, maDon: string) {
  let khoa: string | undefined;
  try {
    khoa = await new HctpPage(page).lapVanBanTuDanhSachDon(
      maDon,
      /Thông báo phân công TP/i,
      'Thông báo phân công',
      NGUOI_DUYET,
      NGUOI_KY,
    );
  } catch (loi) {
    if (!/Không thấy đơn .* khi lọc loại văn bản/.test((loi as Error).message)) throw loi;
    ghi('29 thông báo', `đơn ${maDon} không còn trong danh sách lập "Thông báo phân công TP" → đã lập từ trước`);
  }
  ghi('29 thông báo', `khoá yêu cầu phê duyệt = ${khoa || '(đã lập từ lượt trước)'}`);
  return { gdtKhoaThongBao: String(khoa || `đã lập · đơn ${maDon}`) };
}

// ───────────── BƯỚC 30 · CVP ký logic Thông báo phân công (B7b) ─────────────
export async function gdtCvpKyThongBao(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao, khoaThongBao: string) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  await pd.mo();
  // Khoá có thể là chuỗi ghi chú "đã lập · đơn ..." khi lượt trước không kịp lấy id → tìm theo tên loại
  const theoId = /^[0-9a-f-]{8,}$/i.test(khoaThongBao) ? khoaThongBao : '';
  const con = await moDeXuat(pd, theoId, /Thông báo phân công/i, dauHieu(b, input));
  if (con) {
    await pd.ykienVaKyLogicVanBan('Đồng ý ban hành thông báo phân công Thẩm phán.');
    ghi('30 CVP ký', 'đã ký logic thông báo phân công');
  } else {
    ghi('30 CVP ký', 'không còn đề xuất chờ ký → đã ký ở lượt trước');
  }
  return { gdtThongBaoDaKy: `${khoaThongBao} · đã ký logic` };
}

/**
 * Mở một đề xuất phê duyệt: theo id trước, không còn thì tìm theo TÊN LOẠI văn bản rồi CHỐT DANH
 * TÍNH VỤ. Trả về false khi đề xuất đã xử lý xong từ lượt trước.
 *
 * Vì sao phải chốt danh tính: mọi vụ đều có đề xuất cùng tên loại. Lấy dòng đầu danh sách là ký/duyệt
 * văn bản của vụ khác — đã xảy ra 28/09/2026 (VG16 mở trúng đề xuất của VA26-004447).
 */
async function moDeXuat(
  pd: PheDuyetPage,
  khoa: string,
  loai: RegExp,
  dsDauHieu: string[],
  /** Tên người đã trình — để lọc ô "Người tạo đề xuất" trên màn Phê duyệt đề xuất */
  nguoiTao = '',
): Promise<boolean> {
  if (khoa) {
    try {
      return await pd.moChiTietTheoId(khoa);
    } catch {
      await pd.mo();
    }
  }
  return pd.moChiTietDungVu(loai, dsDauHieu, BAY_NGAY(), 6, nguoiTao);
}

// ───────────── BƯỚC 31 · VERIFY: đơn đã có vụ án ở màn Nhận đơn và TL vụ án (B10) ─────────────
/**
 * Bước KIỂM CHỨNG, không tạo dữ liệu. Lọc theo SỐ + NGÀY bản án, KHÔNG dùng ô "Số thụ lý" của màn
 * này: nó tìm theo số thụ lý VỤ ÁN chứ không phải số thụ lý ĐƠN → điền số thụ lý đơn vào là bảng
 * trống dù vụ có thật (đo 28/09/2026). "Ngày bản án/quyết định" là RangePicker HAI ô — chỉ điền ô
 * đầu thì khoảng ngày không hợp lệ và màn trả về danh sách CHƯA LỌC (đo 27/09/2026).
 */
export async function gdtKiemThuLyDon(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  maDon: string,
  soThuLyDon: string,
) {
  const b = banAnCase(dd, input);
  await moMenu(page, ['Quản lý án GĐT/TT', 'Nhận đơn và TL vụ án']);
  const tab = page.getByRole('tab', { name: /Đã có vụ án/ });
  await expect(tab, 'Không thấy tab "Đã có vụ án" — kiểm tra quyền của tài khoản Thư ký Vụ').toBeVisible({
    timeout: 60_000,
  });
  await tab.click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  await page.getByLabel('Số bản án/quyết định', { exact: true }).fill(b.soBanAn);
  const oNgay = page.getByLabel('Ngày bản án/quyết định', { exact: true });
  await oNgay.fill(b.ngayBanAn);
  await page.keyboard.press('Enter');
  await nghi(page, 400, 800);
  await page.keyboard.type(b.ngayBanAn); // antd chuyển con trỏ sang ô kết thúc sau Enter
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  const oToa = page.getByLabel('Tòa ra bản án/quyết định', { exact: true }).first();
  if (b.toaAn && (await hienTrong(oToa, 5_000))) {
    await chonSelect(page, oToa, b.toaAn, { goDeLoc: true }).catch(() => {
      ghi('31 kiểm vụ án', `không chọn được Tòa "${b.toaAn}" → bỏ điều kiện tòa`);
    });
  }
  await choHetSpin(page);
  await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  /**
   * Khớp dòng theo MÃ ĐƠN (duy nhất). Số thụ lý trên dòng là "Thụ lý mới" của VỤ ÁN, khác số thụ lý
   * ĐƠN trong state (kiểm 29/09/2026: đơn 10250 hiện "Thụ lý mới: 1234568308") nên khớp theo số thụ
   * lý có thể trượt. Số bản án phải khớp ĐỨNG RIÊNG — số ngắn mà khớp chuỗi con sẽ trúng mọi dòng.
   */
  const dsDong = page.locator('.ant-table-row:visible');
  const soRieng = new RegExp(`(^|[^0-9])${b.soBanAn.replace(/[/\-]/g, '\\$&')}([^0-9]|$)`);
  const theoMa = dsDong.filter({ hasText: new RegExp(`Mã đơn:\\s*${maDon}(?![0-9])`) });
  const dong = ((await theoMa.count()) ? theoMa : dsDong.filter({ hasText: soRieng })).first();
  await expect(
    dong,
    `Không thấy vụ (bản án ${b.soBanAn} ngày ${b.ngayBanAn}, đơn ${maDon}, số thụ lý đơn ${soThuLyDon}) ở tab ` +
      '"Đã có vụ án" — vụ án chỉ sinh ra sau khi Phó Chánh án phê duyệt tờ trình phân công (bước 28).',
  ).toBeVisible({ timeout: 60_000 });
  const chu = (await dong.innerText()).replace(/\s+/g, ' ').trim();
  ghi('31 kiểm vụ án · dòng', chu.slice(0, 300));
  return { gdtVuAnDaThuLy: chu.slice(0, 200) };
}

// ───────────── BƯỚC 32 · Giao tiểu hồ sơ sang Vụ GĐ,KT (B10b) ─────────────
export async function gdtGiaoTieuHoSo(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  maDon: string,
  soThuLyDon: string,
) {
  const b = banAnCase(dd, input);
  await new GdtPage(page).giaoTieuHoSo(b.soBanAn, soThuLyDon, {
    nguoiGiao: gt('nguoiGiaoTieuHoSo'),
    nguoiNhan: gt('nguoiNhanTieuHoSo'),
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
    maDon,
  });
  ghi('32 giao tiểu hồ sơ', `${gt('nguoiGiaoTieuHoSo')} → ${gt('nguoiNhanTieuHoSo')}`);
  return { gdtTieuHoSoDaGiao: `${gt('nguoiGiaoTieuHoSo')} → ${gt('nguoiNhanTieuHoSo')} · đơn ${maDon}` };
}

// ───────────── BƯỚC 33 · Phân công Thẩm tra viên cho đơn (B11) ─────────────
export async function gdtPhanCongTtvDon(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  soThuLyDon: string,
) {
  const b = banAnCase(dd, input);
  const ttv = gt('thamTraVien');
  const lanhDao = gt('lanhDaoPhuTrach');
  await new GdtPage(page).phanCongTTV(b.soBanAn, ttv, lanhDao, {
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
    soThuLy: soThuLyDon,
  });
  ghi('33 phân công TTV', `TTV ${ttv} — lãnh đạo ${lanhDao}`);

  /**
   * TỰ KIỂM — `phanCongTTV` chỉ log "vừa lưu", không đối chiếu lại dòng nào được gán. Màn lọc theo
   * "Số BA/QĐ" kiểu CHUỖI CON nên số ngắn ("12") có thể trúng đơn của vụ khác; lưu thành công mà vụ của
   * mình vẫn chưa có TTV thì bước 34 trơ ra "danh sách trống" (đo 02/10/2026). Khoá chắc chắn là SỐ THỤ
   * LÝ ĐƠN — lọc lại theo nó rồi đọc chính dòng đó.
   */
  const dongDon = await timDongDonTheoSoThuLy(page, soThuLyDon, ghi);
  if (!dongDon) {
    throw new Error(
      `Lưu phân công TTV xong nhưng không tìm lại được dòng đơn số thụ lý ${soThuLyDon} ở màn Phân công ` +
        'Thẩm tra viên để kiểm chứng — không có bằng chứng thì không ghi là xong.',
    );
  }
  if (!dongDon.includes(ttv)) {
    throw new Error(
      `Dòng đơn ${soThuLyDon} KHÔNG mang tên Thẩm tra viên "${ttv}" sau khi lưu → cú lưu đã rơi vào đơn khác.\n` +
        `  Dòng: ${dongDon}`,
    );
  }
  ghi('33 phân công TTV · dòng đơn', dongDon);

  /**
   * BẰNG CHỨNG THẬT của bước này: tab "Tờ trình" của chi tiết vụ án MỞ ĐƯỢC. Tab đó bị khoá tới khi
   * `vuAn.danhSachPhanCong` có ĐỦ Thẩm tra viên + Lãnh đạo vụ (`ChiTietVuAnGDT/index.tsx:262-286`),
   * mà phân công theo ĐƠN chưa chắc ghi vào danh sách của VỤ — bước 34 (vai Thẩm tra viên) sẽ tắc.
   * Mở luôn ở đây, bằng vai Vụ trưởng, và in ra những gì tab "Phân công" của vụ đang có.
   */
  const idVuAn = await moVuAnTheoSoThuLy(page, soThuLyDon, banAnCase(dd, input).loaiAn, ghi).catch((e: Error) => {
    ghi('33 phân công TTV', `không mở được chi tiết vụ để kiểm tab Tờ trình: ${e.message.slice(0, 120)}`);
    return '';
  });
  if (idVuAn) {
    await hoanThienThongTinVuAn(page, idVuAn, ghi, input.quanHePhapLuatThongKe, input.quanHePhapLuatChiTiet);
    const tabToTrinh = page.locator('[role="tab"]').filter({ hasText: /^\s*Tờ trình\s*$/ }).first();
    const khoa =
      (await tabToTrinh.getAttribute('aria-disabled').catch(() => null)) === 'true' ||
      /ant-tabs-tab-disabled/.test((await tabToTrinh.getAttribute('class').catch(() => '')) || '');
    ghi('33 phân công TTV', `tab "Tờ trình" của vụ ${idVuAn}: ${khoa ? 'ĐANG BỊ KHOÁ' : 'mở được'}`);
    /**
     * ĐI BẰNG URL, không bấm tab: thẻ tab của màn này không đổi khi click (đo 02/10/2026 — thử cả
     * `moTab` dùng chung lẫn click force). FE đọc `?tab=` (`ChiTietVuAnGDT/index.tsx:97`) nên mở thẳng
     * `&tab=phan-cong` là chắc chắn.
     */
    await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=phan-cong`, {
      waitUntil: 'domcontentloaded',
    });
    await choHetSpin(page);
    await nghi(page, 1500, 2200);
    ghi(
      '33 phân công TTV · tab đang chọn',
      (await page.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim() || '(không đọc được)',
    );
    ghi(
      '33 phân công TTV · tab Phân công của vụ',
      [
        ...new Set(
          (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        ),
      ]
        .slice(0, 14)
        .join(' | ') || '(không có nút nào)',
    );
    ghi(
      '33 phân công TTV · dòng trong tab Phân công',
      (await page.locator('main .ant-table-row:visible').allInnerTexts().catch(() => []))
        .slice(0, 4)
        .map(s => s.replace(/\s+/g, ' ').trim().slice(0, 120))
        .join(' / ') || '(bảng rỗng)',
    );
  }
  return { gdtThamTraVienDuocGiao: `${ttv} (lãnh đạo ${lanhDao}) · đơn ${soThuLyDon}` };
}

// ───────────── BƯỚC 34 · Dự thảo Quyết định kháng nghị → Trình ký (B12a + B12b) ─────────────
export async function gdtDuThaoKhangNghi(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  soThuLyDon: string,
) {
  const gdt = new GdtPage(page);
  const b = banAnCase(dd, input);
  const idVuAn = await moVuAnTheoSoThuLy(page, soThuLyDon, b.loaiAn, ghi);
  ghi('34 dự thảo KN', `id vụ án = ${idVuAn}`);

  const daCo = await gdtDuThaoVoiChanDoan(gdt, page, idVuAn, ghi, {
    ketQua: gt('ketQuaGiaiQuyet'),
    nguoiKy: gt('nguoiKyQuyetDinh'),
    thamQuyenXetXu: gt('thamQuyenXetXu'),
    noiDungVuAn: gt('noiDungVuAn'),
    xetThay: gt('xetThay'),
  });
  if (daCo) ghi('34 dự thảo KN', `vụ án đã có dự thảo: ${daCo}`);

  /**
   * `canTieuHoSo = false`: dự thảo kết quả giải quyết không phải tờ trình nên không có bước tiểu hồ
   * sơ (`DanhSachVanBanToTrinh.tsx` chỉ render nút đó cho mã biểu mẫu tờ trình).
   */
  const khoa = await gdt.trinhToTrinhThamTra(
    idVuAn,
    gt('capTrinhKhangNghi'),
    /Kháng nghị|Dự thảo/,
    false,
    gt('nguoiTrinhKhangNghi'),
  );
  if (!khoa) throw new Error('Trình dự thảo kháng nghị xong nhưng không lấy được id yêu cầu phê duyệt');
  ghi('34 dự thảo KN', `khoá dự thảo = ${khoa}`);
  return { gdtKhoaDuThao: String(khoa) };
}

// ───────────── BƯỚC 35 · Phê duyệt + ký Quyết định kháng nghị (B13 + B13b) ─────────────
/**
 * Hai việc, cùng vai Phó Chánh án: DUYỆT dự thảo (màn tick dự thảo rồi bấm Duyệt, không có ô ý kiến)
 * rồi KÝ quyết định. Phải ký: bản ghi `DonKetQua` loại KHANG_NGHI — thứ làm hồ sơ kháng nghị hiện ra
 * ở bước 36 — do `BieuMau056GDTServiceImpl.xuLySauKySo` tạo, tức chỉ sinh ra SAU KHI KÝ.
 */
export async function gdtPheDuyetKhangNghi(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  khoaDuThao: string,
) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  await pd.mo();

  const conDuyet = await moDeXuat(pd, khoaDuThao, /Kháng nghị giám đốc thẩm|Kháng nghị/i, dauHieu(b, input));
  if (conDuyet) {
    await pd.duyetDuThaoKemTheo();
    ghi('35 duyệt KN', 'đã duyệt dự thảo kèm theo');
  } else {
    ghi('35 duyệt KN', 'dự thảo không còn chờ duyệt → đã duyệt ở lượt trước');
  }

  await pd.mo();
  const conKy = await moDeXuat(pd, khoaDuThao, /Kháng nghị giám đốc thẩm/i, dauHieu(b, input));
  if (conKy) {
    await pd.ykienVaKyLogicVanBan('Đồng ý ban hành Quyết định kháng nghị giám đốc thẩm.');
    ghi('35 ký KN', 'đã ký logic Quyết định kháng nghị');
  } else {
    ghi('35 ký KN', 'không còn đề xuất chờ ký → đã ký ở lượt trước');
  }
  return { gdtSoQuyetDinhKhangNghi: `${khoaDuThao} · đã duyệt và ký` };
}

// ───────────── BƯỚC 36 · Chuyển và nhận Hồ sơ kháng nghị (B14) ─────────────
export async function gdtChuyenNhanHoSoKhangNghi(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  await new GdtPage(page).chuyenVaNhanHoSoKhangNghi(b.soBanAn, {
    donViNhan: gt('donViNhanHoSo'),
    // Số bút lục không có trong dữ liệu nguồn — lấy theo số bản án để tra ngược được
    soButLuc: b.soBanAn,
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
  });
  ghi('36 hồ sơ KN', `đã chuyển sang ${gt('donViNhanHoSo')} và nhận ở tab hồ sơ đến`);
  return { gdtMaHoSoKhangNghi: `${b.soBanAn} → ${gt('donViNhanHoSo')}` };
}

/**
 * `GdtPage` phải biết LOẠI ÁN của vụ: các màn "Quản lý xét xử GĐT", "Danh sách vụ xét xử" và
 * "Phân công Hội đồng xét xử" có ô lọc "Loại án" MẶC ĐỊNH LÀ "Hình sự" (đo STG 30/09/2026) — không
 * đổi thì vụ KDTM bị lọc mất và tìm theo số bản án ra 0 dòng.
 */
const gdtTheoLoaiAn = (page: Page, loaiAn: string) => {
  const gdt = new GdtPage(page);
  gdt.loaiAn = loaiAn;
  return gdt;
};

// ───────────── BƯỚC 37 · Thụ lý vụ án xét xử GĐT (B15) ─────────────
/**
 * Phải làm TRƯỚC bước 38: popup "Danh sách vụ xét xử đã chọn" ở bước 41 chặn Lưu với "Vụ án chưa xác
 * định thẩm phán chủ tọa" nếu vụ xét xử chưa có phân công Thẩm phán TANDTC đã duyệt
 * (`XetXuGdtServiceImpl.getDanhSach` lấy `tenTP` từ đó).
 */
export async function gdtThuLyVuXetXu(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  const vuaThuLy = await gdtTheoLoaiAn(page, b.loaiAn).thuLyVuAnGdt(
    b.soBanAn,
    b.ngayBanAn,
    b.toaAn,
    input.nguyenDon.hoTen,
  );
  ghi('37 thụ lý GĐT', vuaThuLy ? 'vừa thụ lý' : 'đã thụ lý từ trước');
  return { gdtSoThuLyVuXetXu: `${b.soBanAn} · ${vuaThuLy ? 'vừa thụ lý' : 'đã thụ lý từ trước'}` };
}

// ───────────── BƯỚC 38 · Phân công Thẩm phán TANDTC → Lấy số → Trình ký (B16) ─────────────
/** Tài liệu BƯỚC 16: PHÂN CÔNG NGẪU NHIÊN — hệ thống tự chọn thẩm phán, không ai nhập tên. */
export async function gdtPhanCongThamPhanToiCao(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  // Đặt loại án: màn phân công cũng có ô lọc "Loại án" mặc định theo Vụ (xem gdtTheoLoaiAn)
  const khoa = await gdtTheoLoaiAn(page, b.loaiAn).phanCongThamPhanTANDTC(b.soBanAn, b.ngayBanAn, {
    nguoiKy: gt('nguoiKyToTrinhTANDTC'),
    /**
     * NGẪU NHIÊN như tài liệu B16, KHÔNG chỉ định đích danh. Đo 02/10/2026: danh sách chọn thẩm phán
     * của màn này chỉ có người CHỨC DANH "Thẩm phán TAND tối cao" (TPTATC_001 — 6 người trên STG),
     * không có Nguyễn Hải Trâm; mà chủ toạ HĐXX cũng KHÔNG lấy từ đây khi chọn "Hội đồng toàn thể"
     * (bước 41 ép chủ toạ = Chánh án), nên chỉ định ở đây không gỡ được bước 42.
     * Vẫn giữ tham số `thamPhanChiDinh` của page object cho trường hợp cần chỉ định tay.
     */
    toaAn: b.toaAn,
  });
  ghi('38 phân công TPTC', `tờ trình = ${khoa || '(đã lưu từ lượt trước)'}`);
  return { gdtKhoaToTrinhTPTC: String(khoa || `đã lưu · ${b.soBanAn}`) };
}

// ───────────── BƯỚC 39 · Ký logic Tờ trình phân công Thẩm phán TANDTC (B17) ─────────────
export async function gdtKyToTrinhToiCao(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  khoaToTrinhTPTC: string,
) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  const theoId = /^[0-9a-f-]{8,}$/i.test(khoaToTrinhTPTC) ? khoaToTrinhTPTC : '';
  const con = await moDeXuat(pd, theoId, /Tờ trình phân công thẩm phán tối cao/i, dauHieu(b, input));
  if (con) {
    await pd.ykienVaKyLogicVanBan('Đồng ý phân công Thẩm phán TANDTC theo tờ trình.');
    ghi('39 ký tờ trình TPTC', 'đã ký logic');
  } else {
    ghi('39 ký tờ trình TPTC', 'không còn đề xuất chờ ký → đã ký ở lượt trước');
  }
  return { gdtToTrinhTPTCDaKy: `${khoaToTrinhTPTC} · đã ký logic` };
}

// ───────────── BƯỚC 40 · Phân công Thẩm tra viên cho Hồ sơ kháng nghị (B18) ─────────────
/** Khác bước 33: lần này phân công cho HỒ SƠ KHÁNG NGHỊ (lọc Hình thức "Hồ sơ kháng nghị GĐT-TT"). */
export async function gdtPhanCongTtvHoSo(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  soThuLyDon: string,
) {
  const b = banAnCase(dd, input);
  const ttv = gt('thamTraVien');
  const lanhDao = gt('lanhDaoPhuTrach');
  await gdtTheoLoaiAn(page, b.loaiAn).phanCongTTV(b.soBanAn, ttv, lanhDao, {
    hinhThuc: gt('hinhThucPhanCongTPTC'),
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
    soThuLy: soThuLyDon,
  });
  ghi('40 phân công TTV HSKN', `TTV ${ttv} — lãnh đạo ${lanhDao}`);

  // TỰ KIỂM như bước 33: lưu xong phải đọc lại chính dòng của case, không tin một câu log
  const dongHskn = await timDongDonTheoSoThuLy(page, soThuLyDon, ghi);
  if (dongHskn && !dongHskn.includes(ttv)) {
    throw new Error(
      `Dòng hồ sơ kháng nghị của đơn ${soThuLyDon} KHÔNG mang tên Thẩm tra viên "${ttv}" sau khi lưu.\n` +
        `  Dòng: ${dongHskn}`,
    );
  }
  ghi('40 phân công TTV HSKN · dòng', dongHskn || '(không tìm lại được dòng để kiểm — xem log màn)');
  return {
    gdtThamTraVienHskn: `${ttv} · hình thức ${gt('hinhThucPhanCongTPTC')}${dongHskn ? ' · đã kiểm trên dòng' : ''}`,
  };
}

// ───────────── BƯỚC 41 · Danh sách vụ xét xử → Lấy số → Trình ký (B19) ─────────────
export async function gdtDanhSachVuXetXu(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  const gdt = gdtTheoLoaiAn(page, b.loaiAn);
  /**
   * CHỦ TOẠ: KHÔNG tự chọn. Tài liệu B19 chốt "Chọn loại: Hội đồng toàn thể", và với loại đó
   * ModalTaoDSVuXetXu ép chủ toạ = người có chức vụ CHÁNH ÁN trong danh mục Thẩm phán TANDTC
   * (useEffect laHoiDongToanThe → setChuToaDaChon(chuToaChanhAn)); chọn người khác bị ghi lại ngay.
   * Chương trình làm việc HĐXX khoá người ký = chủ toạ (ô nguoiKyVanBan trong hộp Trình ký là
   * disabled), nên nó về hàng chờ duyệt của CHÁNH ÁN — trên STG là Nguyễn Văn Quảng (có tài khoản
   * `chanhAn`), không phải Nguyễn Hải Trâm như tài liệu B20 ghi.
   */
  const vuaTao = await gdt.taoDanhSachVuXetXu(
    b.soBanAn,
    gt('loaiHoiDong'),
    b.ngayBanAn,
    b.toaAn,
    input.nguyenDon.hoTen,
  );
  ghi('41 danh sách xét xử', vuaTao ? 'vừa tạo' : 'đã có từ trước');
  /**
   * : vụ đã trình Chương trình làm việc với chủ toạ do hệ thống phân ngẫu nhiên thì
   * THU HỒI, đổi chủ toạ sang tài khoản của bộ rồi trình lại — chỉ chạy khi gọi tay, vì thu hồi là
   * can thiệp vào văn bản đang chờ duyệt.
   */
  const khoaChuongTrinh = await gdt.laySoVaTrinhKyThamMuu(b.soBanAn, b.ngayBanAn, b.toaAn, {
    trinhLai: process.env.QLA_SUA_CTLV === '1',
  });
  /**
   * Không có khoá (id) KHÔNG có nghĩa là bỏ qua: tạo danh sách = TRÌNH KÝ luôn (toast "Đã trình ký danh
   * sách vụ xét xử"), dòng trên Danh sách tham mưu sang "Chờ duyệt" và chi tiết không còn nút Trình ký.
   */
  ghi(
    '41 chương trình làm việc',
    `khoá = ${khoaChuongTrinh || '(không có id — đã trình ký, xem trạng thái dòng ở Danh sách tham mưu)'}`,
  );
  /**
   * Khoá cho bước 42. Không có id (lượt chạy lại) thì ghi TRẠNG THÁI đọc trên Danh sách tham mưu —
   * "Đã duyệt" là bằng chứng bước 42 xong rồi, khỏi phải dò hàng chờ của Chánh án (hàng chờ không mang
   * số bản án hay tên đương sự nên không chốt được danh tính vụ — xem docs điểm 12).
   */
  const tt = gdt.trangThaiThamMuu;
  return {
    gdtMaVuXetXu: `${b.soBanAn} · ${gt('loaiHoiDong')}`,
    gdtKhoaChuongTrinh: String(khoaChuongTrinh || `trạng thái ${tt || 'không đọc được'} · ${b.soBanAn}`),
  };
}

// ───────────── BƯỚC 42 · Chánh án phê duyệt Chương trình làm việc (B20) ─────────────
/**
 * Trình lên CHÁNH ÁN, không phải Phó Chánh án: đo STG 28/09/2026 — vai Phó Chánh án có 95 đề xuất mà
 * KHÔNG có biểu mẫu CTLVHDXX nào, vai Chánh án có 22 bản ghi.
 */
export async function gdtPheDuyetChuongTrinh(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  khoaChuongTrinh: string,
) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  /**
   * Bước 41 ghi "trạng thái Đã duyệt · <số bản án>" khi chương trình đã được duyệt từ lượt trước →
   * KHÔNG duyệt lại (và cũng không dò hàng chờ: dòng ở đó không mang dấu hiệu vụ nào).
   */
  if (/trạng thái\s+Đã duyệt/i.test(khoaChuongTrinh)) {
    ghi('42 duyệt chương trình', `đã duyệt từ lượt trước — ${khoaChuongTrinh}`);
    return { gdtChuongTrinhDaDuyet: `${khoaChuongTrinh} · duyệt từ lượt trước` };
  }
  const theoId = /^[0-9a-f-]{8,}$/i.test(khoaChuongTrinh) ? khoaChuongTrinh : '';
  /**
   * Không thấy đề xuất thì NÓI RÕ tài khoản này đang thấy những gì: Chương trình làm việc HĐXX
   * (CTLVHDXX) trình lên CHÁNH ÁN theo đo 28/09/2026, nhưng người được trình do popup "Nhập thông tin
   * trình duyệt ký" mặc định chọn — lượt chạy khác có thể trình sang người khác, và khi bước 41 bỏ qua
   * trình ký ("đã trình ký từ trước") thì không còn id để tra.
   */
  // Người trình Chương trình làm việc là tài khoản chạy bước 41 (Vụ trưởng) → lọc theo tên đó
  const con = await moDeXuat(pd, theoId, /Chương trình làm việc/, dauHieu(b, input), taiKhoan('vuTruongDanSu').ten).catch(
    async (loi: Error) => {
    /**
     * Dò cả HAI tab và cả trang sau: `moChiTietDungVu` chỉ quét 10 dòng của trang đang mở, nên đề xuất
     * nằm trang 2 là không thấy. In kèm tìm theo SỐ chương trình / số thụ lý xét xử để biết văn bản có
     * ở hàng chờ của tài khoản này hay không.
     */
    const dumpTab = async (tenTab: RegExp) => {
      await pd.mo().catch(() => {});
      const tab = page.getByRole('tab', { name: tenTab }).first();
      if (await hienTrong(tab, 5_000)) {
        await tab.click().catch(() => {});
        await choHetSpin(page);
        await nghi(page, 1200, 1800);
      }
      const ds: string[] = [];
      for (let trang = 1; trang <= 3; trang++) {
        ds.push(
          ...(await page.locator('.ant-table-row:visible').allInnerTexts().catch(() => [])).map(s =>
            s.replace(/\s+/g, ' ').trim().slice(0, 110),
          ),
        );
        const sau = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
        if (!(await hienTrong(sau, 2_000))) break;
        await sau.click().catch(() => {});
        await choHetSpin(page);
        await nghi(page, 1000, 1500);
      }
      return ds;
    };
    const choDuyet = await dumpTab(/^Chờ duyệt/);
    const daDuyet = await dumpTab(/^Đã duyệt/);
    const tatCa = [...choDuyet, ...daDuyet];
    // Lọc theo DẤU HIỆU CỦA CHÍNH VỤ (số bản án + tên nguyên đơn), không hằng số của một lượt chạy
    const khopSo = tatCa.filter(d => dauHieu(b, input).some(h => d.includes(h)));
    ghi('42 dò đề xuất · Chờ duyệt', `${choDuyet.length} dòng: ${choDuyet.slice(0, 12).join(' || ') || '(trống)'}`);
    ghi('42 dò đề xuất · Đã duyệt', `${daDuyet.length} dòng: ${daDuyet.slice(0, 12).join(' || ') || '(trống)'}`);
    ghi(`42 dò đề xuất · khớp ${dauHieu(b, input).join('/')}`, khopSo.join(' || ') || '(không dòng nào)');
    throw new Error(
      `${loi.message}\n  Chờ duyệt: ${choDuyet.length} dòng · Đã duyệt: ${daDuyet.length} dòng · ` +
        `khớp ${dauHieu(b, input).join('/')}: ${khopSo.join(' || ') || 'KHÔNG CÓ'}`,
    );
    },
  );
  if (con) {
    await pd.ykienVaPheDuyet('Đồng ý chương trình làm việc của Hội đồng xét xử.');
    ghi('42 duyệt chương trình', 'đã phê duyệt');
  } else {
    ghi('42 duyệt chương trình', 'không còn đề xuất chờ duyệt → đã duyệt ở lượt trước');
  }
  return { gdtChuongTrinhDaDuyet: `${khoaChuongTrinh} · đã phê duyệt` };
}

// ───────────── BƯỚC 43 · Biểu mẫu Hội đồng xét xử → Trình ký (B21) ─────────────
export async function gdtBieuMauHoiDong(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  const dsBieuMau = (cauHinhLuong().nghiepVu.bieuMauHoiDong as unknown as string[]) || [];
  const dsId = await gdtTheoLoaiAn(page, b.loaiAn).themBieuMauHoiDong(b.soBanAn, {
    dsBieuMau,
    nguoiKy: gt('nguoiKyBieuMau'),
    ngayThongBao: new Date().toLocaleDateString('en-GB'),
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
    duongSu: input.nguyenDon.hoTen,
  });
  ghi('43 biểu mẫu hội đồng', `${dsBieuMau.join(' | ')} → khoá: ${dsId.join(', ') || '(đã trình từ lượt trước)'}`);
  return { gdtKhoaBieuMauHoiDong: dsId.join(',') || `đã trình · ${b.soBanAn}` };
}

// ───────────── BƯỚC 44 · Ký logic biểu mẫu Hội đồng xét xử (B22) ─────────────
export async function gdtKyBieuMauHoiDong(
  page: Page,
  dd: DinhDanhCase,
  ghi: GhiChu,
  input: DuLieuVao,
  khoaBieuMauHoiDong: string,
) {
  const b = banAnCase(dd, input);
  const pd = new PheDuyetPage(page);
  const dsKhoa = khoaBieuMauHoiDong.split(',').map(s => s.trim()).filter(s => /^[0-9a-f-]{8,}$/i.test(s));
  let daKy = 0;
  if (dsKhoa.length) {
    for (const khoa of dsKhoa) {
      if (!(await pd.moChiTietTheoId(khoa))) continue; // đã ký ở lượt trước
      await pd.ykienVaKyLogicVanBan('Đồng ý ban hành văn bản của Hội đồng xét xử.');
      daKy++;
    }
  } else {
    /**
     * Không có id (lượt trước không kịp lấy) → ký lần lượt theo TÊN biểu mẫu và CHỐT DANH TÍNH VỤ ở
     * từng đề xuất: mọi vụ đều có biểu mẫu trùng tên, lấy dòng đầu danh sách là ký của vụ khác.
     */
    for (const ten of (cauHinhLuong().nghiepVu.bieuMauHoiDong as unknown as string[]) || []) {
      if (!(await pd.moChiTietDungVu(ten, dauHieu(b, input), BAY_NGAY()))) continue;
      await pd.ykienVaKyLogicVanBan(`Đồng ý ban hành ${ten.toLowerCase()}.`);
      daKy++;
    }
  }
  ghi('44 ký biểu mẫu hội đồng', `đã ký ${daKy} văn bản`);
  return { gdtHoiDongDaKy: `${khoaBieuMauHoiDong} · đã ký ${daKy} văn bản` };
}

// ───────────── BƯỚC 45 · VERIFY: vụ hiện đúng ở màn Quản lý vụ xét xử (B23) ─────────────
/** Không tạo dữ liệu — chỉ kiểm chứng vụ đã đi hết luồng và mở được tab "Kết quả xét xử". */
export async function gdtKiemManQuanLyVuXetXu(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao) {
  const b = banAnCase(dd, input);
  const idVuXetXu = await gdtTheoLoaiAn(page, b.loaiAn).moKetQuaXetXu(b.soBanAn, b.ngayBanAn, {
    toaAn: b.toaAn,
    duongSu: input.nguyenDon.hoTen,
  });
  if (!idVuXetXu) throw new Error(`Không mở được vụ xét xử GĐT của bản án ${b.soBanAn} ở màn Quản lý vụ xét xử`);
  ghi('45 vụ xét xử', `id = ${idVuXetXu}`);
  return { gdtTrangThaiVuXetXu: `vụ xét xử ${idVuXetXu} · mở được tab Kết quả xét xử` };
}


/**
 * Khi hệ thống báo "Không tìm thấy bản án trong hệ thống": HỎI THẲNG API để biết điều kiện nào lệch,
 * thay vì đoán.
 *
 * `banAnRepository.findBySoBanAnAndNgayBanAnAndMaDonViAndGiaiDoan…` (`DonServiceImpl`) đòi khớp CẢ
 * BỐN: số bản án, ngày, mã đơn vị, giai đoạn. Lệch một cái là rỗng, mà màn chỉ nói một câu chung.
 * Gọi lại endpoint bằng chính phiên đang đăng nhập, bỏ bớt từng điều kiện để chỉ ra cái lệch.
 *
 * ⚠ `giaiDoan` là TÊN ENUM (`SO_THAM` / `PHUC_THAM` / `GIAM_DOC_THAM`), không phải số 1/2/3; và phải
 * có `quyetDinhBanAn=BAN_AN`. Gọi thiếu Bearer token thì API trả 401 (cookie không đủ).
 */
async function doTraCuuBanAn(page: Page, dd: DinhDanhCase, ghi: GhiChu, input: DuLieuVao): Promise<string> {
  const b = banAnCase(dd, input);
  /**
   * ĐỌC TÊN TÒA DẠNG CHUẨN NGAY TRÊN FORM, trước khi gọi API: ô "Tòa án ra bản án" đang hiện đúng tên
   * hệ thống lưu ("Tòa án nhân dân thành phố Hà Nội"), còn tên trong state là CHỮ HOA (lấy từ đầu bản
   * án) nên `GET /don-vi?tenDonVi=` trả rỗng. `layToken` điều hướng về dashboard nên form sẽ mất.
   */
  const tenToaTrenForm = await page
    .locator('#thongTinBanAn_maToaXetXu')
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
    .locator('.ant-select-selection-item')
    .first()
    .innerText()
    .then(x => x.trim())
    .catch(() => '');

  const token = await layToken(page).catch(() => '');
  if (!token) return 'không lấy được token để dò API tra cứu';
  const req = page.request;

  const idVuAnPT = moCase(dd, bangPhuThuoc(FLOW_001)).doc().duLieu.idVuAnPhucTham || '';
  const dvVuAn = await donViCuaVuAn(req, token, idVuAnPT);
  const maToa =
    (tenToaTrenForm ? await maToaTheoTen(req, token, tenToaTrenForm) : undefined) ||
    (await maToaTheoTen(req, token, b.toaAn)) ||
    dvVuAn.maDonVi;
  /** Bản ghi bản án THẬT của vụ phúc thẩm — ba khoá tra cứu phải khớp với CHÍNH nó */
  const banAnThat = await banAnCuaVuAn(req, token, idVuAnPT);
  const lay = (k: string) => (banAnThat[k] === undefined || banAnThat[k] === null ? '?' : String(banAnThat[k]));
  const ds: string[] = [
    `tên Tòa trên form: "${tenToaTrenForm || '(không đọc được)'}" | đơn vị vụ phúc thẩm: mã ${
      dvVuAn.maDonVi || '?'
    } — tên "${dvVuAn.tenDonVi || '?'}"`,
    `maDonVi dùng để tra = ${maToa || '(không tra được)'}`,
    `bản án của vụ ${idVuAnPT}: số "${lay('soBanAn')}", ngày "${lay('ngayBanAn')}", đơn vị "${lay('maDonVi')}" (${lay(
      'tenDonViRaBanAn',
    )}), giai đoạn "${lay('giaiDoan')}", trạng thái "${lay('trangThai')}"`,
    `khoá có trong bản ghi bản án: ${Object.keys(banAnThat).slice(0, 30).join(', ') || '(rỗng)'}`,
  ];

  for (const giaiDoan of ['PHUC_THAM', 'SO_THAM', 'GIAM_DOC_THAM', undefined]) {
    if (!maToa) break;
    const kq = await traCuuBanAnCu(req, token, {
      soBanAn: b.soBanAn,
      ngayBanAn: b.ngayBanAn,
      maDonVi: maToa,
      giaiDoan,
    });
    ds.push(
      `giaiDoan=${giaiDoan ?? '(không gửi)'} → ${
        kq
          ? `TÌM THẤY: vụ ${kq.maVuAn || kq.idVuAn}, số ${kq.soBanAn}, ngày ${kq.ngayBanAn}, đơn vị ${kq.maDonVi} (${kq.tenDonViRaBanAn}), giai đoạn ${kq.giaiDoan}`
          : 'không thấy'
      }`,
    );
  }
  for (const d of ds) ghi('24 dò tra cứu', d);
  return ds.join('\n  ');
}

/**
 * Mở vụ án GĐT ở màn "Quản lý vụ án" theo SỐ THỤ LÝ ĐƠN.
 *
 * ⚠ KHÔNG lọc theo số bản án ở màn này (như `GdtPage.moVuAn` làm cho luồng hình sự): vụ GĐ3 sinh từ
 * đơn KHÔNG có bản ghi `BAN_AN` của riêng nó — thông tin bản án nằm trên ĐƠN — nên ô "Số BA/QĐ" trả
 * về 0 dòng dù vụ vẫn ở đó. Đo 02/10/2026: cùng tài khoản Thẩm tra viên, mở màn không lọc thì thấy 5
 * vụ, lọc "Số BA/QĐ = 12" thì rỗng. Màn có sẵn ô "Số thụ lý" — đúng con số hiện ở cột "Số TL" của dòng.
 */
async function moVuAnTheoSoThuLy(page: Page, soThuLyDon: string, loaiAn: string, ghi: GhiChu): Promise<string> {
  await moMenu(page, ['Quản lý án GĐT/TT', 'Quản lý vụ án']);
  await choHetSpin(page);
  await nghi(page, 1000, 1500);

  /**
   * ⚠ Ô "Loại án" của màn này MẶC ĐỊNH THEO VỤ của người đăng nhập, không phải "tất cả":
   * `getMacDinhLoaiAnTheoDonVi` (QuanLyAn/DanhSach/shared/constants.ts) cho Vụ 2 → "Dân sự", Vụ 3 →
   * "Kinh doanh thương mại"… Vụ KDTM của luồng này nằm ở Vụ dân sự nên mặc định là "Dân sự" và vụ của
   * case bị lọc mất — màn trả về 0 dòng dù đã phân công đúng Thẩm tra viên (mất 3 lượt chạy
   * 02/10/2026 mới ra). Ô hiện trông như TRỐNG nên không nhìn ra.
   */
  const oLoaiAn = page.getByLabel(/^Loại án$/).or(page.locator('#loaiAn')).first();
  if (await hienTrong(oLoaiAn, 5_000)) {
    const daDat = await chonSelect(page, oLoaiAn, loaiAn)
      .then(() => true)
      .catch(() => false);
    ghi('34 vụ án GĐT', `ô "Loại án" đặt thành "${loaiAn}": ${daDat ? 'được' : 'KHÔNG được'}`);
  }

  // Ô "Số thụ lý" nằm trong khối "Tìm kiếm nâng cao" → mở khối nếu đang thu gọn
  const oSoThuLy = page.getByLabel('Số thụ lý', { exact: true }).or(page.getByPlaceholder(/số thụ lý/i)).first();
  if (!(await hienTrong(oSoThuLy, 4_000))) {
    const nutNangCao = page.getByRole('button', { name: /Tìm kiếm nâng cao|Nâng cao/i }).first();
    if (await hienTrong(nutNangCao, 4_000)) {
      await nutNangCao.click({ force: true }).catch(() => {});
      await choHetSpin(page);
    }
  }
  await expect(oSoThuLy, 'Màn "Quản lý vụ án" không có ô lọc "Số thụ lý"').toBeVisible({ timeout: 20_000 });

  const timKiem = async () => {
    await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    return page.locator('.ant-table-row:visible').filter({ hasText: soThuLyDon }).first();
  };

  await oSoThuLy.fill(soThuLyDon);
  let dong = await timKiem();
  if (!(await hienTrong(dong, 15_000))) {
    /**
     * Ô "Số thụ lý" của màn này có thể nối sang số thụ lý VỤ ÁN (khác số thụ lý ĐƠN). Thử lại bằng tên
     * NGUYÊN ĐƠN — màn có sẵn ô đó và tên đương sự là của chính case nên không trúng vụ khác.
     */
    await oSoThuLy.fill('');
    const oNguyenDon = page.getByLabel('Nguyên đơn/Người khiếu nại', { exact: true }).first();
    if (await hienTrong(oNguyenDon, 4_000)) {
      await oNguyenDon.fill(input.nguyenDon.hoTen);
      ghi('34 vụ án GĐT', `lọc số thụ lý không ra → lọc theo nguyên đơn "${input.nguyenDon.hoTen}"`);
      dong = await timKiem();
    }
  }
  if (!(await hienTrong(dong, 15_000))) {
    const tatCa = page.locator('.ant-table-row:visible');
    const soDong = await tatCa.count();
    const dangHien = (await tatCa.allInnerTexts().catch(() => []))
      .slice(0, 15)
      .map(t => t.replace(/\s+/g, ' ').trim().slice(0, 150));
    throw new Error(
      `Không thấy vụ án của đơn (số thụ lý ${soThuLyDon}, nguyên đơn ${input.nguyenDon.hoTen}) ở màn "Quản lý vụ án" ` +
        'với tài khoản đang đăng nhập.\n' +
        '  Màn này chỉ hiện vụ tài khoản được phân công (Thẩm tra viên) — kiểm bước 33 đã phân công đúng vụ chưa.\n' +
        `  Màn đang có ${soDong} dòng: ${dangHien.join(' || ') || '(danh sách trống)'}`,
    );
  }
  ghi('34 vụ án GĐT', (await dong.innerText()).replace(/\s+/g, ' ').trim().slice(0, 200));

  await dong.locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first().click();
  await page.waitForURL(/quan-ly-an\/chi-tiet\?id=/, { timeout: 60_000 });
  await choHetSpin(page);
  return new URL(page.url()).searchParams.get('id') || '';
}

/**
 * Tìm dòng của ĐƠN theo số thụ lý trên màn "Phân công thẩm tra viên" (dùng để kiểm chứng sau khi phân
 * công). Sau khi lưu, đơn có thể chuyển sang tab "Đã phân công TTV" nên thử lần lượt các tab.
 */
async function timDongDonTheoSoThuLy(page: Page, soThuLyDon: string, ghi: GhiChu): Promise<string> {
  const docDong = async () => {
    const oTL = page.getByLabel(/^Số thụ lý$/).first();
    if (await hienTrong(oTL, 4_000)) {
      await oTL.fill(soThuLyDon);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await nghi(page, 1000, 1600);
    }
    const dong = page.locator('.ant-table-row:visible').filter({ hasText: soThuLyDon }).first();
    if (!(await hienTrong(dong, 8_000))) return '';
    return (await dong.innerText()).replace(/\s+/g, ' ').trim();
  };

  const ngay = await docDong();
  if (ngay) return ngay;

  const dsTab = page.getByRole('tab', { name: /Đã phân công/i });
  for (let i = 0; i < (await dsTab.count()); i++) {
    await dsTab.nth(i).click().catch(() => {});
    await choHetSpin(page);
    await nghi(page, 800, 1200);
    const chu = await docDong();
    if (chu) {
      ghi('33 phân công TTV', `thấy dòng ở tab "${(await dsTab.nth(i).innerText()).replace(/\s+/g, ' ').trim()}"`);
      return chu;
    }
  }
  return '';
}

/**
 * Gọi `taoDuThaoKetQuaGiaiQuyet`, và khi hỏng vì KHÔNG THẤY NÚT "Tạo văn bản" thì nói rõ vì sao.
 *
 * Tab "Tờ trình" của màn chi tiết vụ án BỊ KHOÁ khi vụ chưa có cả Thẩm tra viên lẫn Lãnh đạo vụ trong
 * `vuAn.danhSachPhanCong` (`ChiTietVuAnGDT/index.tsx:262-286`: `daPhanCong = hasTtv && hasLanhDaoVu`,
 * không thì `disabledTabs.push('to-trinh')`). Bấm vào tab bị khoá thì màn vẫn ở "Thông tin vụ án" và
 * nút "Tạo văn bản" không bao giờ hiện — nhìn ra ngoài chỉ thấy "click timeout 30s".
 */
async function gdtDuThaoVoiChanDoan(
  gdt: GdtPage,
  page: Page,
  idVuAn: string,
  ghi: GhiChu,
  d: { ketQua: string; nguoiKy: string; thamQuyenXetXu: string; noiDungVuAn: string; xetThay: string },
): Promise<string | undefined> {
  try {
    return await gdt.taoDuThaoKetQuaGiaiQuyet(idVuAn, d);
  } catch (loi) {
    const mo = loi instanceof Error ? loi.message : String(loi);
    if (!/Tạo văn bản/.test(mo)) throw loi;

    /**
     * Đọc đúng hai thứ cần để kết luận: tab "Tờ trình" có bị khoá không, và tab "Phân công" của VỤ
     * đang có gì. Đi bằng URL `?tab=` — bấm thẻ tab ở màn này KHÔNG đổi tab (đo 02/10/2026).
     */
    const tabToTrinh = page.locator('[role="tab"]').filter({ hasText: /^\s*Tờ trình\s*$/ }).first();
    const khoa =
      (await tabToTrinh.getAttribute('aria-disabled').catch(() => null)) === 'true' ||
      /ant-tabs-tab-disabled/.test((await tabToTrinh.getAttribute('class').catch(() => '')) || '');
    await page
      .goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=phan-cong`, { waitUntil: 'domcontentloaded' })
      .catch(() => null);
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    const dsPhanCong = (await page.locator('main .ant-table-row:visible').allInnerTexts().catch(() => []))
      .slice(0, 5)
      .map(s => s.replace(/\s+/g, ' ').trim().slice(0, 120));
    ghi('34 chẩn đoán', `tab Tờ trình ${khoa ? 'BỊ KHOÁ' : 'mở được'}; tab Phân công của vụ: ${dsPhanCong.join(' / ') || '(rỗng)'}`);
    throw new Error(
      `${mo}\n` +
        `  Tab "Tờ trình" của vụ ${idVuAn} ${khoa ? 'ĐANG BỊ KHOÁ' : 'không bị khoá'} → không có nút "Tạo văn bản".\n` +
        '  FE khoá tab này khi `vuAn.danhSachPhanCong` CHƯA CÓ ĐỦ Thẩm tra viên + Lãnh đạo vụ ' +
        '(`qla-webapp/.../QuanLyAn/ChiTietVuAnGDT/index.tsx:262-286`).\n' +
        `  Tab "Phân công" của vụ đang có: ${dsPhanCong.join(' / ') || '(rỗng)'}\n` +
        '  → Phân công TTV theo ĐƠN (bước 33, đã kiểm trên dòng đơn) KHÔNG ghi vào danh sách phân công ' +
        'của VỤ. Cần đội phát triển xác nhận hành động nào điền danhSachPhanCong cho vụ GĐT.',
    );
  }
}

/**
 * HOÀN THIỆN "Thông tin vụ án" của vụ GĐT — việc phải làm trước khi mọi tab khác mở ra.
 *
 * Nghiệp vụ (người dùng chốt 02/10/2026): các tab của chi tiết vụ án GĐT bị khoá khi **tab "Thông tin
 * vụ án" chưa đầy đủ**. Thông tin đó đến từ một trong hai đường:
 *   1. nhập trực tiếp ở màn "Quản lý án" (chính hàm này làm);
 *   2. đã có sẵn khi tạo hồ sơ vụ án từ bước tạo đơn — đường hay gặp hơn.
 * Vụ của luồng này đi đường 2 mà vẫn thiếu, nên phải mở ra lưu lại một lượt; thiếu ô nào thì chính
 * form liệt kê ra.
 *
 * Đi bằng URL `?tab=` — bấm thẻ tab ở màn này không đổi tab (đo 02/10/2026).
 */
async function hoanThienThongTinVuAn(
  page: Page,
  idVuAn: string,
  ghi: GhiChu,
  quanHeThongKe?: string,
  quanHeChiTiet?: string,
) {
  await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${idVuAn}&tab=thong-tin-vu-an`, {
    waitUntil: 'domcontentloaded',
  });
  await choHetSpin(page);
  await nghi(page, 1500, 2200);

  const nutSua = page.getByRole('button', { name: /Sửa thông tin$/ }).first();
  if (!(await hienTrong(nutSua, 10_000))) {
    ghi(
      '33 thông tin vụ án',
      'không thấy nút "Sửa thông tin" — nút đang có: ' +
        ([
          ...new Set(
            (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
              .map(s => s.replace(/\s+/g, ' ').trim())
              .filter(Boolean),
          ),
        ]
          .slice(0, 12)
          .join(' | ') || '(không có)'),
    );
    return;
  }
  await nutSua.click();
  await choHetSpin(page);
  await nghi(page, 1200, 1800);

  // Thời hiệu là radio bắt buộc ở vụ GĐT (3 năm theo Điều 334 BLTTDS); không có thì bỏ qua
  const radioThoiHieu = page.getByRole('radio', { name: /3 năm/ }).first();
  if (await hienTrong(radioThoiHieu, 3_000)) {
    await radioThoiHieu.check({ force: true }).catch(() => {});
    ghi('33 thông tin vụ án', 'đã chọn Thời hiệu 3 năm');
  }

  /**
   * Ô BẮT BUỘC DUY NHẤT còn thiếu khi vụ GĐT sinh từ đơn: "Quan hệ pháp luật thống kê" (đo
   * 02/10/2026 — lưu lần đầu báo đúng một lỗi "Vui lòng chọn Quan hệ pháp luật thống kê"). Đây là
   * danh mục THỐNG KÊ, chữ khác ô "Quan hệ pháp luật" của đơn, nên thử lần lượt hai cách viết rồi mới
   * chịu; không tự lấy mục đầu danh mục vì nó quyết định vụ được đếm vào ô nào của báo cáo.
   */
  const oQhplTk = page
    .locator('main .ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: /Quan hệ pháp luật thống kê/i }) })
    .first();
  if (await hienTrong(oQhplTk, 4_000)) {
    const daChon = await chonTrongCayDanhMuc(
      page,
      oQhplTk,
      [quanHeThongKe, quanHeChiTiet].filter(Boolean) as string[],
      'Quan hệ pháp luật thống kê',
    );
    ghi('33 thông tin vụ án', `quan hệ pháp luật thống kê = ${daChon}`);
    await choHetSpin(page);
  }

  const nutLuu = page.getByRole('button', { name: /^(save )?Lưu$/ }).last();
  if (!(await hienTrong(nutLuu, 8_000))) {
    ghi('33 thông tin vụ án', 'mở được form sửa nhưng không thấy nút "Lưu"');
    return;
  }
  await nutLuu.click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  const loi = [
    ...new Set(
      (await page.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
  const toast = await toastGanDay(page, 30_000).catch(() => [] as string[]);
  ghi('33 thông tin vụ án', `toast: ${toast.join(' | ').slice(0, 200) || '(không có)'}`);
  if (loi.length) {
    throw new Error(
      `Tab "Thông tin vụ án" của vụ ${idVuAn} CHƯA ĐẦY ĐỦ — các tab khác sẽ còn bị khoá.\n` +
        `  Form đang báo thiếu: ${loi.join(' | ')}`,
    );
  }
}

/**
 * Chọn một mục trong ô danh mục dạng CÂY (antd TreeSelect) — vd. "Quan hệ pháp luật thống kê".
 *
 * ⚠ Khác Select thường: nút của cây là `.ant-select-tree-node-content-wrapper`, KHÔNG phải
 * `.ant-select-item-option`, nên mọi helper chọn Select đều báo "không có mục khớp" dù danh mục có
 * (đo 02/10/2026). Cây lại ẢO HOÁ nên phải GÕ ĐỂ LỌC trước khi đọc.
 *
 * Thử lần lượt từng chuỗi lọc; không khớp cái nào thì NÉM LỖI kèm nhãn các nút đang hiện — không tự
 * lấy mục đầu, vì ô này quyết định vụ được đếm vào ô nào của báo cáo thống kê.
 */
async function chonTrongCayDanhMuc(
  page: Page,
  oForm: Locator,
  dsLoc: string[],
  ten: string,
): Promise<string> {
  // Đã đúng thì KHÔNG mở lại: chạy lại bước sẽ chọn trượt sang mục khác
  const dangCo = (await oForm.locator('.ant-select-selection-item').first().innerText().catch(() => ''))
    .replace(/\s+/g, ' ')
    .trim();
  if (dangCo && dsLoc.some(c => dangCo.toLowerCase().includes(c.toLowerCase()))) return dangCo;

  /**
   * BẤM VÀO KHUNG `.ant-select-selector`, không bấm ô tìm kiếm: khi ô ĐÃ CÓ giá trị, antd ẩn
   * `input.ant-select-selection-search-input` nên `click()` chờ hết 30 s (đo 02/10/2026 ở lượt chạy
   * lại bước 33).
   */
  const khung = oForm.locator('.ant-select-selector').first();
  await expect(khung, `Không thấy ô "${ten}"`).toBeVisible({ timeout: 15_000 });
  await khung.scrollIntoViewIfNeeded().catch(() => {});
  await khung.click({ force: true });
  const o = oForm.locator('input.ant-select-selection-search-input').first();
  const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await expect(dd, `Bấm ô "${ten}" nhưng danh mục không mở`).toBeVisible({ timeout: 15_000 });
  const nut = dd.locator('.ant-select-tree-node-content-wrapper, .ant-select-item-option');

  for (const chu of dsLoc) {
    await o.fill(chu).catch(() => {});
    await nghi(page, 700, 1100);
    const khop = nut.filter({ hasText: new RegExp(thoatRegex(chu), 'i') }).first();
    if (!(await hienTrong(khop, 4_000))) continue;
    const nhan = (await khop.innerText()).replace(/\s+/g, ' ').trim();
    await khop.click();
    await nghi(page, 500, 800);
    // Đọc lại nhãn đang hiện trên ô — chọn mà ô vẫn trống thì coi như chưa chọn
    const dangChon = (await oForm.locator('.ant-select-selection-item').first().innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    // CHỈ nhận khi ô ĐÃ HIỆN nhãn: bấm vào nút nhóm (không phải lá) thì ô vẫn trống → thử chuỗi lọc sau
    if (dangChon) return dangChon;
    console.log(`    · ${ten}: bấm "${nhan}" mà ô vẫn trống → thử chuỗi lọc khác`);
  }

  // XOÁ Ô LỌC trước khi liệt kê: lọc trượt thì cây còn 0 nút, in ra chẳng nói được gì
  await o.fill('').catch(() => {});
  await nghi(page, 800, 1200);
  const ds = (await nut.allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 40);
  await page.keyboard.press('Escape').catch(() => {});
  throw new Error(
    `Không chọn được "${ten}" với các chuỗi lọc: ${dsLoc.join(' / ')}.\n` +
      `  Nút cây đang hiện (${ds.length}): ${ds.join(' | ') || '(không đọc được nhãn nào)'}`,
  );
}

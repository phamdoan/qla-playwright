/**
 * Sổ cái của các luồng "Luồng nhập data.txt": ghi lại bản án nào đã tạo đơn và đã đi tới bước nào,
 * để chạy lại thì BỎ QUA bản án đã chạy thay vì tạo đơn trùng.
 *
 * Khoá = Số bản án | Ngày bản án | Tòa ra quyết định bản án (đúng 3 ô nhập trên màn hình).
 * Mỗi bộ dữ liệu có sổ cái riêng: seed-output/<tên bộ>.<env>.ledger.json
 */
import fs from 'fs';
import path from 'path';

export type BuocLuong =
  | 'nhapDon' | 'phanCong' | 'toTrinh' | 'kyToTrinh' | 'duyetToTrinh' | 'thongBao' | 'kyThongBao'
  // nhánh Vụ GĐKT (Bước 10+)
  | 'giaoTieuHoSo' | 'phanCongTTV' | 'duThaoKetQua'
  // Bước 12b–18: trình/duyệt kháng nghị, hồ sơ kháng nghị, danh sách xét xử, biểu mẫu HĐXX
  | 'trinhDuThao' | 'duyetDuThao' | 'kyDuThao' | 'hoSoKhangNghi'
  // Bước 14b–14c (tài liệu chưa ghi): phân công Thẩm phán TANDTC cho vụ xét xử → Phó Chánh án duyệt
  | 'phanCongTPTC' | 'duyetPhanCongTPTC'
  | 'danhSachXetXu' | 'duyetChuongTrinh' | 'bieuMauHoiDong' | 'kyBieuMauHoiDong';

/**
 * Bước bắt buộc phải xong TRƯỚC mỗi bước (quy tắc "STEP N+1 chỉ chạy khi STEP N đã PASS").
 * Chỉ khai những cặp có quan hệ nghiệp vụ chắc chắn: lập rồi mới ký, trình rồi mới duyệt.
 */
const PHU_THUOC: Partial<Record<string, string>> = {
  kyToTrinh: 'toTrinh',
  duyetToTrinh: 'kyToTrinh',
  kyThongBao: 'thongBao',
  duyetDuThao: 'trinhDuThao',
  kyDuThao: 'duyetDuThao',
  duyetPhanCongTPTC: 'phanCongTPTC',
  duyetChuongTrinh: 'danhSachXetXu',
  kyBieuMauHoiDong: 'bieuMauHoiDong',
};

/** 3 ô nhập nhận dạng một bản án */
export interface KhoaBanAn {
  soBanAn: string;
  ngayBanAn: string;
  toaAn: string;
}

export interface DongSoCaiTKM extends KhoaBanAn {
  maDon?: string;
  soThuLy?: string;
  idDon?: string;
  khoaToTrinh?: string;
  khoaThongBao?: string;
  /** Id yêu cầu phê duyệt của dự thảo Quyết định kháng nghị (Bước 12b → 13) */
  khoaDuThao?: string;
  /** Id văn bản "Tờ trình phân công thẩm phán tối cao" (MS_02_TC) (Bước 14b → 14c) */
  khoaToTrinhTPTC?: string;
  /** Id văn bản "Chương trình làm việc HĐXX" (CTLVHDXX) đã trình ký ở Danh sách tham mưu (B19 → B20) */
  khoaChuongTrinh?: string;
  /** Id văn bản QĐ thành lập HĐXX / TB VKS đã trình ký (Bước 17 → 18) */
  khoaBieuMauHoiDong?: string[];
  /** Các bước đã hoàn thành (bước có trong đây thì lần chạy sau bỏ qua) */
  daXong: BuocLuong[];
  luc: string;
}

export const khoaBanAn = (b: KhoaBanAn) => `${b.soBanAn}|${b.ngayBanAn}|${b.toaAn}`;

/**
 * Sổ cái của một bộ dữ liệu; mỗi bộ một file để không lẫn dữ liệu giữa các đợt chạy.
 *
 * Chạy song song: ghi sổ là đọc-sửa-ghi cả file nên hai tiến trình ghi cùng lúc sẽ đè mất kết quả
 * của nhau. Đặt QLA_SO_CAI_HAU_TO=<a|b|c…> cho mỗi tiến trình để mỗi bên một file riêng
 * (…ledger.a.json), chạy xong gộp lại bằng `node tools/gop-so-cai.js <tên bộ>`.
 * Khi ĐỌC thì gộp tất cả các file hậu tố lại, nên tiến trình nào cũng thấy việc đã làm của đợt trước.
 */
export function soCai(tenBo: string) {
  const goc = () => path.resolve(__dirname, `../seed-output/${tenBo}.${process.env.QLA_ENV || 'stg'}.ledger`);
  const hauTo = (process.env.QLA_SO_CAI_HAU_TO || '').trim();
  const duongDan = () => `${goc()}${hauTo ? `.${hauTo}` : ''}.json`;

  /**
   * Mọi file sổ cái của bộ này: file gốc + các file hậu tố của những tiến trình chạy song song,
   * TRONG MỌI THƯ MỤC CHẠY (`toa-an`, `toa-an-chay-rieng-a|b|c…`).
   *
   * Vì sao phải quét cả thư mục khác: mỗi bản sao có seed-output riêng, nên lượt chạy ở thư mục B
   * không thấy việc thư mục A đã làm → B1–B2 tưởng "chưa có đơn" và TẠO ĐƠN MỚI. Đợt KDTM
   * 28/09/2026 vì thế sinh 3–4 đơn cho mỗi bản án (01:24 → 20:03 → 22:46), tất cả trừ đơn đầu đều
   * là đơn phụ (IS_DON_CHINH=0) nên không màn nào của luồng hiện ra. Chỉ ĐỌC gộp; vẫn GHI vào file
   * riêng của tiến trình như cũ.
   */
  const dsFile = (): string[] => {
    const dau = path.basename(goc());
    const thuMucGoc = path.dirname(goc());
    const thuMuc = [thuMucGoc];
    // …/<bản sao>/e2e/seed-output → lên 2 cấp là thư mục chứa mọi bản sao
    const cha = path.resolve(thuMucGoc, '..', '..', '..');
    try {
      for (const t of fs.readdirSync(cha).filter(t => /^toa-an(-chay-rieng-.+)?$/.test(t))) {
        const tm = path.join(cha, t, 'e2e', 'seed-output');
        if (tm !== thuMucGoc && fs.existsSync(tm)) thuMuc.push(tm);
      }
    } catch {
      /* không đọc được thư mục cha thì chỉ dùng seed-output của chính mình */
    }
    const ra: string[] = [];
    for (const tm of thuMuc) {
      for (const t of fs.readdirSync(tm).filter(t => t.startsWith(`${dau}.`) && t.endsWith('.json'))) {
        ra.push(path.join(tm, t));
      }
    }
    // File của chính thư mục này đọc SAU cùng để thắng khi trùng khoá
    return ra.sort(a => (path.dirname(a) === thuMucGoc ? 1 : -1));
  };

  const docMot = (f: string): Record<string, DongSoCaiTKM> => {
    if (!fs.existsSync(f)) return {};
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      return {};
    }
  };

  const doc = (): Record<string, DongSoCaiTKM> => Object.assign({}, ...dsFile().map(docMot));

  const docDong = (b: KhoaBanAn): DongSoCaiTKM | undefined => doc()[khoaBanAn(b)];

  /**
   * Bản án này đã hoàn thành bước đó chưa.
   *
   * Kèm CHẶN PASS GIẢ: sổ cái ghi xong một bước mà bước bắt buộc trước nó KHÔNG có trong sổ cái thì
   * đánh dấu đó không đáng tin → báo lỗi ngay thay vì bỏ qua.
   *
   * Đo thật trên STG 30/09/2026 (K09, K10): B15 thụ lý HỎNG, nhưng B16–B20 vẫn "bỏ qua" trong 2 giây
   * vì sổ cái đã ghi xong; B21 tạo Hội đồng xét xử HỎNG mà B22 ký biểu mẫu vẫn "bỏ qua" vì sổ cái có
   * `kyBieuMauHoiDong` trong khi KHÔNG có `bieuMauHoiDong`. DB xác nhận hai vụ VA26-004805/004806
   * chưa thụ lý (SO_THULY null) và không có TPCT/TPTVHDXX — tức sổ cái ghi 20/23 bước xong cho vụ
   * thực tế đang kẹt. Báo cáo vì thế nói dối về tiến độ.
   */
  const daXongBuoc = (b: KhoaBanAn, buoc: BuocLuong) => {
    const daXong = docDong(b)?.daXong || [];
    if (!daXong.includes(buoc)) return false;
    const truoc = PHU_THUOC[buoc];
    if (truoc && !daXong.includes(truoc)) {
      throw new Error(
        `Sổ cái mâu thuẫn: bản án ${b.soBanAn} – ${b.ngayBanAn} ghi đã xong "${buoc}" nhưng bước bắt ` +
          `buộc trước đó "${truoc}" KHÔNG có trong sổ cái → đánh dấu này không đáng tin, không được bỏ qua. ` +
          `Kiểm tra trên hệ thống rồi chạy lại "${truoc}"; muốn chạy lại bước này thì xoá đánh dấu bằng ` +
          `tools/mo-lai-buoc.js.`,
      );
    }
    return true;
  };

  /** Ghi/cập nhật một bản án trong sổ cái (gộp với dữ liệu đã có) */
  const ghiSoCai = (b: KhoaBanAn, them: Partial<Omit<DongSoCaiTKM, 'daXong'>> & { xongBuoc?: BuocLuong }): DongSoCaiTKM => {
    const f = duongDan();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    // GHI chỉ dựa trên file của chính tiến trình này (đọc-sửa-ghi trong phạm vi file riêng), còn
    // trạng thái "đã làm" thì tra trên bản gộp — nếu ghi cả bản gộp, file của mỗi tiến trình sẽ
    // chứa dữ liệu của tiến trình khác và lúc gộp lại có thể làm sống lại bản ghi cũ.
    const tatCa = docMot(f);
    const khoa = khoaBanAn(b);
    const cu: DongSoCaiTKM = doc()[khoa] || {
      soBanAn: b.soBanAn,
      ngayBanAn: b.ngayBanAn,
      toaAn: b.toaAn,
      daXong: [],
      luc: new Date().toISOString(),
    };
    const { xongBuoc, ...duLieu } = them;
    const moi: DongSoCaiTKM = {
      ...cu,
      ...duLieu,
      daXong: xongBuoc && !cu.daXong.includes(xongBuoc) ? [...cu.daXong, xongBuoc] : cu.daXong,
      luc: new Date().toISOString(),
    };
    tatCa[khoa] = moi;
    fs.writeFileSync(f, JSON.stringify(tatCa, null, 2));
    return moi;
  };

  return { duongDan, doc, docDong, daXongBuoc, ghiSoCai };
}

/** Sổ cái của bộ 24 bản án trong data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx */
const macDinh = soCai('luong-tkm');
export const docSoCai = macDinh.doc;
export const docDong = macDinh.docDong;
export const daXongBuoc = macDinh.daXongBuoc;
export const ghiSoCai = macDinh.ghiSoCai;

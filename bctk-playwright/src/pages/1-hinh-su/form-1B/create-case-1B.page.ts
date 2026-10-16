import { Browser, test } from '@playwright/test';
import path from 'path';
import { PhienDangNhap } from '../../common/login.page';
import { PheDuyetDeXuatPage } from '../../common/phe-duyet.page';
import { Luong, VuAnSoThamPage } from './vu-an-so-tham.page';
import { VuAnPhucThamPage } from './vu-an-phuc-tham.page';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync, docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TaiKhoan, chuanHoa, taiKhoanCuaToa, taiKhoanTheoTen } from '../../../utils/tai-khoan';

/** Cấu hình luồng 1B (src/data/1-hinh-su/form-1B.xlsx) */
export interface CauHinh1B {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** File vụ án nguồn trong src/data/1-hinh-su (cột: Mã vụ án | Tòa án | Luồng) */
  fileVuAn: string;
  /** File lưu các vụ đã chạy (vụ chạy xong được chuyển từ fileVuAn sang đây) */
  fileVuAnDaChay: string;
  /** Luồng mặc định khi file vụ án không ghi cột "Luồng" */
  luong: Luong;
  /** Tệp đính kèm (đường dẫn tính từ gốc project) */
  fileDinhKem: string;
  donViKhangNghi: string;
  diaDiemXetXuChiTiet: string;
  /** Tài khoản người ký chưa có trong Taikhoan.xlsx */
  taiKhoanBoSung: TaiKhoan[];
}

/** Một dòng của data-1B.xlsx */
export interface VuAnNguon {
  maVuAn: string;
  toaAn: string;
  luong?: Luong;
}

export interface KetQua1B {
  luong: Luong;
  maVuAnSoTham: string;
  tenVuAn: string;
  toaPhucTham: string;
  maVuAnPhucTham: string;
  soThuLy: string;
  ngayThuLy: string;
  chuToa: string;
  ngayXetXu: string;
}

const ROOT = path.resolve(__dirname, '../../../..');

/**
 * Đọc src/data/1-hinh-su/form-1B.xlsx:
 *   · sheet "Cấu hình": Khóa | Giá trị | Ghi chú
 *   · sheet "Tài khoản bổ sung": Tòa án | Tài khoản | Tên (người ký chưa có trong Taikhoan.xlsx)
 */
export function docCauHinh1B(): CauHinh1B {
  const file = path.join(DATA_DIR, '1-hinh-su', 'form-1B.xlsx');
  const ch = docKhoaGiaTriSync(file, 'Cấu hình');
  const bat = (khoa: string) => {
    if (!ch[khoa]) throw new Error(`${file}: sheet "Cấu hình" thiếu giá trị "${khoa}"`);
    return ch[khoa];
  };
  return {
    linhVuc: bat('Lĩnh vực') as LinhVuc,
    bieuMau: bat('Biểu mẫu'),
    tenBieuMau: bat('Tên biểu mẫu'),
    fileVuAn: bat('File vụ án'),
    fileVuAnDaChay: ch['File vụ án đã chạy'] || bat('File vụ án').replace(/\.xlsx$/i, '-old.xlsx'),
    luong: /nghị|nghi/i.test(bat('Luồng mặc định')) ? 'khang-nghi' : 'khang-cao',
    fileDinhKem: bat('File đính kèm'),
    donViKhangNghi: bat('Đơn vị kháng nghị'),
    diaDiemXetXuChiTiet: bat('Địa điểm xét xử (chi tiết)'),
    taiKhoanBoSung: docBangExcelSync(file, 'Tài khoản bổ sung')
      .filter(d => d['Tài khoản'])
      .map(d => ({ toaAn: d['Tòa án'], taiKhoan: d['Tài khoản'], ten: d['Tên'] || undefined })),
  };
}

/**
 * Luồng tạo vụ án phúc thẩm hình sự cho biểu mẫu 1B, theo file hướng dẫn
 * src/step/1B/HS phúc thẩm tòa PT tối cao (1).docx.
 *
 * Mỗi tài khoản chạy trong một browser context riêng (tương đương "mở profile trình duyệt mới"):
 *   Tòa sơ thẩm   — kháng cáo/kháng nghị, duyệt, thông báo, chuyển hồ sơ
 *   Tòa phúc thẩm — tiếp nhận, thụ lý, phân công, quyết định đưa vụ án ra xét xử, tạo bản án
 *   Người ký      — ký logic ở "Phê duyệt đề xuất" (người ký phân công; chủ tọa ký quyết định xét xử)
 */
export class TaoVuAnPhucTham1B {
  constructor(
    private readonly browser: Browser,
    private readonly cauHinh: CauHinh1B,
    private readonly dsTaiKhoan: TaiKhoan[],
  ) {}

  async chay(vuAn: VuAnNguon): Promise<KetQua1B> {
    const luong = vuAn.luong ?? this.cauHinh.luong;
    const fileDinhKem = path.resolve(ROOT, this.cauHinh.fileDinhKem);
    const cacPhien: PhienDangNhap[] = [];
    const moPhien = async (tk: TaiKhoan) => {
      const p = await PhienDangNhap.mo(this.browser, tk.taiKhoan);
      cacPhien.push(p);
      return p;
    };

    try {
      // ── Bước 1–3.2: Tòa sơ thẩm ──
      const tkSoTham = taiKhoanCuaToa(this.dsTaiKhoan, vuAn.toaAn);
      // Mỗi bước tự bỏ qua nếu lượt chạy trước đã làm → chạy lại được vụ đang dở
      const { tenVuAn, maDinhDanh, toaPhucTham } = await test.step(`Tòa sơ thẩm (${tkSoTham.taiKhoan}): ${luong}, duyệt, thông báo, chuyển hồ sơ`, async () => {
        const st = new VuAnSoThamPage((await moPhien(tkSoTham)).page);
        const tt = await st.moVuAn(vuAn.maVuAn);
        if (!tt.daChuyenPhucTham) {
          if (!(await st.daCoDon(luong))) {
            if (luong === 'khang-cao') await st.themKhangCao(fileDinhKem);
            else await st.themKhangNghi(fileDinhKem, this.cauHinh.donViKhangNghi);
          }
          if (await st.conChoDuyet(luong)) await st.duyet(luong);
          if (!(await st.daCoThongBao(luong))) await st.lapThongBao(luong);
        }
        return { ...tt, toaPhucTham: await st.chuyenHoSo(vuAn.maVuAn) };
      });

      // ── Bước 4: Tòa phúc thẩm tiếp nhận + thụ lý ──
      const tkPhucTham = taiKhoanCuaToa(this.dsTaiKhoan, toaPhucTham);
      const phienPT = await moPhien(tkPhucTham);
      const pt = new VuAnPhucThamPage(phienPT.page);
      const { urlVuAn, thuLy } = await test.step(`Tòa phúc thẩm (${tkPhucTham.taiKhoan}): tiếp nhận hồ sơ, thụ lý`, async () => {
        const url = await pt.tiepNhanHoSo(tenVuAn, maDinhDanh, fileDinhKem);
        return { urlVuAn: url, thuLy: await pt.thuLy() };
      });

      // ── Bước 5.1–5.2: phân công thẩm phán → người ký phân công ký logic ──
      const nguoiCoTaiKhoan = this.dsTaiKhoan
        .filter(t => t.ten && chuanHoa(t.toaAn) === chuanHoa(toaPhucTham))
        .map(t => t.ten!);
      const phanCong = await test.step('Phân công thẩm phán chủ tọa, trình ký', () => pt.phanCongThamPhan(nguoiCoTaiKhoan));
      await this.kyLogic(phanCong.nguoiKy, tenVuAn, 'Phân công Thẩm phán', moPhien);

      // ── Bước 5.3–5.4: quyết định đưa vụ án ra xét xử → chủ tọa ký logic ──
      const quyetDinh = await test.step('Quyết định đưa vụ án ra xét xử, chọn lịch, trình ký', async () => {
        await phienPT.vao(urlVuAn);
        return pt.quyetDinhXetXu(phanCong.chuToa, this.cauHinh.diaDiemXetXuChiTiet);
      });
      await this.kyLogic(quyetDinh.nguoiKy, tenVuAn, 'Quyết định đưa vụ án ra xét xử', moPhien);

      // ── Bước 5.5: mở form tạo bản án phúc thẩm ──
      const ngayXetXu = await test.step('Kết quả xét xử › Bản án › Tạo bản án phúc thẩm', async () => {
        await phienPT.vao(urlVuAn);
        return pt.moTaoBanAn();
      });

      return {
        luong,
        maVuAnSoTham: vuAn.maVuAn,
        tenVuAn,
        toaPhucTham,
        maVuAnPhucTham: thuLy.maVuAnPhucTham,
        soThuLy: thuLy.soThuLy,
        ngayThuLy: thuLy.ngayThuLy,
        chuToa: phanCong.chuToa,
        ngayXetXu,
      };
    } finally {
      for (const p of cacPhien) await p.dong();
    }
  }

  /** Mở phiên của người ký (tìm tài khoản theo họ tên) → Phê duyệt đề xuất → Ký logic → đóng phiên */
  private async kyLogic(
    nguoiKy: string,
    tenVuAn: string,
    loaiVanBan: string,
    moPhien: (tk: TaiKhoan) => Promise<PhienDangNhap>,
  ) {
    const tk = taiKhoanTheoTen(this.dsTaiKhoan, nguoiKy);
    await test.step(`${nguoiKy} (${tk.taiKhoan}) ký logic: ${loaiVanBan}`, async () => {
      const phien = await moPhien(tk);
      const daKy = await new PheDuyetDeXuatPage(phien.page).kyLogic(tenVuAn, loaiVanBan);
      if (!daKy) test.info().annotations.push({ type: 'Bỏ qua', description: `Không còn "${loaiVanBan}" chờ ký — đã ký ở lượt trước` });
      await phien.dong();
    });
  }
}

/**
 * Bước 1–2 của "Luồng nhập data.txt": nhập một đơn đề nghị GĐT/TT theo một bản án sơ thẩm có sẵn.
 * Tách riêng để dùng chung cho spec nhập đơn lẻ và spec chạy trọn luồng 24 vụ.
 */
import { Page, TestInfo, expect, test } from '@playwright/test';
import { BanAnSoTham, VU_NHAN_THEO_LOAI_AN } from './ban-an-so-tham';
import { nguoiNgauNhien } from './du-lieu';
import { LOAI_AN, LoaiAn, ThemMoiDonPage, taoThongTinDon } from '../pages/them-moi-don.page';

export interface KetQuaNhapDon {
  idDon: string;
  maDon: string;
  soThuLy: string;
  nguoiDungDon: string;
}

/**
 * Nhập trọn một đơn từ dữ liệu bản án: Thêm mới → tải tài liệu → "Quay lại" (không OCR)
 * → 3 ô bản án + cấp xét xử → tra cứu → chọn người từ bản án cũ → [Gợi ý] nội dung
 * → các trường còn thiếu → đơn vị chuyển đến + thụ lý mới → thông tin khiếu nại → Lưu → kiểm tra lại.
 *
 * Tra cứu hiện "Không tìm thấy bản án trong hệ thống" (Số/Ngày/Tòa án ra bản án không khớp) → báo lỗi,
 * dừng trước khi Lưu, không nhập tay thành đơn sai.
 */
export async function nhapDonTuBanAn(page: Page, b: BanAnSoTham, testInfo: TestInfo): Promise<KetQuaNhapDon> {
  const trang = new ThemMoiDonPage(page);
  const loai: LoaiAn = b.loaiAn === 'Hình sự' ? 'HINH_SU' : 'DAN_SU';
  const d = taoThongTinDon(nguoiNgauNhien(), loai);
  // Ghi đè bằng dữ liệu Excel: 3 ô nhập + cấp xét xử/loại án suy từ ký hiệu bản án
  Object.assign(d, {
    soBanAn: b.soBanAn,
    ngayBanAn: b.ngayBanAn,
    toaAn: b.toaAn,
    capXetXu: b.capXetXu,
    loaiAn: b.loaiAn,
    tuCach: LOAI_AN[loai].tuCach,
    // Vụ GĐKT nhận đơn theo loại án của bản án (Hình sự → Vụ … về hình sự, Dân sự → Vụ … về dân sự)
    donViChuyenDen: VU_NHAN_THEO_LOAI_AN[b.loaiAn] || LOAI_AN[loai].donViChuyenDen,
    // Luồng nhập data.txt: ngày tòa nhận / ngày ghi trên đơn / ngày dấu bưu điện đều là ngày nhập
    ngayGhiTrenDon: d.ngayToaNhan,
    ngayDauBuuDien: d.ngayToaNhan,
    // Án dân sự: quan hệ pháp luật đúng của vụ sơ thẩm (nếu bộ dữ liệu có)
    ...(b.quanHePhapLuat ? { quanHePhapLuat: b.quanHePhapLuat } : {}),
  });
  const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });

  await test.step('Mở màn Thêm mới từ Danh sách đơn', () => trang.moTuDanhSachDon({ quaMenu: true }));
  await test.step('Tải tài liệu đơn', () => trang.taiLenFileDon());
  await test.step('Bỏ qua OCR (Quay lại) để nhập tay', () => trang.boQuaOcr());
  await test.step('Nhập 3 ô bản án từ Excel + Cấp xét xử', () => trang.datThongTinBanAnTheoDuLieu(b));

  await test.step('Tra cứu bản án', () => trang.traCuuBanAn({ batBuocTimThay: true }));
  ghi('tra cứu bản án', 'tìm thấy trong hệ thống');
  ghi('thời hiệu giải quyết', await test.step('Thời hiệu giải quyết (bắt buộc)', () => trang.chonThoiHieuGiaiQuyetNeuTrong()));
  // Bước 2 tài liệu: chọn "Giám đốc thẩm" hay "Tái thẩm" theo file dữ liệu (sau tra cứu, vì màn tự fill)
  ghi('thủ tục giải quyết', await test.step('Thủ tục giải quyết', () => trang.datThuTucGiaiQuyet(b.thuTucGiaiQuyet)));

  // Hệ thống tự điền Loại án theo bản án gốc
  const loaiAnSauTraCuu = await trang.loaiAnHienTai();
  ghi('Loại án sau tra cứu', loaiAnSauTraCuu || '(trống)');
  expect(loaiAnSauTraCuu, `Tra cứu bản án ${b.soBanAn}/${b.ngayBanAn} không tự điền đúng Loại án`).toBe(b.loaiAn);

  const dsNguoi = await trang.dsNguoiTuBanAnCu();
  ghi('người từ bản án cũ', dsNguoi.join(' / ') || '(trống)');
  if (b.biCao) {
    expect(dsNguoi.join(' | '), `Danh sách người từ bản án cũ không có bị cáo "${b.biCao}"`).toContain(b.biCao);
  }
  const nguoiDaChon = await test.step('Chọn người từ bản án cũ', () => trang.chonNguoiTuBanAnCu(b.biCao));
  ghi('người đứng đơn', nguoiDaChon);
  d.nguoi.hoTen = nguoiDaChon.split(' - ')[0].trim();

  // Nội dung [Gợi ý] phải dựng đúng từ 3 ô vừa nhập
  const noiDung = await test.step('Bấm [Gợi ý] cho Nội dung đơn', () => trang.goiYNoiDungDon());
  ghi('nội dung gợi ý', noiDung);
  /**
   * Có `noiDungGoiY` (luồng đọc Excel) thì khớp y nguyên — đó là cách bắt lỗi "màn dựng nội dung sai
   * so với 3 ô vừa nhập". Không có (luồng FLOW/CASE/STEP: bản án do chính case sinh ra nên không ai
   * biết trước câu gợi ý) thì chỉ đòi nội dung KHÁC RỖNG và có số bản án trong đó — vẫn là bằng
   * chứng do hệ thống dựng, không phải chuỗi gieo.
   */
  if (b.noiDungGoiY) {
    expect(noiDung.trim(), 'Nội dung [Gợi ý] không khớp dữ liệu bản án đã nhập').toBe(b.noiDungGoiY);
  } else {
    expect(noiDung.trim(), 'Bấm [Gợi ý] nhưng Nội dung đơn vẫn trống').not.toBe('');
    expect(noiDung, `Nội dung [Gợi ý] không nhắc số bản án ${b.soBanAn}`).toContain(b.soBanAn);
  }

  const daDien = await test.step('Điền các trường còn thiếu', () => trang.dienTruongThieu(d));
  ghi('trường tự điền', daDien.join(', ') || '(đủ)');
  await test.step('Tư cách tố tụng, Đơn vị chuyển đến, Thụ lý mới', () => trang.datTuCachVaDonViNhan(d));
  // Bảng "Thông tin khiếu nại" chỉ có ở đơn án hình sự; đơn dân sự dùng bảng Nguyên đơn / Bị đơn (tự điền từ bản án cũ)
  if (loai === 'HINH_SU') {
    const daThemKhieuNai = await test.step('Thông tin khiếu nại', () =>
      trang.themThongTinKhieuNai(d.nguoi.hoTen, undefined, 'Khiếu nại cho người thân'));
    if (!daThemKhieuNai) {
      ghi('GAP dữ liệu', 'Đơn chỉ có một người (không tra ra bản án cũ) → không có "Người được khiếu nại" để thêm Thông tin khiếu nại');
    }
  }

  const idDon = await test.step('Lưu thông tin', () => trang.luu(d));
  const { maDon, ketQua } = await test.step('Mở lại đơn, so từng trường', () => trang.kiemTraSauLuu());
  const soThuLy = await page.locator('#thongTinChuyenDonVO_soThuLy').inputValue().catch(() => '');
  ghi('id đơn', idDon);
  ghi('mã đơn', maDon);
  ghi('số thụ lý', soThuLy || '(chưa có)');
  await testInfo.attach('kiem-tra-sau-luu.json', { body: JSON.stringify(ketQua, null, 2), contentType: 'application/json' });

  for (const t of ketQua.truong) expect.soft(t.sau, `Trường "${t.ten}" sau khi lưu`).toBe(t.truoc);
  const sau = (ten: string) => ketQua.truong.find(t => t.ten === ten)?.sau;
  expect.soft(sau('Số bản án'), 'Số bản án sau khi lưu').toBe(b.soBanAn);
  expect.soft(sau('Ngày bản án'), 'Ngày bản án sau khi lưu').toBe(b.ngayBanAn);
  expect.soft(sau('Loại án'), 'Loại án sau khi lưu').toBe(b.loaiAn);
  expect.soft(sau('Tòa án ra bản án'), 'Tòa án ra bản án sau khi lưu').toContain(b.toaAn);
  // Không có số thụ lý thì các bước sau (phân công, tờ trình) sẽ không thấy đơn
  expect(soThuLy, 'Đơn chưa được thụ lý (thiếu số thụ lý) → kiểm tra "Thụ lý đơn" trên form').toBeTruthy();

  return { idDon, maDon, soThuLy, nguoiDungDon: d.nguoi.hoTen };
}

/**
 * THÂN BƯỚC của FLOW-001 QUẢN LÝ ĐƠN.
 *
 * Dùng lại nguyên page object `pages/them-moi-don.page.ts` (1011 dòng, vẫn còn) — chỉ ghép lại theo
 * khung FLOW/CASE/STEP và BỔ SUNG những ô mà hai spec cũ bỏ mặc định: Loại QĐ/BA, Hình thức nhận,
 * Thủ tục giải quyết.
 *
 * NGUYÊN TẮC "ĐIỀN KÍN": mỗi khối trên màn đều có một lệnh gọi ở đây, và lệnh nào không làm được
 * thì GHI LẠI LÝ DO vào bằng chứng của bước, không im lặng bỏ qua. Bước chỉ xanh khi máy chủ trả
 * `idDon`.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ThemMoiDonPage, taoThongTinDon, type ThongTinDon } from '../../../pages/them-moi-don.page';
import { nguoiNgauNhien } from '../../../common/du-lieu';
import type { InputThemMoiDon } from './cai-dat';

type Ghi = (ten: string, giaTri: string) => void;

/** Bộ dữ liệu của một case: lấy mẫu chung rồi chồng những ô case khai riêng */
export function duLieuDon(input: InputThemMoiDon): ThongTinDon {
  const d = taoThongTinDon(nguoiNgauNhien(), input.loaiAnMa);
  return {
    ...d,
    ...(input.capXetXu ? { capXetXu: input.capXetXu } : {}),
    ...(input.loaiQdBa ? { loaiQdBa: input.loaiQdBa } : {}),
    ...(input.hinhThucNhan ? { hinhThucNhan: input.hinhThucNhan } : {}),
    ...(input.thuTucGiaiQuyet ? { thuTucGiaiQuyet: input.thuTucGiaiQuyet } : {}),
    ...(input.quanHePhapLuat ? { quanHePhapLuat: input.quanHePhapLuat } : {}),
  };
}

export async function themMoiDon(
  page: Page,
  input: InputThemMoiDon,
  ghi: Ghi,
): Promise<Record<string, string>> {
  const trang = new ThemMoiDonPage(page);
  const d = duLieuDon(input);
  ghi('đường vào', input.duongVao === 'ocr' ? 'OCR (bóc tách tệp PDF)' : 'không OCR (nhập tay)');
  ghi('loại án', d.loaiAn);

  await test.step('Mở màn Thêm mới từ Danh sách đơn', () => trang.moTuDanhSachDon({ quaMenu: true }));
  await test.step('Tải tệp đơn PDF (bắt buộc)', () => trang.taiLenFileDon());

  if (input.duongVao === 'ocr') {
    /**
     * OCR có thể mất tới 15 phút (FE tự dừng — `OCR_POLL_TIMEOUT_MS`). `QLA_OCR_ID` dùng lại kết quả
     * OCR cũ để gỡ lỗi nhanh, KHÔNG đặt khi chạy thật vì khi đó đơn không gắn với tệp vừa tải.
     */
    const ocrId = process.env.QLA_OCR_ID;
    if (ocrId) {
      await test.step(`Mở lại kết quả OCR ${ocrId}`, () => trang.moKetQuaOcr(ocrId));
      ghi('OCR', `dùng lại kết quả cũ QLA_OCR_ID=${ocrId} (không bóc tách mới)`);
    } else {
      await test.step('Bắt đầu OCR → chờ bóc tách → Lấy thông tin', () => trang.ocrVaLayThongTin());
      ghi('OCR', 'bóc tách xong, đã sang màn them-moi-tu-ocr');
    }
  } else {
    await test.step('Bỏ qua OCR (Quay lại) để nhập tay', () => trang.boQuaOcr());
  }

  // ── Khối "Thông tin bản án đề nghị" ──
  // Cấp xét xử ĐẶT TRƯỚC Tòa án: danh sách tòa lọc theo cấp (ghi chú sẵn ở page object).
  await test.step('Cấp xét xử', () => trang.datCapXetXu(d));
  ghi('cấp xét xử', d.capXetXu);
  ghi('loại QĐ/BA', await test.step('Loại QĐ/BA', () => trang.datLoaiQdBa(d.loaiQdBa)));
  ghi('hình thức nhận', await test.step('Hình thức nhận', () => trang.datHinhThucNhan(d.hinhThucNhan || 'Trực tiếp')));

  const daDien = await test.step('Điền các trường còn thiếu', () => trang.dienTruongThieu(d));
  ghi('trường đã điền', daDien.join(', ') || '(không thiếu ô nào)');

  await test.step('Tra cứu bản án', () => trang.traCuuBanAn());
  ghi('thời hiệu giải quyết', await test.step('Thời hiệu giải quyết', () => trang.chonThoiHieuGiaiQuyetNeuTrong()));
  // Thủ tục giải quyết đặt SAU tra cứu: màn tự điền khi tra ra bản án, đặt trước là bị ghi đè.
  ghi('thủ tục giải quyết', await test.step('Thủ tục giải quyết', () => trang.datThuTucGiaiQuyet(d.thuTucGiaiQuyet)));

  // ── Các bảng con: mỗi bảng một dòng, đủ để màn chi tiết có dữ liệu để so lại ──
  ghi('bản án liên quan', await test.step('Danh sách bản án/quyết định liên quan', () => trang.themBanAnLienQuan(d)));
  await test.step('Danh sách kết quả giải quyết liên quan', () => trang.themKetQuaGiaiQuyet(d));
  ghi('kết quả giải quyết', `${d.ketQua.loai} số ${d.ketQua.so} ngày ${d.ketQua.ngay}`);
  await test.step('Đơn thụ lý kèm', () => trang.themDonThuLyKem(d));
  ghi('đơn thụ lý kèm', `số đến ${d.donThuLyKem.soDen}, nhận ${d.donThuLyKem.ngayNhan}`);
  await test.step('Người tham gia tố tụng', () => trang.nhapNguoiThamGiaToTung(d));
  ghi('người tham gia tố tụng', `bị đơn ${d.biDon.hoTen} · người liên quan ${d.nguoiLienQuan.hoTen}`);

  // Án hình sự có thêm bảng "Thông tin khiếu nại"; án khác không có bảng này → trả false, ghi rõ.
  if (d.loaiAn === 'Hình sự') {
    const co = await test.step('Thông tin khiếu nại', () =>
      trang.themThongTinKhieuNai(d.nguoi.hoTen, d.biDon.hoTen, `Khiếu nại bản án ${d.soBanAn}.`));
    ghi('thông tin khiếu nại', co ? 'đã thêm 1 dòng' : 'màn không có bảng này');
  }

  await test.step('Xử lý đơn: tư cách + đơn vị nhận', () => trang.datTuCachVaDonViNhan(d));
  ghi('đơn vị chuyển đến', d.donViChuyenDen || '(mục đầu danh mục)');

  const idDon = await test.step('Lưu thông tin', () => trang.luu(d));
  expect(idDon, 'Máy chủ không trả id đơn sau khi lưu').toBeTruthy();
  ghi('id đơn', idDon);
  return { idDon, maDon: '' };
}

export async function kiemTraSauLuu(page: Page, _input: InputThemMoiDon, ghi: Ghi) {
  const trang = new ThemMoiDonPage(page);
  const { maDon, ketQua } = await test.step('Mở lại đơn, so từng trường', () => trang.kiemTraSauLuu());
  ghi('mã đơn', maDon);

  const lech = ketQua.truong.filter(t => t.sau !== t.truoc);
  const bangThieu = ketQua.bang.filter(b => !b.co);
  for (const t of lech) ghi(`LỆCH · ${t.ten}`, `nhập "${t.truoc}" → đọc lại "${t.sau}"`);
  for (const b of bangThieu) ghi(`BẢNG THIẾU · ${b.ten}`, `không thấy "${b.canCo}"`);
  ghi('trường khớp', `${ketQua.truong.length - lech.length}/${ketQua.truong.length}`);
  ghi('bảng khớp', `${ketQua.bang.length - bangThieu.length}/${ketQua.bang.length}`);

  // Dùng expect THƯỜNG (không soft): lệch một ô là dữ liệu đã sai, bước phải đỏ chứ không "xanh có cảnh báo"
  expect(lech, `Có ${lech.length} trường lệch sau khi lưu`).toEqual([]);
  expect(bangThieu, `Có ${bangThieu.length} bảng con thiếu dòng`).toEqual([]);

  await test.step('Tìm đơn trong Danh sách đơn', () => trang.timTrongDanhSachDon(maDon, ''));
  return {
    maDon,
    soTruongKhop: String(ketQua.truong.length),
    soBangKhop: String(ketQua.bang.length),
  };
}

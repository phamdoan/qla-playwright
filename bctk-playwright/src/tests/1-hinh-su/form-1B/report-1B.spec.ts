import { test } from '@playwright/test';
import path from 'path';
import { TaoVuAnPhucTham1B, VuAnNguon, docCauHinh1B } from '../../../pages/1-hinh-su/form-1B/create-case-1B.page';
import { DATA_DIR, luuDongKetQua } from '../../../utils/file-helper';
import { docBangExcel, ghiDongExcel, xoaDongExcel } from '../../../utils/excel-helper';
import { docTaiKhoan } from '../../../utils/tai-khoan';
import fs from 'fs';

const cauHinh = docCauHinh1B();
const FILE_VU_AN = path.join(DATA_DIR, cauHinh.linhVuc, cauHinh.fileVuAn);
const FILE_DA_CHAY = path.join(DATA_DIR, cauHinh.linhVuc, cauHinh.fileVuAnDaChay);
const COT_DA_CHAY = ['Thời điểm chạy', 'Mã vụ án', 'Tòa án', 'Luồng', 'Mã vụ án phúc thẩm', 'Ghi chú'];
const thoiDiem = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

/**
 * Chạy luồng thành công của file hướng dẫn 1B cho từng vụ án trong data-1B.xlsx,
 * lưu vụ án phúc thẩm tạo được vào output/1-hinh-su/ma-vu-an-form-1B.xlsx.
 *
 * File đầu vào chỉ chứa vụ MỚI: vụ chạy xong được chuyển sang data-1B-old.xlsx và xóa khỏi data-1B.xlsx;
 * vụ đã có trong file old thì không chạy lại. Vụ lỗi giữ nguyên để lần sau chạy tiếp từ chỗ dừng.
 *
 * Luồng lấy theo cột "Luồng" của từng dòng ("Kháng cáo" / "Kháng nghị"), không có thì theo
 * BCTK_LUONG (khang-cao | khang-nghi), rồi tới "Luồng mặc định" trong form-1B.xlsx.
 */
test(`[${cauHinh.bieuMau}] Tạo vụ án phúc thẩm theo ${cauHinh.fileVuAn}`, async ({ browser }) => {
  const dsTaiKhoan = [...(await docTaiKhoan()), ...cauHinh.taiKhoanBoSung];
  const dsDong = (await docBangExcel(FILE_VU_AN)).filter(d => d['Mã vụ án']);
  const daChay = new Set(fs.existsSync(FILE_DA_CHAY) ? (await docBangExcel(FILE_DA_CHAY)).map(d => d['Mã vụ án']) : []);
  test.setTimeout(Math.max(1, dsDong.length) * 30 * 60_000);

  /** Chuyển một dòng sang file old rồi xóa khỏi file đầu vào */
  const chuyenSangFileCu = async (d: Record<string, string>, maPhucTham: string, ghiChu: string) => {
    await ghiDongExcel(FILE_DA_CHAY, COT_DA_CHAY, [[thoiDiem(), d['Mã vụ án'], d['Tòa án'] ?? '', d['Luồng'] ?? '', maPhucTham, ghiChu]]);
    if (!(await xoaDongExcel(FILE_VU_AN, 'Mã vụ án', [d['Mã vụ án']]))) {
      // File đang mở trong Excel: chưa xóa được, nhưng đã có trong file old nên lần sau vẫn bỏ qua
      console.warn(`⚠ ${cauHinh.fileVuAn} đang mở — chưa xóa được dòng ${d['Mã vụ án']} (lần sau sẽ tự bỏ qua)`);
    }
  };

  const loi: string[] = [];
  for (const d of dsDong) {
    const ghi = d['Luồng'] || process.env.BCTK_LUONG || '';
    const vuAn: VuAnNguon = {
      maVuAn: d['Mã vụ án'],
      toaAn: d['Tòa án'],
      luong: /nghị|nghi/i.test(ghi) ? 'khang-nghi' : /cáo|cao/i.test(ghi) ? 'khang-cao' : undefined,
    };

    if (daChay.has(vuAn.maVuAn)) {
      await chuyenSangFileCu(d, '', `Bỏ qua: đã chạy trước đó (có trong ${cauHinh.fileVuAnDaChay})`);
      test.info().annotations.push({ type: 'Bỏ qua', description: `${vuAn.maVuAn} đã chạy trước đó` });
      continue;
    }

    await test.step(`Vụ án ${vuAn.maVuAn}`, async () => {
      try {
        const kq = await new TaoVuAnPhucTham1B(browser, cauHinh, dsTaiKhoan).chay(vuAn);
        await luuDongKetQua(
          cauHinh.linhVuc,
          cauHinh.bieuMau,
          ['Luồng', 'Mã vụ án sơ thẩm', 'Mã vụ án phúc thẩm', 'Số thụ lý PT', 'Ngày thụ lý PT', 'Tên vụ án', 'Tòa phúc thẩm', 'Chủ tọa', 'Ngày xét xử'],
          [kq.luong, kq.maVuAnSoTham, kq.maVuAnPhucTham, kq.soThuLy, kq.ngayThuLy, kq.tenVuAn, kq.toaPhucTham, kq.chuToa, kq.ngayXetXu],
        );
        await chuyenSangFileCu(d, kq.maVuAnPhucTham, 'Thành công');
        test.info().annotations.push({ type: 'Vụ án phúc thẩm', description: `${vuAn.maVuAn} → ${kq.maVuAnPhucTham}` });
      } catch (e) {
        // Vụ lỗi giữ lại trong file đầu vào; một vụ hỏng không chặn các vụ sau, báo gộp ở cuối.
        // Giữ vài dòng đầu của lỗi: dòng sau cho biết locator nào bị kẹt
        loi.push(`${vuAn.maVuAn}: ${(e as Error).message.split('\n').slice(0, 4).join(' ')}`);
      }
    });
  }
  if (loi.length) throw new Error(`Không tạo được ${loi.length}/${dsDong.length} vụ án (vẫn để trong ${cauHinh.fileVuAn}):\n${loi.join('\n')}`);
});

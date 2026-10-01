/**
 * FLOW HÌNH SỰ 001 · BƯỚC 05–06 — mở phiên tòa và quyết định đưa vụ án ra xét xử (PHẦN B Step4.1–4.2).
 *
 * Khác dân sự/KDTM ở chỗ MỞ LỊCH: hình sự có nút "Mở phiên tòa" ngay trên tab Xét xử, lịch tạo
 * xong mới quay về tab Chuẩn bị xét xử lập quyết định 020 rồi gắn lịch vào. Phần điền form lịch
 * dùng chung `common/lich-xet-xu.ts`.
 *
 * ĐIỀU KIỆN CHẶN của spec: bản án chỉ tạo được khi 020 ĐÃ KÝ ("Cần có quyết định đưa vụ án ra xét
 * xử trước khi tạo bản án"). Nên bước 06 phải lấy được SỐ quyết định, không chấp nhận "đã lưu".
 */
import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, hienTrong, moTaForm, nghi, nguyenNhanLoi, oTheoNhan, dienOTheoNhan } from '../../../common/antd';
import {
  bieuMauDangMo,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moTab,
  nutTheoChu,
  themBieuMauTuDanhSach,
} from '../../../common/bieu-mau';
import { dienFormLichXetXu } from '../../../common/lich-xet-xu';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/** Khối (card/collapse) của tab theo tiêu đề */
const khoiTheoTieuDe = (page: Page, tieuDe: RegExp) =>
  page.locator('.ant-collapse-item, .ant-card').filter({ hasText: tieuDe }).last();

async function dsNut(khung: Locator): Promise<string> {
  const ds = (await khung.getByRole('button').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(ds)].slice(0, 20).join(' | ') || '(không có)';
}

/** Ngày sau n ngày, dd/mm/yyyy */
const ngaySau = (n: number) => {
  const d = new Date(Date.now() + n * 86400_000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ═════════ BƯỚC 05 · Mở phiên tòa (lịch xét xử) ═════════
export async function moPhienToa(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTab(page, 'Xét xử');
  await choHetSpin(page);

  /**
   * Nhãn nút đổi theo trạng thái: chưa có lịch là "Mở phiên tòa", đã có lịch là "Đăng ký lịch xét
   * xử mới" (spec 4.1). Bắt cả hai, nếu không có cái nào thì in nút đang có chứ không im lặng.
   */
  const nutMo = nutTheoChu(page.locator('body'), /^Mở phiên tòa$|Đăng ký lịch xét xử mới/i);
  if (!(await hienTrong(nutMo, 20_000))) {
    throw new Error(
      `Tab Xét xử không có nút "Mở phiên tòa". Nút đang có: ${await dsNut(page.locator('body'))}`,
    );
  }
  await nutMo.click();
  await choHetSpin(page);

  const formLich = page
    .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
    .filter({ hasText: /Thêm lịch xét xử/i })
    .first();
  await expect(formLich, 'Bấm "Mở phiên tòa" nhưng không mở được form lịch xét xử').toBeVisible({
    timeout: 30_000,
  });
  if (process.env.QLA_SOI === '1') for (const d of await moTaForm(formLich)) ghi('05 lịch · ô', d);

  /**
   * Ngày xét xử: spec yêu cầu "ngày làm việc trong 30 ngày tới, KHÔNG Chủ nhật". Lấy mốc tất định
   * (hôm nay + 14) rồi đẩy sang thứ Hai nếu rơi vào Chủ nhật — chạy lại vẫn ra cùng một ngày.
   */
  let ngay = ngaySau(14);
  const [d, m, y] = ngay.split('/').map(Number);
  if (new Date(y, m - 1, d).getDay() === 0) ngay = ngaySau(15);

  const ngayMoPhienToa = await dienFormLichXetXu(page, formLich, ghi, '05 lịch', {
    ngay,
    gioBatDau: input.gioBatDauXetXu,
    gioKetThuc: input.gioKetThucXetXu,
    tinhChatPhienToa: input.tinhChatPhienToa,
    hinhThucXetXu: input.hinhThucXetXu,
    diaDiem: input.diaDiemXetXu,
  });

  /**
   * BẰNG CHỨNG: lịch vừa tạo phải hiện trên tab Xét xử. Chỉ dựa vào "form đã đóng" là chưa đủ —
   * đúng kiểu xanh giả đã gặp ở 66-DS (lưu xong, toast thành công, không dòng nào xuất hiện).
   */
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  const chu = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  if (!chu.includes(ngayMoPhienToa)) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await moTab(page, 'Xét xử');
    await choHetSpin(page);
    const lai = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    if (!lai.includes(ngayMoPhienToa)) {
      throw new Error(
        `Lưu lịch xong nhưng tab Xét xử không hiện ngày ${ngayMoPhienToa} — ${await nguyenNhanLoi(page)}`,
      );
    }
  }
  ghi('05 mở phiên tòa', `ngày mở phiên tòa ${ngayMoPhienToa}`);
  return { ngayMoPhienToa };
}

// ═════════ BƯỚC 06 · Quyết định đưa vụ án ra xét xử sơ thẩm (020) ═════════
export async function duaRaXetXu020(page: Page, input: DuLieuVao, ghi: GhiChu, ngayMoPhienToa: string) {
  await moTab(page, 'Chuẩn bị xét xử');
  await choHetSpin(page);

  const khoi = khoiTheoTieuDe(page, /Quyết định tố tụng/i);
  await expect(khoi, 'Tab Chuẩn bị xét xử không có khối "Quyết định tố tụng"').toBeVisible({
    timeout: 30_000,
  });
  const bm = await themBieuMauTuDanhSach(page, khoi, input.maBieuMau020);
  await expect(bm, 'Không mở được biểu mẫu 020').toBeVisible({ timeout: 30_000 });
  if (process.env.QLA_SOI === '1') for (const d of await moTaForm(bm)) ghi('06 020 · ô', d);
  ghi('06 020 · nút', await dsNut(bm));

  // Người ký phải là tài khoản đang chạy, không thì nút ký thành "Trình ký" và quyết định treo
  const nguoiKy = await dienOTheoNhan(page, bm, /Người ký/i, input.nguoiKy, true).catch((e: Error) => {
    ghi('06 020', `không đặt được Người ký: ${e.message.slice(0, 120)}`);
    return '';
  });
  if (nguoiKy) ghi('06 020', `Người ký = ${nguoiKy}`);

  /**
   * Card "Lịch xét xử" → "Chọn lịch xét xử" → chọn đúng lịch của bước 05. Lịch hiện dưới dạng
   * LỊCH THÁNG (đo ở luồng KDTM), ô ngày là div chứa số chứ không phải `td.ant-picker-cell`.
   */
  const nutChonLich = nutTheoChu(bm, /Chọn lịch xét xử/i);
  if (await hienTrong(nutChonLich, 10_000)) {
    await nutChonLich.scrollIntoViewIfNeeded().catch(() => {});
    await nutChonLich.click();
    await choHetSpin(page);
    const hop = bieuMauDangMo(page);
    await expect(hop, 'Bấm "Chọn lịch xét xử" nhưng không mở được màn chọn lịch').toBeVisible({
      timeout: 30_000,
    });
    const soNgay = Number(ngayMoPhienToa.split('/')[0]);
    const oNgay = hop.getByText(new RegExp(`^\\s*0?${soNgay}\\s*$`)).last();
    if (!(await hienTrong(oNgay, 8_000))) {
      const chu = (await hop.innerText()).replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`Không thấy ô ngày ${ngayMoPhienToa} trên lịch. Màn đang hiện: ${chu}`);
    }
    await oNgay.click();
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    ghi('06 020', `đã chọn lịch ngày ${ngayMoPhienToa}`);
    // Màn chọn lịch có thể còn mở sau khi chọn — đóng để không che nút "Lưu" của 020
    const con = bieuMauDangMo(page);
    if (await hienTrong(con.filter({ hasText: /Chọn lịch xét xử cho vụ án|Thêm lịch xét xử/i }), 3_000)) {
      await dongBieuMau(page, con);
    }
  } else {
    ghi('06 020', `không thấy nút "Chọn lịch xét xử". Nút đang có: ${await dsNut(bm)}`);
  }

  if (!(await luuBieuMau(page, bm, '020 (đưa vụ án ra xét xử)', ghi))) {
    throw new Error(`020: không thấy nút "Lưu". Nút đang có: ${await dsNut(bm)}`);
  }
  await laySoVaKyLogic(page, bm, ghi, '020 (đưa vụ án ra xét xử)');

  const soQuyetDinh020 = (await oTheoNhan(page, bm, /^Số quyết định/).inputValue().catch(() => '')).trim();
  if (!soQuyetDinh020) {
    throw new Error(
      `020: đã lưu nhưng không đọc được số quyết định — ${await nguyenNhanLoi(page, bm, 30_000)}`,
    );
  }
  ghi('06 020', `số quyết định ${soQuyetDinh020}`);
  await dongBieuMau(page, bm);
  return { soQuyetDinh020 };
}

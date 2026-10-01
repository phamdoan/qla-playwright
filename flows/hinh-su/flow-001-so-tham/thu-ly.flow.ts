/**
 * FLOW HÌNH SỰ 001 · BƯỚC 02 — thụ lý vụ án (PHẦN B Step1 của spec).
 *
 * Nút "Thụ lý" nằm ở góc phải khối "Thông tin chung" của màn chi tiết vụ án, mở popup
 * "Cấp số thụ lý vụ án". Số thụ lý do HỆ THỐNG cấp khi chọn "Ngày thụ lý" — ta không gieo số đó,
 * và chính nó là bằng chứng của bước này.
 */
import { Page, expect } from '@playwright/test';
import { choHetSpin, hienTrong, moTaForm, nghi, nguyenNhanLoi, toastDaHien } from '../../../common/antd';
import { bieuMauDangMo, nutTheoChu } from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/**
 * Số thụ lý hình sự sơ thẩm có dạng `<số>/<năm>/TLST-HS`. Đọc trên toàn trang chứ không neo vào
 * một khối: khối hiển thị đổi chỗ sau khi thụ lý (spec 1.8: header hiện "Số thụ lý - Ngày thụ lý").
 */
export async function docSoThuLy(page: Page): Promise<{ so: string; ngay: string }> {
  const chu = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const so = /(\d+\/\d{4}\/TLST-HS)/.exec(chu)?.[1] || '';
  const ngay = so
    ? /(\d{2}\/\d{2}\/\d{4})/.exec(chu.slice(chu.indexOf(so), chu.indexOf(so) + 120))?.[1] || ''
    : '';
  return { so, ngay };
}

export async function thuLyVuAnHinhSu(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  // Đã thụ lý ở lượt trước thì nút đổi thành "Sửa thụ lý" (spec 1.8) — lấy luôn số, không làm lại
  const daCo = await docSoThuLy(page);
  if (daCo.so) {
    ghi('02 thụ lý', `vụ án đã thụ lý từ trước: ${daCo.so} ngày ${daCo.ngay}`);
    return { soThuLyHinhSu: daCo.so, ngayThuLyHinhSu: daCo.ngay };
  }

  const nutThuLy = page
    .getByRole('button', { name: /^Thụ lý$/ })
    .or(page.locator('button').filter({ hasText: /^Thụ lý$/ }))
    .first();
  await expect(nutThuLy, 'Khối "Thông tin chung" không có nút "Thụ lý"').toBeVisible({
    timeout: 30_000,
  });
  await nutThuLy.click();
  await choHetSpin(page);

  const hop = bieuMauDangMo(page);
  await expect(hop, 'Không mở được popup "Cấp số thụ lý vụ án"').toBeVisible({ timeout: 30_000 });
  for (const d of await moTaForm(hop)) ghi('02 popup thụ lý · ô', d);
  const nut = [
    ...new Set(
      (await hop.getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
  ghi('02 popup thụ lý · nút', nut.slice(0, 20).join(' | ') || '(không có)');

  const { dienOTheoNhan } = await import('../../../common/antd');
  for (const [nhan, giaTri] of [
    [/Thủ tục áp dụng/i, input.thuTucApDung],
    [/Ngày thụ lý/i, input.ngayThuLy],
    [/Trường hợp thụ lý/i, input.truongHopThuLy],
    [/Ngày giao/i, input.ngayGiaoHoSo],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, hop, nhan, giaTri).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi('02 thụ lý', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
      return '';
    });
    if (gt) ghi('02 thụ lý', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  const nutXacNhan = nutTheoChu(hop, /Xác nhận thụ lý/i);
  await expect(nutXacNhan, 'Popup thụ lý không có nút "Xác nhận thụ lý"').toBeVisible({
    timeout: 15_000,
  });
  await nutXacNhan.click();
  await choHetSpin(page);
  try {
    await toastDaHien(page, /Lưu thụ lý thành công|thụ lý thành công/i, 60_000, /thất bại|lỗi/i);
  } catch {
    throw new Error(
      `Bấm "Xác nhận thụ lý" nhưng không có báo thành công — ${await nguyenNhanLoi(page, hop, 60_000)}`,
    );
  }
  if (await hienTrong(hop, 5_000)) {
    const nutDong = nutTheoChu(hop, /^Đóng$|^Hủy$/);
    if (await hienTrong(nutDong, 5_000)) await nutDong.click();
  }
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  /**
   * BẰNG CHỨNG: số thụ lý trên màn. FE không tự vẽ lại hết sau khi lưu nên tải lại một lần
   * (spec: "Sau mỗi lần ký phải TẢI LẠI TRANG mới thấy badge trạng thái đổi").
   */
  let bc = await docSoThuLy(page);
  if (!bc.so) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
    bc = await docSoThuLy(page);
  }
  if (!bc.so) {
    throw new Error(
      `Có toast thụ lý thành công nhưng màn không hiện số thụ lý dạng "…/2026/TLST-HS" — ${await nguyenNhanLoi(page)}`,
    );
  }
  ghi('02 thụ lý', `số thụ lý ${bc.so} · ngày ${bc.ngay}`);
  return { soThuLyHinhSu: bc.so, ngayThuLyHinhSu: bc.ngay };
}

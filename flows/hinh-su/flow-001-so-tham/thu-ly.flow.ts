/**
 * FLOW HÌNH SỰ 001 · BƯỚC 02 — thụ lý vụ án (PHẦN B Step1 của spec).
 *
 * Nút "Thụ lý" nằm ở góc phải khối "Thông tin chung" của màn chi tiết vụ án, mở popup
 * "Cấp số thụ lý vụ án". Số thụ lý do HỆ THỐNG cấp khi chọn "Ngày thụ lý" — ta không gieo số đó,
 * và chính nó là bằng chứng của bước này.
 */
import { Page, expect } from '@playwright/test';
import { batLoiApi, choHetSpin, hienTrong, moTaForm, nghi, nguyenNhanLoi, toastDaHien } from '../../../common/antd';
import { bieuMauDangMo, nutTheoChu } from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/**
 * Số thụ lý hình sự là SỐ TRẦN, không có hậu tố kiểu dân sự.
 *
 * Header sau khi thụ lý (đo 01/10/2026 trên UAT):
 *   `VA26-002448 · Số thụ lý: 54357 · Ngày thụ lý: 01/10/2026`
 *
 * Bản trước tìm `…/2026/TLST-HS` theo lối dân sự nên không khớp gì, và báo "không hiện số thụ lý"
 * dù thụ lý đã thành công — một xanh-hoá-đỏ, ngược lại cũng tai hại như đỏ-hoá-xanh.
 */
export async function docSoThuLy(page: Page): Promise<{ so: string; ngay: string }> {
  const chu = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  /**
   * CHỈ NHẬN SỐ. Khi vụ CHƯA thụ lý, header vẫn in "Số thụ lý: —" (gạch ngang dài U+2014), và
   * `[^\s·]+` khớp đúng dấu gạch đó: chuỗi "—" không rỗng nên bước 02 kết luận "đã thụ lý từ
   * trước", báo XANH GIẢ và ghi bằng chứng là "—". Bước 03 mới lộ ra: API trả
   * `PCVA01 Vụ án chưa được thụ lý, không thể phân công` (đo 01/10/2026 trên STG).
   */
  const so = (/Số thụ lý:\s*(\d[\w/.-]*)/.exec(chu)?.[1] || '').trim();
  return {
    so,
    ngay: so ? (/Ngày thụ lý:\s*(\d{2}\/\d{2}\/\d{4})/.exec(chu)?.[1] || '').trim() : '',
  };
}

export async function thuLyVuAnHinhSu(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  /**
   * Đã thụ lý ở lượt trước thì nút đổi thành "Sửa thụ lý" (spec 1.8) — lấy luôn số, không làm lại.
   *
   * PHẢI CHỜ header nạp. Hỏi ngay khi vừa mở trang thì chưa có chữ "Số thụ lý:", kịch bản tưởng
   * chưa thụ lý rồi bấm "Sửa thụ lý" và báo "không mở được popup Cấp số thụ lý" (đo 01/10/2026).
   */
  const daCo = { so: '', ngay: '' };
  await expect
    .poll(async () => (Object.assign(daCo, await docSoThuLy(page)), daCo.so), {
      timeout: 25_000,
      intervals: [2000],
    })
    .not.toBe('')
    .catch(() => {});
  if (daCo.so) {
    ghi('02 thụ lý', `vụ án đã thụ lý từ trước: ${daCo.so} ngày ${daCo.ngay}`);
    return { soThuLyHinhSu: daCo.so, ngayThuLyHinhSu: daCo.ngay };
  }

  /**
   * Spec 1.1 nói nút "Thụ lý" ở góc phải khối "Thông tin chung". Thực tế màn có hẳn một TAB
   * "Thụ lý" (tên trợ năng "file-done Thụ lý" — icon trước chữ), và nút nằm trong tab đó.
   * Đo 01/10/2026 trên UAT: ở tab "Thông tin chung" không có nút nào tên "Thụ lý".
   */
  const { moTabVaCho } = await import('../../../common/bieu-mau');
  await moTabVaCho(page, 'Thụ lý', ghi, /Thông tin thụ lý|Thông tin cáo trạng/i);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  const nutThuLy = page
    .getByRole('button', { name: /^Thụ lý$|Cấp số thụ lý|Sửa thụ lý/ })
    .or(page.locator('button').filter({ hasText: /^Thụ lý$|Cấp số thụ lý/ }))
    .first();
  if (!(await hienTrong(nutThuLy, 20_000))) {
    const nut = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts().catch(() => []))
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ];
    throw new Error(
      `Tab "Thụ lý" không có nút "Thụ lý". Nút đang có: ${nut.slice(0, 25).join(' | ')}`,
    );
  }
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
  const loiApi = batLoiApi(page);
  await nutXacNhan.click();
  /**
   * Nhiều biểu mẫu của hệ này mở HỘP XÁC NHẬN sau khi bấm lưu; không bấm tiếp thì bản ghi không
   * được tạo mà cũng KHÔNG có toast lỗi nào — nhìn ra ngoài chỉ thấy "popup vẫn mở".
   * Đo 01/10/2026: popup thụ lý còn mở, không ô nào gắn cờ lỗi, số thụ lý đã cấp (54357).
   */
  const { xacNhanHopThoai } = await import('../../../common/bieu-mau');
  await xacNhanHopThoai(page);
  await choHetSpin(page);
  try {
    await toastDaHien(page, /Lưu thụ lý thành công|thụ lý thành công/i, 60_000, /thất bại|lỗi/i);
  } catch {
    /**
     * Không toast, không lỗi → in lại TOÀN BỘ ô của popup kèm cờ lỗi. Spec 1.3 ghi "chọn Ngày thụ
     * lý → hệ thống TỰ LẤY Số thụ lý", nên ô "Số thụ lý" còn trống là dấu hiệu BE chưa cấp số
     * ("Không thể lấy số thụ lý từ hệ thống") chứ không phải ta thiếu thao tác.
     */
    const con = await hienTrong(hop, 3_000);
    const o = con ? await moTaForm(hop) : [];
    for (const d of o) ghi('02 thụ lý · sau khi bấm', d);
    throw new Error(
      `Bấm "Xác nhận thụ lý" nhưng không có báo thành công.\n  ` +
        `Popup ${con ? 'VẪN MỞ' : 'đã đóng'}. ${await nguyenNhanLoi(page, con ? hop : undefined, 60_000)}\n  ` +
        `Ô còn lỗi: ${o.filter(d => d.includes('⚠')).join(' · ') || '(không ô nào gắn cờ lỗi)'}\n  ` +
        loiApi(),
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

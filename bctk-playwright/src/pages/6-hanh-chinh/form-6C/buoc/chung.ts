import { Locator, expect } from '@playwright/test';
import { ManHinh, chuaChu, dungChu } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * [Bước 04, 06, 08] Lãnh đạo · Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt":
 * mở lần lượt các đề xuất khớp `loai` (tên văn bản) do `nguoiTao` tạo; đề xuất nào có nội dung khớp `noiDung`
 * (vd. /Số:\s*442/) thì bấm `nut` ("Ký logic" / "Phê duyệt") rồi chờ thông báo ("… thành công" / "Đã phê duyệt yêu cầu").
 * Không xử lý được đề xuất nào → báo lỗi (tránh bước "đạt" mà không làm gì).
 * @returns số đề xuất đã xử lý
 */
export async function xuLyChoDuyet(
  phien: PhienDangNhap,
  loai: RegExp,
  nguoiTao: string,
  nut: 'Ký logic' | 'Phê duyệt',
  noiDung?: RegExp,
  toiDa = 1,
): Promise<number> {
  const m = new ManHinh(phien.page);
  const main = m.page.locator('main');
  let daXuLy = 0;
  // (trang, i) = vị trí đề xuất đang xét; bỏ qua đề xuất không khớp nội dung thì tăng i, ký xong thì danh sách ngắn lại (giữ i).
  // "Chờ duyệt" phân trang 10 dòng, có nhiều tờ trình cùng tên của hồ sơ khác → hết trang thì lật sang trang sau
  // (30/10: tờ trình 547 nằm ở trang 2, chỉ xét trang 1 thì báo không thấy)
  const nutSau = main.locator('.ant-pagination-next').first();
  for (let trang = 1, i = 0, vong = 0; daXuLy < toiDa && vong < 40; vong++) {
    // Trang có lúc chưa vẽ tab (máy bận, trang trắng — BA 12361 bước 04, 30/10) → vaoCho tự tải lại / qua Dashboard tới khi có tab
    await phien.vaoCho('lanh-dao/phe-duyet-de-xuat/danh-sach', main.locator('[role=tab]').filter({ hasText: 'Chờ duyệt' }).first());
    await m.choTaiXong(2000);
    await chonTab(m, 'Chờ duyệt');
    await m.choTaiXong(1000);
    // Đếm ngay khi bảng chưa tải → tưởng không còn đề xuất; chờ bảng có dòng (hoặc báo trống) trước
    await m.choBang(main);
    let denDuoc = true;
    for (let t = 1; t < trang && denDuoc; t++) {
      denDuoc = (await nutSau.getAttribute('aria-disabled').catch(() => 'true')) !== 'true';
      if (denDuoc) {
        await nutSau.click();
        await m.choTaiXong(1500);
        await m.choBang(main);
      }
    }
    if (!denDuoc) break;
    const dong = main.locator('.ant-table-row').filter({ hasText: loai }).filter({ hasText: nguoiTao });
    if (i >= (await dong.count())) {
      if ((await nutSau.getAttribute('aria-disabled').catch(() => 'true')) === 'true') break;
      trang++;
      i = 0;
      continue;
    }
    await dong.nth(i).locator('a').first().click();
    await m.page.waitForURL(/y-kien-lanh-dao/, { timeout: 60_000 });
    await m.choTaiXong(3000);
    // Nội dung văn bản nằm trong khung xem PDF, vẽ chậm → chờ tới khi khớp (tối đa 30s) rồi mới coi là không phải đề xuất cần tìm
    const khop = !noiDung || (await expect.poll(async () => noiDung.test((await main.innerText()).replace(/\s+/g, ' ')), { timeout: 30_000 }).toBe(true).then(() => true).catch(() => false));
    if (!khop) {
      i++;
      continue;
    }
    await m.nut(main, nut).click();
    await m.dongYTatCaXacNhan();
    const hop = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
    if (await hop.isVisible().catch(() => false)) {
      const dongY = hop.locator('button').filter({ hasText: new RegExp(`${nut}|Đồng ý|Xác nhận|Gửi`) }).last();
      if (await dongY.isVisible().catch(() => false)) await dongY.click();
    }
    // Thông báo có khi tắt nhanh/không hiện → ký xong màn chuyển sang "Yêu cầu đóng dấu" / "Đóng dấu logic" cũng là xong
    const daXong = m.page.locator('.ant-message, .ant-notification').filter({ hasText: /thành công|Đã phê duyệt|Đã ký/i })
      .or(m.nut(main, /Yêu cầu đóng dấu|Đóng dấu logic/));
    await expect(daXong.first(), `Bấm "${nut}" nhưng không thấy thông báo thành công`).toBeVisible({ timeout: 30_000 });
    daXuLy++;
  }
  if (!daXuLy) throw new Error(`Không thấy đề xuất "${loai.source}" của ${nguoiTao} đang chờ duyệt${noiDung ? ` (nội dung khớp ${noiDung})` : ''}`);
  return daXuLy;
}

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 6C (giám đốc thẩm).
 * Thao tác riêng của bước nào nằm ngay trong file bước đó.
 */

/** Bấm tab (antd) có chữ `ten` trong vùng chính rồi chờ bảng tải */
export async function chonTab(m: ManHinh, ten: string) {
  const tab = m.page.locator('main [role=tab]').filter({ hasText: ten }).first();
  // Máy bận / trang tải nặng: cú bấm có lúc treo ở "performing click action" dù tab đã chuyển (BA 12361 bước 02, 30/10)
  // → tab đã chọn thì coi như xong; chưa chọn thì bấm lại một lần
  await tab.click().catch(async () => {
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click({ timeout: 60_000 });
  });
  await m.choTaiXong(1500);
}

/** Bộ lọc danh sách: ô "Số BA/QĐ" (hoặc "Số bản án…") = số bản án → "Tìm kiếm" */
export async function locTheoBanAn(m: ManHinh, soBanAn: string) {
  const main = m.page.locator('main');
  const o = m.oTheoNhan(/^\s*Số (BA\/QĐ|bản án)/, main).locator('input').first();
  if (await o.isVisible().catch(() => false)) {
    await o.fill(soBanAn);
    await m.nut(main, 'Tìm kiếm').click();
    await m.choTaiXong(1500);
  }
}

/**
 * Dòng của hồ sơ trong bảng danh sách — nhận theo số quyết định kháng nghị ("Số:1467").
 * hasText so với textContent, các ô dính liền ("Số:1467Ngày:…") → chặn sau số bằng (?!\d), không dùng \b.
 */
export const dongHoSo = (m: ManHinh, soKhangNghi: string) =>
  m.page.locator('main .ant-table-row').filter({ hasText: new RegExp(`Số\\s*(KN)?\\s*:\\s*${soKhangNghi}(?!\\d)`) }).first();

/**
 * Ô chọn người (Người ký, Chủ tọa…): mục có title = họ tên, chữ hiện "Họ tên - ngày sinh / chức vụ".
 * Gõ để lọc thì phần tô sáng làm mất tên trong CHỮ HIỆN (title vẫn giữ) → luôn bấm mục theo title.
 * Danh sách ảo chỉ vẽ vài mục đầu → không thấy mục ngay thì gõ tên để lọc rồi mới tìm.
 */
export async function chonNguoi(m: ManHinh, item: Locator, ten: string): Promise<string> {
  await item.locator('.ant-select-selector').first().click();
  const muc = m.page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${ten}"]`).first();
  if (!(await muc.waitFor({ timeout: 3_000 }).then(() => true).catch(() => false))) {
    await item.locator('input').first().fill(ten);
    await muc.waitFor({ timeout: 15_000 });
  }
  await muc.click();
  await expect(item.locator('.ant-select-selection-item').first(), `Chưa chọn được "${ten}"`).toContainText(ten, { timeout: 5_000 });
  return ten;
}

/**
 * Ô chọn có gõ tìm, kể cả dạng CÂY (vd. "Tòa án ra bản án": tòa tỉnh là nút cha, tòa khu vực là nút con):
 * bấm ô → gõ `chu` → chờ mục khớp (ưu tiên khớp đúng cả chữ) → bấm.
 * Hàm `chonTrong` chờ danh sách option thường nên không dùng được với TreeSelect.
 * @returns chữ của mục đã chọn
 */
export async function chonTimKiem(m: ManHinh, item: Locator, chu: string): Promise<string> {
  await item.locator('.ant-select-selector').first().click();
  await item.locator('input').first().fill(chu);
  const dd = m.page.locator('.ant-select-dropdown:visible, .ant-tree-select-dropdown:visible').last();
  const cacMuc = dd.locator('.ant-select-item-option, .ant-select-tree-node-content-wrapper');
  await cacMuc.first().waitFor({ timeout: 20_000 });
  const dung = cacMuc.filter({ hasText: dungChu(chu) }).first();
  const muc = (await dung.count()) ? dung : cacMuc.filter({ hasText: chuaChu(chu) }).first();
  const ten = (await muc.innerText()).replace(/\s+/g, ' ').trim();
  await muc.click();
  await expect(item.locator('.ant-select-selection-item').first(), `Chưa chọn được "${chu}"`).toContainText(ten.slice(0, 15), { timeout: 5_000 });
  return ten;
}

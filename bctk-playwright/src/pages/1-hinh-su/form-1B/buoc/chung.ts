import { Locator } from '@playwright/test';
import { ManHinh, chuaChu, dungChu } from '../../../base.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 1B.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó (01-…ts → 11-…ts).
 * Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** Luồng 1: kháng cáo · Luồng 2: kháng nghị */
export type Luong = 'khang-cao' | 'khang-nghi';

/** Tiêu đề khối trong mục "Kháng cáo, kháng nghị" của tab "Kết quả sơ thẩm" */
export const TIEU_DE_KHOI: Record<Luong, string> = { 'khang-cao': 'Đơn kháng cáo', 'khang-nghi': 'Quyết định kháng nghị' };

/** Mẫu thông báo ở menu "Lập biểu mẫu" */
export const MAU_THONG_BAO: Record<Luong, string> = {
  'khang-cao': 'Thông báo về việc kháng cáo',
  'khang-nghi': 'Thông báo về việc kháng nghị',
};

/** Khớp phần đầu chuỗi (tên người trong danh sách chọn có kèm ngày sinh, chức danh phía sau) */
export const batDauBang = (ten: string) => new RegExp(`^\\s*${ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

/**
 * [Bước 01, 02, 03] Vụ việc › Hình sự › Quản lý án sơ thẩm › Vụ án sơ thẩm → tìm theo mã → mở vụ án (phải "Đã xét xử").
 * @returns tên vụ án (để tìm ở Tòa phúc thẩm), mã định danh D01-… (giữ nguyên khi lên phúc thẩm),
 *          vụ đã được chuyển lên phúc thẩm ở lượt trước chưa
 */
export async function moVuAnSoTham(m: ManHinh, maVuAn: string) {
  await m.moMenu('Vụ việc', 'Hình sự', 'Quản lý án sơ thẩm', 'Vụ án sơ thẩm');
  await m.timKiem('Nhập từ khóa tìm kiếm', maVuAn);
  const dong = await m.dong(m.page, maVuAn);
  const chu = (await dong.innerText()).replace(/\s+/g, ' ');
  if (!/Đã xét xử/.test(chu)) throw new Error(`Vụ án ${maVuAn} chưa ở trạng thái "Đã xét xử": ${chu.slice(0, 250)}`);
  // Cột "Thông tin vụ án": tên vụ án là .ant-typography đầu tiên (không phải dòng chữ phụ màu xám)
  const oTen = dong.locator('td').nth(1).locator('.ant-typography:not(.ant-typography-secondary)').first();
  const tenVuAn = (await oTen.innerText()).trim();
  await oTen.click();
  await m.page.waitForURL(/so-tham\/chi-tiet/, { timeout: 60_000 });
  await m.choTaiXong(1500);
  return {
    tenVuAn,
    maDinhDanh: chu.match(/D\d{2}-\d{4}-\d+/)?.[0] ?? '',
    daChuyenPhucTham: /Đã chuyển phúc thẩm/.test(chu),
  };
}

/** [Bước 01, 02, 03] Tab "Kết quả sơ thẩm" › mục "Kháng cáo, kháng nghị" (đã mở) */
export async function mucKhangCao(m: ManHinh): Promise<Locator> {
  await m.moTab('ket-qua-so-tham');
  return m.moMuc('Kháng cáo, kháng nghị');
}

/** [Bước 01, 02, 03] Khối "Đơn kháng cáo" / "Quyết định kháng nghị" (đã chờ bảng tải xong) */
export async function khoiDon(m: ManHinh, luong: Luong): Promise<Locator> {
  const muc = await mucKhangCao(m);
  const khac: Luong = luong === 'khang-cao' ? 'khang-nghi' : 'khang-cao';
  const khoi = muc
    .locator('div')
    .filter({ has: m.page.getByText(TIEU_DE_KHOI[luong], { exact: true }) })
    .filter({ has: m.page.locator('button').filter({ hasText: dungChu('Thêm mới') }) })
    .filter({ hasNotText: TIEU_DE_KHOI[khac] })
    .last();
  await m.choBang(khoi);
  return khoi;
}

/** [Bước 05 → 11] Vào vụ án phúc thẩm theo tên + mã định danh (khi đã thụ lý) */
export async function moVuAnPhucThamTheoTen(m: ManHinh, tenVuAn: string, maDinhDanh: string): Promise<string> {
  await m.moMenu('Vụ việc', 'Hình sự', 'Quản lý án phúc thẩm', 'Vụ án phúc thẩm');
  await m.timKiem('Nhập từ khóa tìm kiếm', tenVuAn);
  const vuAn = await m.dong(m.page, maDinhDanh || chuaChu(tenVuAn));
  await vuAn.locator('td').nth(1).locator('.ant-typography:not(.ant-typography-secondary)').first().click();
  await m.page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
  await m.choTaiXong(2000);
  return m.page.url();
}

/**
 * [Bước 07, 09] Trên biểu mẫu đã lưu: "Trình ký" → popup "Nhập thông tin trình duyệt ký" → "Gửi" → đóng biểu mẫu.
 * @returns người ký văn bản
 */
export async function trinhKy(m: ManHinh, bieuMau: Locator): Promise<string> {
  await m.nut(bieuMau, 'Trình ký').click();
  const tk = m.popup('Nhập thông tin trình duyệt ký');
  await tk.waitFor({ timeout: 30_000 });
  const nguoiKy = await m.docGiaTri('Người ký văn bản', tk);
  await m.nut(tk, 'Gửi').click();
  await m.choThongBao(/Đã trình ký/);
  await m.choTaiXong();
  await m.nut(bieuMau, 'Đóng').click().catch(() => undefined);
  await bieuMau.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  return nguoiKy;
}

/**
 * [Bước 08, 10] Người ký: Lãnh đạo › Công tác lãnh đạo › Phê duyệt đề xuất → mở văn bản "Chờ ký" → "Ký logic".
 * @returns false nếu không còn văn bản chờ ký (đã ký ở lượt trước)
 */
export async function kyLogic(m: ManHinh, tenVuAn: string, loaiVanBan: string): Promise<boolean> {
  await m.moMenu('Lãnh đạo', 'Công tác lãnh đạo', 'Phê duyệt đề xuất');
  // Tên vụ án ở đây viết hoa khác danh sách sơ thẩm → so không phân biệt hoa thường
  const cacDong = m.page
    .locator('.ant-table-tbody tr.ant-table-row')
    .filter({ hasText: chuaChu(tenVuAn) })
    .filter({ hasText: loaiVanBan })
    .filter({ hasText: 'Chờ ký' });
  if (!(await cacDong.first().waitFor({ timeout: 20_000 }).then(() => true).catch(() => false))) return false;
  // Tên vụ án là thẻ <a> không có href (không mang role link)
  await cacDong.first().locator('a').first().click();
  await m.page.waitForURL(/phe-duyet-de-xuat\/y-kien-lanh-dao/, { timeout: 60_000 });
  await m.choTaiXong(2000);
  await m.nut(m.page, 'Ký logic').click();
  await m.choThongBao(/Ký logic.*thành công/i, 60_000);
  return true;
}

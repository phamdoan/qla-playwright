import { Locator } from '@playwright/test';
import { ManHinh, chuaChu, dungChu } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 1B.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó (01-…ts → 09-…ts).
 * Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** Luồng 1: kháng cáo · Luồng 2: kháng nghị */
export type Luong = 'khang-cao' | 'khang-nghi';

/** Tiêu đề khối trong mục 'Kháng cáo, kháng nghị' của tab 'Kết quả sơ thẩm' */
export const TIEU_DE_KHOI: Record<Luong, string> = { 'khang-cao': 'Đơn kháng cáo', 'khang-nghi': 'Quyết định kháng nghị' };

/** Mẫu thông báo ở menu 'Lập biểu mẫu' */
export const MAU_THONG_BAO: Record<Luong, string> = {
  'khang-cao': 'Thông báo về việc kháng cáo',
  'khang-nghi': 'Thông báo về việc kháng nghị',
};

/** Khớp phần đầu chuỗi (tên người trong danh sách chọn có kèm ngày sinh, chức danh phía sau) */
export const batDauBang = (ten: string) => new RegExp(`^\\s*${ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

/**
 * [Bước 01, 02, 03] Mở vụ án sơ thẩm theo link (cột "Link vụ án"; trang 404 / trống → qua Dashboard rồi vào lại).
 * @returns tên vụ án (để tìm ở Tòa phúc thẩm), mã định danh D01-… nếu trang có, vụ đã chuyển lên phúc thẩm chưa
 */
export async function moVuAnSoTham(phien: PhienDangNhap, url: string) {
  const m = new ManHinh(phien.page);
  await phien.vaoCho(url, m.page.getByRole('tab', { name: /Kết quả sơ thẩm/ }));
  await m.choTaiXong(1500);
  // Đầu trang: "Vụ án: Đỗ Văn Lan - Hủy hoại … Mã vụ án: VA26-007223 · Số thụ lý: 226 · … ĐÃ CHUYỂN PHÚC THẨM"
  const dau = (await m.page.locator('main').innerText()).slice(0, 1500).replace(/\s+/g, ' ');
  return {
    m,
    tenVuAn: (dau.match(/Vụ án:\s*(.+?)\s*Mã vụ án:/)?.[1] ?? '').trim(),
    maDinhDanh: dau.match(/D\d{2}-\d{4}-\d+/)?.[0] ?? '',
    daChuyenPhucTham: /ĐÃ CHUYỂN PHÚC THẨM/i.test(dau),
  };
}

/** [Bước 01, 02, 03] Tab 'Kết quả sơ thẩm' › mục 'Kháng cáo, kháng nghị' (đã mở) */
export async function mucKhangCao(m: ManHinh): Promise<Locator> {
  await m.moTab('ket-qua-so-tham');
  return m.moMuc('Kháng cáo, kháng nghị');
}

/** [Bước 01, 02, 03] Khối 'Đơn kháng cáo' / 'Quyết định kháng nghị' (đã chờ bảng tải xong) */
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

/** [Bước 05 → 09] Vào vụ án phúc thẩm theo tên + mã định danh (khi đã thụ lý) */
export async function moVuAnPhucThamTheoTen(m: ManHinh, tenVuAn: string, maDinhDanh: string): Promise<string> {
  // Vụ việc › Quản lý án phúc thẩm › Vụ án phúc thẩm (vào thẳng link)
  await m.page.goto('vu-an/phuc-tham/danh-sach');
  await m.choTaiXong(2000);
  await m.timKiem('Nhập từ khóa tìm kiếm', tenVuAn);
  const vuAn = await m.dong(m.page, maDinhDanh || chuaChu(tenVuAn));
  await vuAn.locator('td').nth(1).locator('.ant-typography:not(.ant-typography-secondary)').first().click();
  await m.page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
  await m.choTaiXong(2000);
  return m.page.url();
}

/** [Bước 03, 06, 07, 08, 09] Nút "Dùng số" của biểu mẫu (lấy số kế tiếp) — không có thì thôi */
export async function dungSo(m: ManHinh, bm: Locator) {
  const nut = m.nut(bm, /Dùng số/);
  if (await nut.isVisible().catch(() => false)) {
    await nut.click();
    await m.page.waitForTimeout(800);
  }
}

/** [Bước 03, 07, 08] Biểu mẫu đã lưu: "Ký logic" (xác nhận nếu hỏi) → "Đóng" */
export async function kyLogicVaDong(m: ManHinh, bm: Locator) {
  await m.nut(bm, /Ký logic/).click();
  await m.dongYTatCaXacNhan();
  await m.choThongBao(/Ký logic.*thành công|thành công/i, 60_000);
  await m.nut(bm, 'Đóng').click().catch(() => undefined);
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong();
}

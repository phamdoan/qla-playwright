import { Locator, expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { TrangThai1A1, VuNguon, cauHinh1A1, dsPhapNhan } from '../cau-hinh-1A1';
import { hoTen, ngay } from '../../../../utils/fake-data';
import { moVuAn, ngauNhien, ngaySinh, soNgauNhien } from './chung';

const HO_CONG_TY = ['Hoàng Gia', 'Minh Phát', 'Thành Đạt', 'An Khang', 'Phú Thịnh', 'Đại Việt', 'Hưng Long', 'Sao Mai', 'Tân Á', 'Kim Ngân'];
const LOAI_CONG_TY = ['Công ty TNHH', 'Công ty Cổ phần', 'Công ty TNHH MTV'];
const NGANH = ['Thương mại', 'Xây dựng', 'Dịch vụ', 'Sản xuất', 'Vận tải', 'Đầu tư'];

/**
 * BƯỚC 03 · Thêm bị can là pháp nhân thương mại (hướng dẫn bước 3)
 *
 *  1. Mở chi tiết vụ án → tab "Thụ lý" → mục "Bị can/Bị cáo" → "Tạo mới" → popup "Thêm mới bị can"
 *  2. Đối tượng phạm tội "Pháp nhân thương mại" · Bị can đầu vụ "Có"
 *     · Tên pháp nhân, Mã số doanh nghiệp/Mã số thuế (10 số), Địa chỉ trụ sở chính — ngẫu nhiên
 *  3. "Thêm người đại diện" → Họ tên, Ngày sinh, Giới tính, Số định danh, Chức vụ "Giám đốc" → "Lưu"
 *  4. Mục "3. Thông tin tố tụng": Thời điểm phạm tội = 10 ngày trước · Địa bàn "Nông thôn" · Tính chất thiệt hại
 *  5. Mục "4. Điều luật áp dụng cho pháp nhân" → "Thêm điều luật áp dụng" → tìm theo số điều của tội danh
 *     ở hồ sơ → chọn tội danh → tích "Khoản 1" → "Thêm vào danh sách"
 *  6. "Lưu" → "Lưu thành công"
 *
 * Lặp BCTK_SO_PHAP_NHAN lượt (mỗi lượt một pháp nhân; chỉ lượt 1 là "Bị can đầu vụ").
 */
export const buoc03: Buoc<VuNguon, TrangThai1A1> = {
  so: 3,
  ten: 'Thêm bị can pháp nhân thương mại (người đại diện, thông tin tố tụng, điều luật)',
  huongDan: '3',
  soLan: cauHinh1A1.soPhapNhan,
  chay: async ({ vuAn, tt, lan, moPhien, tkToa, can }) => {
    const daCo = dsPhapNhan(tt);
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 2));
    await m.moTab('thu-ly');
    const muc = await m.moMuc('Bị can/Bị cáo');
    await m.choBang(muc);
    // Lượt này đã thêm pháp nhân rồi (vd. state cũ) → không thêm lại
    const cu = daCo[lan - 1];
    if (cu && (await muc.locator('.ant-table-row').filter({ hasText: cu.ten }).count())) return { dsPhapNhan: daCo };

    await m.nut(muc, /^\s*(Tạo mới|Thêm mới)\s*$/).click();
    const d = m.popup('Thêm mới bị can');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    // ── 1. Thông tin pháp nhân ──
    await m.chon(d, 'Đối tượng phạm tội', 'Pháp nhân thương mại');
    await m.oTheoNhan('Tên pháp nhân thương mại', d).waitFor({ timeout: 15_000 });
    await m.radio(d, 'Bị can đầu vụ', lan === 1 ? 'Có' : 'Không');
    const tenPhapNhan = `${ngauNhien(LOAI_CONG_TY)} ${ngauNhien(NGANH)} ${ngauNhien(HO_CONG_TY)} ${soNgauNhien(3)}`;
    await m.nhap(d, 'Tên pháp nhân thương mại', tenPhapNhan);
    const maSoThue = await m.nhap(d, 'Mã số doanh nghiệp', '0' + soNgauNhien(9));
    await m.nhap(d, 'Địa chỉ trụ sở chính', `Số ${1 + Math.floor(Math.random() * 200)} phố ${ngauNhien(['Lê Duẩn', 'Trần Phú', 'Kim Mã', 'Láng Hạ', 'Giải Phóng'])}, Hà Nội`);

    // ── 2. Người đại diện ──
    await m.nut(d, /Thêm người đại diện/).click();
    const dd = m.popup('Thêm người đại diện tham gia tố tụng');
    await dd.waitFor({ timeout: 15_000 });
    const nguoiDaiDien = await m.nhap(dd, 'Họ và tên', hoTen());
    await m.ngay(dd, 'Ngày sinh', ngaySinh());
    await m.chon(dd, 'Giới tính', ngauNhien(['Nam', 'Nữ']));
    await m.nhap(dd, 'Số định danh cá nhân/CCCD', '0' + soNgauNhien(11));
    await m.nhap(dd, 'Chức vụ tại pháp nhân', 'Giám đốc');
    await m.nut(dd, 'Lưu').click();
    await dd.waitFor({ state: 'hidden', timeout: 15_000 });
    await expect(d.getByText(nguoiDaiDien).first(), 'Người đại diện chưa vào bảng').toBeVisible({ timeout: 10_000 });

    // ── 3. Thông tin tố tụng (mục thu gọn → mở nếu chưa thấy ô) ──
    await moMucForm(d, '3. Thông tin tố tụng', m.oTheoNhan('Thời điểm phạm tội', d));
    await m.ngay(d, 'Thời điểm phạm tội', ngay(-10));
    await m.chon(d, 'Địa bàn phạm tội', 'Nông thôn');
    await m.nhap(d, 'Tính chất và mức độ thiệt hại', 'Gây thiệt hại về tài sản và ảnh hưởng trật tự quản lý kinh tế');

    // ── 4. Điều luật áp dụng cho pháp nhân ──
    await moMucForm(d, '4. Điều luật áp dụng', m.nut(d, /Thêm điều luật áp dụng/));
    const dieuLuat = await themDieuLuat(m, d, can('toiDanh', 1));

    await m.nut(d, 'Lưu').click();
    await m.choThongBao(/Lưu thành công/);
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await expect(muc.locator('.ant-table-row').filter({ hasText: tenPhapNhan }).first(), 'Pháp nhân chưa vào bảng bị can').toBeVisible({ timeout: 15_000 });
    return { dsPhapNhan: [...daCo.slice(0, lan - 1), { ten: tenPhapNhan, maSoThue, nguoiDaiDien, dieuLuat }] };
  },
};

/** Mở mục thu gọn "N. …" trong popup bị can, nếu `dauHieu` (một ô bên trong mục) chưa hiện */
async function moMucForm(d: Locator, tieuDe: string, dauHieu: Locator) {
  if (await dauHieu.isVisible().catch(() => false)) return;
  const so = tieuDe.split('.')[0];
  const ten = tieuDe.slice(so.length + 1).trim();
  await d.locator('div').filter({ hasText: new RegExp(`^\\s*${so}\\.\\s*${ten}`) }).last().click();
  await dauHieu.waitFor({ timeout: 10_000 });
}

/**
 * Popup "Chọn điều luật áp dụng": gõ số điều (lấy từ tội danh ở hồ sơ, vd. "Điều 192 - Sản xuất…") →
 * bấm tên tội danh → tích "Khoản 1" (không có thì khoản đầu tiên) → "Thêm vào danh sách".
 * @returns vd. "Khoản 1 Điều 192 - Sản xuất, buôn bán hàng giả"
 */
async function themDieuLuat(m: ManHinh, d: Locator, toiDanh: string): Promise<string> {
  const dieu = toiDanh.match(/Điều\s+(\d+\w*)/)?.[1] ?? '';
  const tenToiDanh = toiDanh.replace(/^\s*Điều\s+\S+\s*-\s*/, '').trim();
  await m.nut(d, /Thêm điều luật áp dụng/).click();
  const p = m.popup('Chọn điều luật áp dụng');
  await p.waitFor({ timeout: 15_000 });
  await p.getByPlaceholder('Tìm theo số điều hoặc tên tội danh').fill(dieu);
  await m.page.waitForTimeout(1200);
  await p.getByText(dungChu(tenToiDanh)).first().click();
  const cacKhoan = p.locator('label.ant-checkbox-wrapper').filter({ hasText: /^\s*Khoản\s+\d+/ });
  await cacKhoan.first().waitFor({ timeout: 10_000 });
  const khoan1 = cacKhoan.filter({ hasText: dungChu('Khoản 1') }).first();
  const khoan = (await khoan1.count()) ? khoan1 : cacKhoan.first();
  const tenKhoan = (await khoan.innerText()).trim();
  if (!(await khoan.locator('input').isChecked())) await khoan.click();
  await m.nut(p, /Thêm vào danh sách/).click();
  await m.choThongBao(/Đã thêm/);
  // Popup thường tự đóng; còn mở thì bấm X
  if (!(await p.waitFor({ state: 'hidden', timeout: 3_000 }).then(() => true).catch(() => false))) {
    await p.locator('.ant-modal-close').first().click().catch(() => undefined);
  }
  return `${tenKhoan} Điều ${dieu} - ${tenToiDanh}`;
}

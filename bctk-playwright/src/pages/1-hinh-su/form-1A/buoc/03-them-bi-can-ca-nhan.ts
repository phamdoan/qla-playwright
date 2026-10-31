import { Locator, expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { TrangThai1A, VuNguon, cauHinh1A, dsBiCan } from '../cau-hinh-1A';
import { hoTen, ngay } from '../../../../utils/fake-data';
import { moVuAn, ngauNhien, ngaySinh, soNgauNhien } from './chung';

const NHAN_THAN = ['Nhân thân tốt', 'Chưa có tiền án, tiền sự', 'Có nhân thân tốt, chấp hành tốt chính sách pháp luật tại địa phương'];
const NOI_O = ['Lê Duẩn', 'Trần Phú', 'Kim Mã', 'Láng Hạ', 'Giải Phóng', 'Nguyễn Trãi', 'Minh Khai'];

/**
 * BƯỚC 03 · Thêm bị can là cá nhân (hướng dẫn bước 3)
 *
 *  1. Mở chi tiết vụ án → tab "Thụ lý" → mục "Bị can/Bị cáo" → "Tạo mới" → popup "Thêm mới bị can"
 *  2. Mục "1. Thông tin bị can": Đối tượng phạm tội "Cá nhân" · Bị can đầu vụ "Không" · Trẻ vị thành niên "Không"
 *     · Trạng thái công dân "Còn sống" · Tên bị can, Ngày sinh, Số định danh (12 số),
 *     Giới tính — ngẫu nhiên · Dân tộc "Kinh" · Tôn giáo, Nghề nghiệp, Trình độ văn hóa ngẫu nhiên
 *     · Đảng viên / Công chức, viên chức / Nghiện ma túy "Không" · Nơi sinh, Tỉnh "Thành phố Hà Nội", Phường/Xã, Nơi ở hiện tại
 *  3. Mục 2, 3 (giấy tờ, quan hệ gia đình) bỏ qua
 *  4. Mục "4. Thông tin tố tụng": Thời điểm phạm tội = 10 ngày trước · Địa bàn "Nông thôn" · Tiền án, Tiền sự "Không" · Nhân thân
 *  5. Mục "5. Điều luật áp dụng cho bị can" → "+ Chọn tội danh" → tìm theo số điều của tội danh ở hồ sơ
 *     → chọn tội danh → tích "Khoản 1" → "Thêm vào danh sách"
 *  6. "Lưu" → "Lưu thành công"
 *
 * Lặp BCTK_SO_BI_CAN_1A lượt (mỗi lượt một bị can). Bị can đầu vụ đã có sẵn: hồ sơ (bước 01) tự tạo từ ô "Tên bị can (Đầu vụ)"
 * → bị can thêm ở đây là "Không" đầu vụ, tên khác (trùng tên đầu vụ thì bản án có hai bị cáo cùng tên — 1A Vụ 01, 30/10).
 */
export const buoc03: Buoc<VuNguon, TrangThai1A> = {
  so: 3,
  ten: 'Thêm bị can cá nhân (thông tin bị can, thông tin tố tụng, điều luật)',
  huongDan: '3',
  soLan: cauHinh1A.soBiCan,
  chay: async ({ vuAn, tt, lan, moPhien, tkToa, can }) => {
    const daCo = dsBiCan(tt);
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 2));
    await m.moTab('thu-ly');
    const muc = await m.moMuc('Bị can/Bị cáo');
    await m.choBang(muc);
    // Lượt này đã thêm bị can rồi (vd. state cũ) → không thêm lại
    const cu = daCo[lan - 1];
    if (cu && (await muc.locator('.ant-table-row').filter({ hasText: cu.ten }).count())) return { dsBiCan: daCo };

    await m.nut(muc, /^\s*(Tạo mới|Thêm mới)\s*$/).click();
    const d = m.popup('Thêm mới bị can');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    // ── 1. Thông tin bị can ──
    if ((await m.docGiaTri('Đối tượng phạm tội', d)) !== 'Cá nhân') await m.chon(d, 'Đối tượng phạm tội', 'Cá nhân');
    await m.oTheoNhan('Tên bị can', d).waitFor({ timeout: 15_000 });
    await m.radio(d, 'Bị can đầu vụ', 'Không');
    await m.radio(d, 'Trẻ vị thành niên', 'Không');
    await m.radio(d, 'Trạng thái công dân', 'Còn sống');
    const tenDauVu = tt.tenBiCanHoSo;
    let tenMoi = hoTen();
    while (tenMoi === tenDauVu) tenMoi = hoTen();
    const ten = await m.nhap(d, 'Tên bị can', tenMoi);
    const sinh = ngaySinh();
    await nhapNgay(m.oTheoNhan('Ngày tháng năm sinh', d).locator('input').first(), sinh);
    const cccd = await m.nhap(d, 'Số định danh cá nhân', '0' + soNgauNhien(11));
    await m.chon(d, 'Giới tính', ngauNhien(['Nam', 'Nữ']));
    if (!(await m.docGiaTri('Quốc tịch', d))) await m.chon(d, 'Quốc tịch', 'Việt Nam');
    await m.chon(d, 'Dân tộc', 'Kinh');
    for (const nhan of ['Tôn giáo', 'Nghề nghiệp', 'Trình độ văn hóa']) await m.chon(d, nhan);
    for (const nhan of ['Đảng viên', 'Công chức, viên chức', 'Nghiện ma túy']) await m.radio(d, nhan, 'Không');
    await m.nhap(d, 'Nơi sinh', 'Hà Nội');
    await m.chon(d, 'Tỉnh/Thành phố', 'Thành phố Hà Nội');
    await m.page.waitForTimeout(800);
    await m.chon(d, 'Phường/Xã');
    if (!(await m.docGiaTri('Quốc gia', d))) await m.chon(d, 'Quốc gia', 'Việt Nam');
    await m.nhap(d, 'Nơi ở hiện tại', `Số ${1 + Math.floor(Math.random() * 200)} phố ${ngauNhien(NOI_O)}, Hà Nội`);

    // ── 4. Thông tin tố tụng (mục thu gọn → mở nếu chưa thấy ô) ──
    await moMucForm(d, '4. Thông tin tố tụng', m.oTheoNhan('Thời điểm phạm tội', d));
    await m.ngay(d, 'Thời điểm phạm tội', ngay(-10));
    await m.chon(d, 'Địa bàn phạm tội', 'Nông thôn');
    await m.nhap(d, 'Tiền án', 'Không');
    await m.nhap(d, 'Tiền sự', 'Không');
    const nhanThan = m.oTheoNhan(/^\s*Nhân thân/, d).locator('textarea').first();
    if (!(await nhanThan.inputValue())) await nhanThan.fill(ngauNhien(NHAN_THAN));

    // ── 5. Điều luật áp dụng cho bị can ──
    await moMucForm(d, '5. Điều luật áp dụng', m.nut(d, /Chọn tội danh/));
    const dieuLuat = await themDieuLuat(m, d, can('toiDanh', 1));

    await m.nut(d, /^\s*Lưu\s*$/).click();
    await m.choThongBao(/Lưu thành công/);
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await expect(muc.locator('.ant-table-row').filter({ hasText: ten }).first(), 'Bị can chưa vào bảng bị can').toBeVisible({ timeout: 15_000 });
    return { dsBiCan: [...daCo.slice(0, lan - 1), { ten, ngaySinh: sinh, cccd, dieuLuat }] };
  },
};

/** Ô ngày sinh là ô chữ có mặt nạ ("dd/mm/yyyy hoặc yyyy") → gõ; mặt nạ bỏ chữ khi fill cả chuỗi thì gõ từng phím */
async function nhapNgay(o: Locator, ddmmyyyy: string) {
  await o.click();
  await o.fill(ddmmyyyy);
  if ((await o.inputValue()) !== ddmmyyyy) {
    await o.fill('');
    await o.pressSequentially(ddmmyyyy, { delay: 50 });
  }
  await o.press('Tab');
  await expect(o, `Ô ngày sinh không nhận ${ddmmyyyy}`).toHaveValue(ddmmyyyy, { timeout: 5_000 });
}

/** Mở mục thu gọn "N. …" trong popup bị can, nếu `dauHieu` (một ô bên trong mục) chưa hiện */
async function moMucForm(d: Locator, tieuDe: string, dauHieu: Locator) {
  if (await dauHieu.isVisible().catch(() => false)) return;
  const so = tieuDe.split('.')[0];
  const ten = tieuDe.slice(so.length + 1).trim();
  await d.locator('div').filter({ hasText: new RegExp(`^\\s*${so}\\.\\s*${ten}`) }).last().click();
  await dauHieu.waitFor({ timeout: 10_000 });
}

/**
 * "+ Chọn tội danh" → popup chọn điều luật: gõ số điều (lấy từ tội danh ở hồ sơ, vd. "Điều 173 - Trộm cắp tài sản") →
 * bấm tên tội danh → tích "Khoản 1" (không có thì khoản đầu tiên) → "Thêm vào danh sách".
 * @returns vd. "Khoản 1 Điều 173 - Trộm cắp tài sản"
 */
async function themDieuLuat(m: ManHinh, d: Locator, toiDanh: string): Promise<string> {
  const dieu = toiDanh.match(/Điều\s+(\d+\w*)/)?.[1] ?? '';
  const tenToiDanh = toiDanh.replace(/^\s*Điều\s+\S+\s*-\s*/, '').trim();
  await m.nut(d, /Chọn tội danh/).click();
  const p = m.popup(/Chọn (điều luật|tội danh)/);
  await p.waitFor({ timeout: 15_000 });
  await p.getByPlaceholder(/Tìm theo số điều/).fill(dieu);
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

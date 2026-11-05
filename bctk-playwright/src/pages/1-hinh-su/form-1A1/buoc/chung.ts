import { Frame, Locator, Page, expect } from '@playwright/test';
import { ManHinh, dungChu } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';
import { TrangThai1A1, cauHinh1A1, dsBaoChua, dsPhapNhan } from '../cau-hinh-1A1';
import { luuDongKetQua } from '../../../../utils/file-helper';
import { TaiKhoan, chuanHoa, vksCuaToa } from '../../../../utils/tai-khoan';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 1A1.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

export const ngauNhien = <T>(ds: T[]) => ds[Math.floor(Math.random() * ds.length)];
export const soNgauNhien = (doDai: number) =>
  String(1 + Math.floor(Math.random() * 9)) + Array.from({ length: doDai - 1 }, () => Math.floor(Math.random() * 10)).join('');
/** Ngày sinh dd/mm/yyyy, năm trong khoảng 1965–2000 */
export const ngaySinh = () =>
  `${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}/${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${1965 + Math.floor(Math.random() * 36)}`;

/**
 * [Bước 03–07] Mở chi tiết vụ án theo link (bước 02 để lại) và chờ trang vẽ xong.
 * Trang trống / 404 / bị đẩy sang trang khác → mở Dashboard rồi vào lại link (PhienDangNhap.vaoCho).
 */
export async function moVuAn(phien: PhienDangNhap, urlVuAn: string): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  await phien.vaoCho(urlVuAn, m.page.locator('[role=tab][id$="-tab-thu-ly"]'));
  await m.choTaiXong(1500);
  return m;
}

/** Dòng chữ đầu trang chi tiết: "Mã vụ án: VA26-… · Số thụ lý: 78 · Ngày thụ lý: …" */
export async function dauTrangVuAn(m: ManHinh): Promise<string> {
  return (await m.page.locator('main').innerText()).match(/Mã vụ án:[^\n]*/)?.[0] ?? '';
}

/**
 * Làm `hanhDong` (vd. bấm nút chuyển trang) rồi chờ trang tới URL khớp `mau`; trả về URL đó, quá `timeout` thì null.
 * Nghe cả các lần chuyển trang thoáng qua: app có lúc mở đúng trang rồi đẩy tiếp sang 404 (1A1 Vụ 02 bước 02, 29/10)
 * → vẫn lấy được URL (có id) để vào lại bằng PhienDangNhap.vaoCho.
 */
export async function batUrl(page: Page, mau: RegExp, hanhDong: () => Promise<unknown>, timeout = 60_000): Promise<string | null> {
  let thay: string | null = null;
  const nghe = (f: Frame) => {
    if (!thay && f === page.mainFrame() && mau.test(f.url())) thay = f.url();
  };
  page.on('framenavigated', nghe);
  try {
    await hanhDong();
    const het = Date.now() + timeout;
    // Đã rơi vào 404 mà chưa từng qua URL đích thì thôi chờ (app không tự quay lại)
    while (!thay && Date.now() < het && !/exception\/404/.test(page.url())) await page.waitForTimeout(500);
    return thay;
  } finally {
    page.off('framenavigated', nghe);
  }
}

/**
 * Ô "Thêm người tham gia tố tụng" là form tự viết (không phải form antd): nhãn là thẻ <label>,
 * ô là input/select thường. Lấy ô `chon` nằm cùng khối với nhãn bắt đầu bằng `nhan`
 * (khối sâu nhất chứa cả nhãn lẫn một ô `chon`). `chon` phải khớp được ô của CHÍNH trường đó: lọc theo placeholder
 * mà trường đổi placeholder thì khối khớp là cả hàng → lấy nhầm ô của trường bên cạnh (Ngày sinh → ô Ngày cấp, 29/10).
 */
export function oNtg(d: Locator, nhan: string | RegExp, chon: string): Locator {
  const mau = typeof nhan === 'string' ? new RegExp(`^\\s*${nhan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : nhan;
  return d.locator('div').filter({ has: d.page().locator('label', { hasText: mau }) }).filter({ has: d.page().locator(chon) }).last().locator(chon).first();
}

/**
 * Ô ngày của form người tham gia tố tụng: placeholder mỗi ô một kiểu ("mm/dd/yyyy", "dd/mm/yyyy hoặc yyyy")
 * nhưng đều nhận dd/mm/yyyy (gõ mm/dd thì Enter xong ô trống) → gõ dd/mm/yyyy rồi Enter, kiểm lại giá trị.
 * Ô có mặt nạ nhập bỏ chữ khi fill cả chuỗi → xóa, gõ từng phím rồi Tab.
 */
export async function ngayNtg(o: Locator, ddmmyyyy: string) {
  await o.click();
  await o.fill(ddmmyyyy);
  await o.press('Enter');
  await o.page().waitForTimeout(300);
  if ((await o.inputValue()) !== ddmmyyyy) {
    await o.fill('');
    await o.pressSequentially(ddmmyyyy, { delay: 50 });
    await o.press('Tab');
  }
  await expect(o, `Ô ngày không nhận ${ddmmyyyy}`).toHaveValue(ddmmyyyy, { timeout: 5_000 });
}

/**
 * Chọn trong select antd rồi KIỂM ô đã nhận đúng mục; chưa nhận thì bấm lại theo title của mục.
 * (Ô "Viện kiểm sát" khi thụ lý: lần bấm đầu có lúc không ăn dù dropdown đã đóng.)
 */
export async function chonChac(m: ManHinh, item: Locator, giaTri: string) {
  await m.chonTrong(item, giaTri);
  const daChon = item.locator('.ant-select-selection-item');
  if ((await daChon.allInnerTexts()).some(t => t.includes(giaTri))) return;
  await item.locator('.ant-select-selector').first().click();
  await m.page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${giaTri}"]`).first().click();
  await expect(daChon.first(), `Chưa chọn được "${giaTri}"`).toContainText(giaTri, { timeout: 5_000 });
}

/**
 * Ô "Viện kiểm sát" theo tòa của tài khoản — không ghi cứng tên:
 * ưu tiên VKS cùng địa bàn ("Tòa án nhân dân X" → "Viện kiểm sát nhân dân X"); danh sách không có thì lấy mục đầu tiên
 * (danh sách chỉ gồm các VKS tòa đang đăng nhập được chọn, vd. tòa thành phố Hà Nội chỉ có VKSND thành phố Hà Nội).
 * @returns tên VKS đã chọn
 */
export async function chonVienKiemSat(m: ManHinh, item: Locator, toaAn: string): Promise<string> {
  const muon = chuanHoa(vksCuaToa(toaAn));
  let ds: string[] = [];
  for (let i = 0; i < 3 && !ds.length; i++) ds = (await m.cacLuaChonTrong(item)).filter(Boolean);
  const vks = ds.find(t => chuanHoa(t) === muon) ?? ds.find(t => chuanHoa(t).includes(muon)) ?? ds[0];
  if (!vks) throw new Error('Ô "Viện kiểm sát" không có mục nào để chọn');
  await chonChac(m, item, vks);
  return vks;
}

/**
 * [Bước 06, 07] Tab "Phân công" › "Phân công" › `menu` → popup quyết định:
 *   Vai trò `vaiTro` → chọn ngẫu nhiên người được phân công → mũi tên thêm vào bảng
 *   → "Dùng số" → "Lưu" → "Ký logic" → "Đóng".
 * Lượt trước đã có quyết định cho vai trò này thì không tạo lại, chỉ đọc số và người được phân công.
 * @returns số quyết định và tên người được phân công
 */
export async function phanCongVaKy(m: ManHinh, menu: string, vaiTro: string, loaiTru?: RegExp) {
  await m.moTab('phan-cong');
  const muc = await m.moMuc('Danh sách quyết định phân công');
  await m.choBang(muc);
  let dongQD = muc.locator('.ant-table-row').filter({ hasText: vaiTro });
  if (loaiTru) dongQD = dongQD.filter({ hasNotText: loaiTru });
  if (await dongQD.count()) {
    return { soQD: await m.docCot(dongQD.first(), 'Số QĐ'), nguoi: await m.docCot(dongQD.first(), 'Người được phân công') };
  }

  await m.nut(muc, 'Phân công').click();
  await m.page.locator('.ant-dropdown:visible [role=menuitem]').filter({ hasText: dungChu(menu) }).first().click();
  const bm = m.popup(menu);
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong();

  await m.chon(bm, 'Vai trò', vaiTro);
  await m.page.waitForTimeout(500);
  const nguoi = (await m.chon(bm, 'Tên người được phân công')).split(' - ')[0].trim();
  await bm.locator('button:has(.anticon-arrow-down)').first().click();
  await bm.locator('tbody tr').filter({ hasText: nguoi }).first().waitFor({ timeout: 15_000 });

  // Nút link "Dùng số <số gợi ý>" dưới ô "Số quyết định" → bấm để điền số
  const oSo = m.oTheoNhan('Số quyết định', bm).locator('input').first();
  await m.nut(bm, /Dùng số/).click();
  await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số quyết định" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
  const soQD = await oSo.inputValue();

  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/Lưu quyết định thành công/);
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  return { soQD, nguoi };
}

/**
 * [Bước 07, 09] Ghi kết quả vụ vào output/1-hinh-su/output-ma-vu-an-form-1A1.xlsx — một sheet, MỖI VỤ MỘT DÒNG (khóa "Mã vụ án"):
 * bước 07 ghi dòng (cột bản án để trống), bước 09 cập nhật chính dòng đó. Tòa án, tài khoản tạo luôn ở cuối.
 * Nhiều pháp nhân / người bào chữa nối bằng " ; ".
 */
export async function luuKetQua1A1(tk: TaiKhoan, tt: TrangThai1A1) {
  const pn = dsPhapNhan(tt);
  const noi = (ds: string[]) => ds.join(' ; ');
  await luuDongKetQua(
    cauHinh1A1.linhVuc,
    cauHinh1A1.bieuMau,
    tk,
    ['Mã vụ án', 'Mã hồ sơ', 'Pháp nhân thương mại', 'Mã số thuế', 'Người đại diện', 'Tội danh', 'Điều luật áp dụng', 'Người bào chữa',
      'Số thụ lý', 'Ngày thụ lý', 'Thẩm phán chủ tọa', 'Số QĐ phân công TP', 'Hội thẩm nhân dân', 'Số QĐ phân công HT',
      'Số QĐ đưa vụ án ra xét xử', 'Ngày xét xử', 'Số bản án', 'Ngày bản án', 'Link vụ án'],
    [tt.maVuAnHeThong ?? '', tt.maHoSo ?? '', noi(pn.map(p => p.ten)), noi(pn.map(p => p.maSoThue)), noi(pn.map(p => p.nguoiDaiDien)),
      tt.toiDanh ?? '', noi(pn.map(p => p.dieuLuat)), noi(dsBaoChua(tt).map(b => b.ten)),
      tt.soThuLy ?? '', tt.ngayThuLy ?? '', tt.thamPhanChuToa ?? '', tt.soQDThamPhan ?? '', tt.hoiTham ?? '', tt.soQDHoiTham ?? '',
      tt.soQDXetXu ?? '', tt.ngayXetXu ?? '', tt.soBanAn ?? '', tt.ngayBanAn ?? '', tt.urlVuAn ?? ''],
    'Mã vụ án',
  );
}

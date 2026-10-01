/**
 * LỊCH XÉT XỬ — phần dùng chung cho mọi phân hệ.
 *
 * Form "Thêm lịch xét xử (mở phiên tòa)" giống nhau ở dân sự/KDTM (mở từ trong biểu mẫu 47DS qua
 * nút "Chọn lịch xét xử") và hình sự (mở thẳng từ tab Xét xử qua nút "Mở phiên tòa"). Mọi cái bẫy
 * dưới đây đo được trong hai ngày 30/09–01/10/2026 ở luồng KDTM; viết lại từ đầu cho hình sự thì
 * chắc chắn dẫm lại đúng từng cái.
 */
import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, dienCapO, dienOTheoNhan, go, hienTrong, moTaForm, nghi, nguyenNhanLoi, oTheoNhan } from './antd';
import { xacNhanHopThoai } from './bieu-mau';

type GhiChu = (khoa: string, giaTri: string) => void;

/**
 * Đặt một ô giờ của RangePicker "Giờ xét xử" bằng cách CHỌN TRONG PANEL.
 *
 * Ô được trỏ bằng TÊN TRỢ NĂNG thật trên màn ("* Giờ xét xử" cho ô bắt đầu, "Kết thúc" cho ô sau —
 * đọc từ cây trợ năng ngày 30/09/2026), không quét `.ant-picker input`: quét ra 5 ô lẫn cả ô ngày,
 * chọn nhầm thì click rơi vào lớp khác.
 *
 * Bốn cách ĐÃ THẤT BẠI: `fill` ("Giá trị sau khi nhập không đúng"), gõ + Escape (đóng cả modal),
 * gõ + Tab (antd hoàn tác về 00:00), gõ + Enter (đọc lại vẫn 00:00).
 *
 * Panel hay đóng ngay sau khi mở (dropdown của ô ngày vừa đóng làm cả cụm trượt → click báo
 * "element is not stable" rồi "not visible"), nên phải THỬ LẠI và chỉ tin khi đọc lại đúng giá trị.
 */
export async function datGioTrongPanel(page: Page, o: Locator, muon: string, nhan: string): Promise<string> {
  const [gio, phut] = muon.split(':');
  let cuoi = '';
  for (let lan = 0; lan < 3; lan++) {
    await expect(o, `Form lịch xét xử không có ô "${nhan}"`).toBeVisible({ timeout: 15_000 });
    await o.click({ timeout: 10_000 }).catch(() => {});
    const panel = page
      .locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')
      .filter({ has: page.locator('.ant-picker-time-panel-column') })
      .last();
    if (!(await hienTrong(panel, 10_000))) continue;
    await nghi(page, 500, 800); // panel còn trượt thì click bị từ chối vì "not stable"

    const cot = panel.locator('.ant-picker-time-panel-column');
    if ((await cot.count()) >= 2) {
      const xong = await cot
        .nth(0)
        .locator('li')
        .filter({ hasText: new RegExp(`^${gio}$`) })
        .first()
        .click({ timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!xong) continue;
      await cot
        .nth(1)
        .locator('li')
        .filter({ hasText: new RegExp(`^${phut}$`) })
        .first()
        .click({ timeout: 8_000 })
        .catch(() => {});
    }
    const nutOk = panel.getByRole('button', { name: /^OK$/i }).first();
    if (await hienTrong(nutOk, 2_000)) await nutOk.click().catch(() => {});

    cuoi = (await o.inputValue().catch(() => '')).trim();
    if (cuoi === muon) return cuoi;
  }
  throw new Error(`Không đặt được "${nhan}" = ${muon} — ô đang là "${cuoi || '(không đọc được)'}"`);
}

export interface ThamSoLich {
  /** dd/mm/yyyy — đặt cho cả ô bắt đầu và ô kết thúc */
  ngay: string;
  gioBatDau: string;
  gioKetThuc: string;
  tinhChatPhienToa: string;
  hinhThucXetXu?: string;
  /** Rỗng = lấy mục đầu danh mục phòng của đơn vị (mỗi tòa một danh mục khác nhau) */
  diaDiem?: string;
  diaDiemChiTiet?: string;
  chuToa?: string;
  thuKy?: string;
}

/**
 * Điền và LƯU form "Thêm lịch xét xử (mở phiên tòa)" đang mở.
 *
 * @returns ngày xét xử thực sự nằm trong ô sau khi điền (bằng chứng, không phải giá trị gieo)
 */
export async function dienFormLichXetXu(
  page: Page,
  formLich: Locator,
  ghi: GhiChu,
  nhan: string,
  ts: ThamSoLich,
): Promise<string> {
  /**
   * PHẢI GHI ĐÈ ngày: form mở ra đã có sẵn một giá trị và nó có thể rơi vào tháng kế. Không ghi đè
   * thì mỗi lượt chạy trôi thêm một tháng: 30/09 → 01/12/2026 → 01/01/2027 (đo 01/10/2026).
   */
  const dsNgay = await dienCapO(page, formLich, /Ngày xét xử/i, [ts.ngay, ts.ngay], true);
  if (dsNgay.length) ghi(nhan, `ngày xét xử: ${dsNgay.join(' → ')}`);

  // Chỉ tick "Cả ngày" thì hệ thống vẫn báo "Thời gian kết thúc phải lớn hơn thời gian bắt đầu"
  const dsGio = [
    await datGioTrongPanel(
      page,
      formLich.getByRole('textbox', { name: /Giờ xét xử/ }).first(),
      ts.gioBatDau,
      'Giờ xét xử (bắt đầu)',
    ),
    await datGioTrongPanel(
      page,
      formLich.getByRole('textbox', { name: /^Kết thúc$/ }).first(),
      ts.gioKetThuc,
      'Giờ xét xử (kết thúc)',
    ),
  ];
  ghi(nhan, `giờ xét xử: ${dsGio.join(' → ')}`);

  for (const [ten, giaTri] of [
    [/Hình thức xét xử/i, ts.hinhThucXetXu],
    [/Tính chất phiên tòa/i, ts.tinhChatPhienToa],
    [/Chủ tọa phiên tòa/i, ts.chuToa],
    [/Thư ký phiên tòa/i, ts.thuKy],
  ] as [RegExp, string | undefined][]) {
    if (giaTri === undefined && !/Chủ tọa|Thư ký/.test(String(ten))) continue;
    const gt = await dienOTheoNhan(page, formLich, ten, giaTri).catch((e: Error) => {
      ghi(nhan, `không điền được ${String(ten)}: ${e.message.slice(0, 90)}`);
      return '';
    });
    if (gt) ghi(nhan, `${String(ten)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * "Địa điểm xét xử" (thông báo lỗi gọi là "Phòng xét xử") — DANH MỤC THEO ĐƠN VỊ: TANDTC có
   * "Phòng xét xử 102 (PXX102)", Tòa khu vực 9 - Hà Nội chỉ có đúng một mục. Ưu tiên giá trị gieo,
   * không có thì lùi về mục đầu — vẫn tất định, và ghi rõ đã lấy gì.
   */
  let diaDiem = await dienOTheoNhan(page, formLich, /Địa điểm xét xử/i, ts.diaDiem).catch(() => '');
  if (!diaDiem) {
    diaDiem = await dienOTheoNhan(page, formLich, /Địa điểm xét xử/i).catch(() => '');
    ghi(nhan, `đơn vị không có "${ts.diaDiem}" → lấy mục đầu danh mục: ${diaDiem}`);
  } else {
    ghi(nhan, `địa điểm xét xử = ${diaDiem}`);
  }
  await choHetSpin(page);

  // Chọn "Phòng xử lưu động" thì màn ĐẺ THÊM ô bắt buộc "Địa điểm xét xử (chi tiết)"
  const oChiTiet = oTheoNhan(page, formLich, /Địa điểm xét xử \(chi tiết\)/i);
  if ((await hienTrong(oChiTiet, 2_000)) && ts.diaDiemChiTiet) {
    await go(oChiTiet, ts.diaDiemChiTiet);
    ghi(nhan, `địa điểm xét xử (chi tiết) = ${ts.diaDiemChiTiet}`);
  }

  // ⚠ "Tạo mới" CHÍNH LÀ NÚT LƯU của form này, không phải nút mở form mới
  const nutTaoLich = formLich.getByRole('button', { name: /^Tạo mới$/ }).first();
  await expect(nutTaoLich, 'Form lịch xét xử không có nút "Tạo mới"').toBeVisible({ timeout: 15_000 });
  await nutTaoLich.click();

  /**
   * Hệ thống hỏi xác nhận NHIỀU LẦN NỐI TIẾP, mỗi kiểu trùng một hộp ("trùng phòng xét xử…",
   * "trùng thành viên hội đồng xét xử…"). Đây là cảnh báo, nhưng bỏ sót một hộp thì lịch KHÔNG lưu
   * mà cũng KHÔNG báo lỗi gì. PHẢI CHỜ hộp hiện rồi mới kiểm — hỏi `count()` ngay sau cú bấm thì
   * hộp chưa render và vòng lặp thoát luôn (đo 01/10/2026 ở 66-DS).
   */
  const tieuDeHoi = page.locator('.ant-modal-confirm-title:visible');
  for (let lan = 0; lan < 4; lan++) {
    if (!(await hienTrong(tieuDeHoi.first(), lan === 0 ? 8_000 : 2_000))) break;
    const cauHoi = (await tieuDeHoi.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    await xacNhanHopThoai(page);
    await choHetSpin(page);
    if (cauHoi) ghi(nhan, `đã xác nhận cảnh báo: ${cauHoi}`);
    await nghi(page, 500, 800);
  }
  await choHetSpin(page);

  /**
   * Lưu được thì form lịch ĐÓNG. Neo theo ĐÚNG TIÊU ĐỀ modal lịch: "lớp đang mở ngoài cùng" trỏ
   * ngay sang lớp bên dưới khi modal lịch đã đóng, và báo nhầm là chưa đóng (đo 30/09/2026).
   */
  const modalLich = page
    .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
    .filter({ hasText: /Thêm lịch xét xử/ });
  const daDong = await modalLich
    .first()
    .waitFor({ state: 'hidden', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!daDong && (await modalLich.count())) {
    for (const d of await moTaForm(modalLich.first())) ghi(`${nhan} · sau khi lưu`, d);
    throw new Error(
      `Bấm "Tạo mới" nhưng form lịch xét xử không đóng — ${await nguyenNhanLoi(page, modalLich.first())}`,
    );
  }
  ghi(nhan, 'đã lưu lịch xét xử (form đã đóng)');
  return dsNgay[0] || ts.ngay;
}

/**
 * FLOW HÌNH SỰ 001 · BƯỚC 03–04 — phân công Thẩm phán / Hội thẩm / Thư ký (PHẦN B Step2).
 *
 * Cùng một hình: tab "Phân công" → dropdown "Phân công" → chọn loại → biểu mẫu 001 (thẩm phán,
 * hội thẩm) hoặc 002 (thư ký) → chọn người → ĐƯA VÀO BẢNG bằng nút mũi tên → Lưu → Lấy số →
 * Ký logic → Đóng. Nên viết MỘT hàm, ba lần gọi.
 *
 * Hai chỗ dễ báo xanh giả, cả hai đều đã cắn ở luồng KDTM:
 *   · chọn người trong Select mà quên bấm mũi tên → bảng rỗng, biểu mẫu vẫn lưu được.
 *   · "Ký logic" không hiện vì "Người ký" khác tài khoản đang chạy → văn bản treo "Chờ ký".
 * Nên bước này đếm dòng trong bảng trước khi Lưu, và lấy số quyết định làm bằng chứng.
 */
import { Locator, Page, expect } from '@playwright/test';
import { batLoiApi, choHetSpin, chonSelectTheoThuTu, dienOTheoNhan, hienTrong, moTaForm, nghi, nguyenNhanLoi, oTheoNhan } from '../../../common/antd';
import {
  bieuMauDangMo,
  chonMucDropdown,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moKhoi,
  moTabVaCho,
  nutTheoChu,

} from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/** Nút mũi tên "đưa người đã chọn vào bảng" — chỉ có icon, không có chữ */
function nutDuaVaoBang(bm: Locator): Locator {
  return bm
    .locator(
      'button:has(.anticon-arrow-down), button:has(.anticon-plus), button:has(img[aria-label*="arrow"]), button:has(img[aria-label="plus"])',
    )
    .first();
}

/** Số dòng của bảng người được phân công trong biểu mẫu */
const soDongBang = (bm: Locator) => bm.locator('.ant-table-tbody tr.ant-table-row').count();

async function dsNut(khung: Locator): Promise<string> {
  const ds = (await khung.getByRole('button').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(ds)].slice(0, 20).join(' | ') || '(không có)';
}

/**
 * Một lượt phân công.
 *
 * @param mucMenu   mục trong dropdown "Phân công", vd. /Phân công Thẩm phán/
 * @param vaiTro    giá trị ô "Vai trò"
 * @param soNguoi   số người cần đưa vào bảng (hội thẩm = 2)
 * @param tenNguoi  tên người được phân công; `undefined` = lấy mục đầu danh mục
 */
async function motLuotPhanCong(
  page: Page,
  ghi: GhiChu,
  ten: string,
  mucMenu: RegExp,
  nguoiKy: string,
  vaiTro: string,
  soNguoi: number,
  tenNguoi?: string,
): Promise<string> {
  // Khối chứa nút "Phân công" đóng sẵn → antd không render nội dung bên trong
  await moKhoi(page, /Danh sách quyết định phân công/, ghi);

  const nutPhanCong = page
    .getByRole('button', { name: /^Phân công$/ })
    .or(page.locator('button').filter({ hasText: /^Phân công$/ }))
    .first();
  await expect(nutPhanCong, `Tab Phân công không có nút/dropdown "Phân công" (${ten})`).toBeVisible({
    timeout: 30_000,
  });
  await nutPhanCong.click();
  await chonMucDropdown(page, mucMenu, 'Phân công');

  const bm = bieuMauDangMo(page);
  await expect(bm, `Không mở được biểu mẫu ${ten}`).toBeVisible({ timeout: 30_000 });
  if (process.env.QLA_SOI === '1') for (const d of await moTaForm(bm)) ghi(`${ten} · ô`, d);
  ghi(`${ten} · nút`, await dsNut(bm));

  /**
   * "Người ký/người phân công" được nạp sẵn một người (thường Phó Chánh án) → PHẢI GHI ĐÈ về tài
   * khoản đang chạy, không thì nút ký là "Trình ký" và quyết định treo "Chờ ký" (đã làm kẹt bước
   * 15–20 của luồng KDTM).
   */
  for (const [nhan, giaTri, ghiDe] of [
    [/Người ký|Người phân công/i, nguoiKy, true],
    [/Vai trò/i, vaiTro, false],
  ] as [RegExp, string, boolean][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri, ghiDe).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi(ten, `không điền được ${String(nhan)}: ${e.message.slice(0, 120)}`);
      return '';
    });
    if (gt) ghi(ten, `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * Chọn người rồi ĐƯA VÀO BẢNG; mỗi vòng kiểm bảng có thêm đúng một dòng.
   *
   * Phải TRỪ những người đã chọn: danh mục người tiến hành tố tụng KHÔNG tự loại người đã phân
   * công, mà ô Select thì giữ nguyên giá trị cũ — nên lượt thứ hai chọn lại đúng người đó và hệ
   * thống từ chối thêm dòng trùng. Đo 01/10/2026 ở phân công Hội thẩm (cần 2 người): lượt 2 lại ra
   * "Đào Huy Dương" rồi báo "bấm mũi tên nhưng bảng không thêm dòng".
   */
  const daChon: string[] = [];
  for (let i = 0; i < soNguoi; i++) {
    const truoc = await soDongBang(bm);
    const oNguoi = oTheoNhan(page, bm, /Tên người được phân công|Người được phân công/i);
    const nguoi = tenNguoi
      ? await dienOTheoNhan(page, bm, /Tên người được phân công|Người được phân công/i, tenNguoi)
      : await chonSelectTheoThuTu(page, oNguoi, 0, daChon);
    daChon.push(nguoi);
    const nut = nutDuaVaoBang(bm);
    if (!(await hienTrong(nut, 10_000))) {
      throw new Error(
        `${ten}: chọn "${nguoi}" nhưng không thấy nút mũi tên để đưa vào bảng. Nút đang có: ${await dsNut(bm)}`,
      );
    }
    await nut.click();
    await choHetSpin(page);
    await expect
      .poll(() => soDongBang(bm), {
        message: `${ten}: bấm mũi tên nhưng bảng không thêm dòng cho "${nguoi}"`,
        timeout: 20_000,
        intervals: [1000],
      })
      .toBeGreaterThan(truoc);
    ghi(ten, `đã đưa vào bảng: ${nguoi}`);
  }

  const loiApi = batLoiApi(page);
  if (!(await luuBieuMau(page, bm, ten, ghi))) {
    throw new Error(`${ten}: không thấy nút "Lưu". Nút đang có: ${await dsNut(bm)}`);
  }

  /**
   * LƯU XONG PHẢI CÓ "Lấy số". Không có nghĩa là lưu THẤT BẠI — và nó thất bại im lặng: không
   * toast, không cờ lỗi ô nào, nút vẫn chỉ "Lưu | Đóng" (đo 01/10/2026 trên STG, trong khi cùng
   * mã này chạy được trên UAT). Dừng ngay tại đây kèm lỗi API, thay vì đi tiếp rồi báo chung chung
   * "không đọc được số quyết định".
   */
  const nutLaySo = nutTheoChu(bm, /Lấy số$/);
  if (!(await hienTrong(nutLaySo, 15_000))) {
    const oLoi = (await moTaForm(bm)).filter(d => d.includes('⚠')).slice(0, 10);
    throw new Error(
      `${ten}: bấm "Lưu" nhưng biểu mẫu không chuyển sang trạng thái đã lưu (không có nút "Lấy số").\n  ` +
        `Nút đang có: ${await dsNut(bm)}\n  Ô còn lỗi: ${oLoi.join(' · ') || '(không ô nào gắn cờ lỗi)'}\n  ` +
        `${await nguyenNhanLoi(page, bm, 20_000)}\n  ${loiApi()}`,
    );
  }
  await laySoVaKyLogic(page, bm, ghi, ten);

  /**
   * Đọc số qua NHÃN, không qua `soCuaBieuMau` (hàm đó cần `idBieuMau` — mã biểu mẫu hình sự chưa
   * tra được, và đoán sai id thì trả về chuỗi rỗng mà không báo lỗi gì).
   */
  const so = (await oTheoNhan(page, bm, /^Số quyết định/).inputValue().catch(() => '')).trim();
  if (!so) {
    throw new Error(
      `${ten}: đã lưu và ký nhưng không đọc được số quyết định — ${await nguyenNhanLoi(page, bm, 30_000)}`,
    );
  }
  ghi(ten, `số quyết định ${so}`);
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  return so;
}

/** Bước 03 — phân công Thẩm phán chủ tọa (mẫu 001) */
export async function phanCongThamPhan(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTabVaCho(page, 'Phân công', ghi, /Danh sách quyết định phân công|người tiến hành tố tụng|hội đồng xét xử/i);
  const soQuyetDinhPhanCongTP = await motLuotPhanCong(
    page,
    ghi,
    '03 phân công thẩm phán',
    /Phân công Thẩm phán/i,
    input.nguoiKy,
    input.vaiTroThamPhanChuToa,
    1,
    input.tenThamPhan,
  );
  return { soQuyetDinhPhanCongTP };
}

/** Bước 04 — phân công Hội thẩm (2 người, mẫu 001) và Thư ký (mẫu 002) */
export async function phanCongHoiThamThuKy(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTabVaCho(page, 'Phân công', ghi, /Danh sách quyết định phân công|người tiến hành tố tụng|hội đồng xét xử/i);
  const soQuyetDinhPhanCongHT = await motLuotPhanCong(
    page,
    ghi,
    '04 phân công hội thẩm',
    /Phân công Hội thẩm/i,
    input.nguoiKy,
    input.vaiTroHoiTham,
    input.soHoiTham,
    input.tenHoiTham,
  );
  const soQuyetDinhPhanCongTK = await motLuotPhanCong(
    page,
    ghi,
    '04 phân công thư ký',
    /Phân công Thư ký/i,
    input.nguoiKy,
    input.vaiTroThuKy,
    1,
    input.tenThuKy,
  );
  return { soQuyetDinhPhanCongHT, soQuyetDinhPhanCongTK };
}

/**
 * Thao tác chung của MỌI biểu mẫu trong luồng: Lưu → Lấy số → Ký logic → Đóng.
 *
 * Gần như mỗi bước của flow đều kết thúc bằng chuỗi này (26-DS, 29-DS, 30-DS, 47-DS, 52-DS,
 * 65-DS, 75-DS…), nên tách ra một chỗ. Lấy từ `don-hanh-chinh-so-tham.spec.ts` (đã chạy được trên
 * STG/DEV, nay ở backup) và giữ nguyên hành vi, chỉ đổi phần báo lỗi sang `xacNhanLuu`.
 */
import path from 'node:path';
import { Locator, Page, Response, expect } from '@playwright/test';
import { choHetSpin, hienTrong, nghi, nguyenNhanLoi, toastDaHien, xacNhanLuu } from './antd';
import { chupAnhMoc } from './anh';

export type GhiChu = (nhan: string, mo: string) => void;

/** Bấm nút đồng ý của hộp xác nhận đang mở (nếu có) */
export async function xacNhanHopThoai(page: Page) {
  const hop = page
    .locator('.ant-modal-confirm, .ant-modal')
    .filter({ has: page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ }) })
    .last();
  if (await hienTrong(hop, 5_000)) {
    /**
     * Timeout NGẮN và nuốt lỗi. Hộp xác nhận hay tự đóng giữa lúc click (khi có nhiều hộp nối tiếp,
     * hoặc hộp vừa được xử lý xong) → Playwright báo "element was detached from the DOM, retrying"
     * rồi chờ hết 30 s. Hộp đóng rồi thì việc đã xong, không có gì phải chờ.
     * Đo 02/10/2026 ở lịch xét xử của 66-DS: bước hỏng chỉ vì cú chờ này, lịch vốn đã lưu.
     */
    await hop
      .getByRole('button', { name: /^(Đồng ý|Xác nhận|Xóa|OK)$/ })
      .last()
      .click({ timeout: 8_000 })
      .catch(() => {});
  }
}

/**
 * Ghi lại PHẢN HỒI CỦA CHÍNH CÚ LƯU — kể cả HTTP 200 kèm thân báo lỗi.
 *
 * Vì sao cần: `batLoiApi` chỉ nhận status >= 400, mà backend QLA rất hay trả 200 kèm
 * `{"code":...,"message":"..."}` khi từ chối. Khi đó `luuBieuMau` chỉ ghi được "không thấy toast
 * thành công" — một câu KHÔNG nói được vì sao, và nó xuất hiện ở CẢ biểu mẫu lưu được lẫn không lưu
 * được (đo 04/10/2026: vụ dân sự qua bước 12 và vụ HNGĐ đứng ở bước 12 in ra y hệt câu đó, nên câu
 * đó vô dụng để phân biệt). Có status + mã + lời nhắn của server thì một lượt chạy là đủ kết luận.
 *
 * Trả về hàm ĐỌC-RỒI-THÔI-NGHE: gọi đúng một lần, kể cả khi lưu thành công, để không rò listener
 * sang bước sau (mỗi bước lưu vài biểu mẫu, mỗi biểu mẫu một listener thì page nặng dần).
 */
function batPhanHoiLuu(page: Page, soLuong = 4): () => string {
  const ds: string[] = [];
  const nghe = (r: Response) => {
    const ph = r.request().method();
    if (ph !== 'POST' && ph !== 'PUT' && ph !== 'PATCH') return;
    if (ds.length >= soLuong) return;
    const duong = r.url().replace(/^https?:\/\/[^/]+/, '');
    void (async () => {
      const than = (await r.text().catch(() => '')).replace(/\s+/g, ' ').trim();
      let tom = than.slice(0, 300);
      try {
        const j = JSON.parse(than);
        /** Thân "thành công" là cả bản ghi (vài nghìn ký tự) — chỉ giữ mã + lời nhắn */
        const ma = j?.code ?? j?.status ?? j?.statusCode;
        const nhan = j?.message ?? j?.error ?? j?.errorMessage ?? j?.detail;
        if (ma !== undefined || nhan) tom = `code=${ma ?? '?'} message=${String(nhan ?? '').slice(0, 220)}`;
      } catch {
        /* không phải JSON thì giữ nguyên phần đầu thân */
      }
      ds.push(`${r.status()} ${ph} ${duong} :: ${tom}`);
    })();
  };
  page.on('response', nghe);
  return () => {
    page.off('response', nghe);
    return ds.length ? `phản hồi lưu: ${ds.join(' | ')}` : 'KHÔNG có request POST/PUT nào — nút Lưu không gửi gì đi';
  };
}

/**
 * Bấm "Lưu" của biểu mẫu nếu nút còn hiện (biểu mẫu đã lưu ở lượt trước thì không còn nút).
 *
 * LỖI VALIDATE thì HỎNG NGAY (xacNhanLuu đọc `.ant-form-item-explain-error`).
 * KHÔNG THẤY TOAST thì CHƯA KẾT LUẬN: đo 30/09/2026 với 32DS — form điền đủ, không còn lỗi đỏ, lưu
 * xong mà toast không được ghi nhận. Bằng chứng thật của một biểu mẫu là DÒNG TRONG BẢNG, nên để
 * `lapBieuMau` kiểm dòng đó phán quyết; ở đây chỉ ghi lại là không thấy toast.
 */
export async function luuBieuMau(
  page: Page,
  bm: Locator,
  ten: string,
  ghi?: GhiChu,
  /** Tên nút lưu, khi biểu mẫu không dùng chữ "Lưu" (vd. bản án sơ thẩm: "Thêm mới bản án") */
  tenNutLuu: RegExp = /^Lưu$/,
) {
  const nut = nutTheoChu(bm, tenNutLuu);
  if (!(await hienTrong(nut, 5_000))) return false;
  /**
   * ẢNH LÚC ĐANG NHẬP LIỆU — chụp NGAY TRƯỚC KHI BẤM LƯU, tức biểu mẫu đã điền đủ.
   *
   * Ảnh cuối bước (khung/luong.ts) chỉ cho thấy MÀN KẾT QUẢ sau khi đóng biểu mẫu, không thấy dữ liệu
   * nhập vào — người dùng chỉ ra 03/10/2026. Hai loại ảnh bổ cho nhau:
   *   <mã bước>-nhap-N.png  · biểu mẫu đã điền, trước khi lưu
   *   <mã bước>.png         · màn sau khi bước xong
   */
  await chupAnhMoc(page, ten);
  const docPhanHoi = batPhanHoiLuu(page);
  let daDoc = false;
  await nut.click();
  // Một số biểu mẫu mở hộp xác nhận sau khi bấm Lưu; không bấm thì bản ghi không được tạo mà cũng
  // KHÔNG có toast lỗi nào — nhìn ra ngoài chỉ thấy "bảng 0 dòng".
  await xacNhanHopThoai(page);
  try {
    await xacNhanLuu(page, bm, /thành công/i, { viec: `lưu ${ten}`, timeout: 20_000 });
  } catch (e) {
    const mo = e instanceof Error ? e.message : String(e);
    // Lỗi validate là chắc chắn hỏng — ném lại. Chỉ "không thấy báo thành công" mới bỏ qua.
    if (/form còn lỗi/.test(mo)) {
      docPhanHoi();
      throw e;
    }
    ghi?.(`lưu ${ten}`, `không thấy toast thành công — ${docPhanHoi()}`);
    daDoc = true;
  }
  if (!daDoc) ghi?.(`lưu ${ten}`, docPhanHoi());
  await choHetSpin(page);
  await nghi(page, 1200, 2000);
  return true;
}

/**
 * "Lấy số" rồi "Ký logic" cho biểu mẫu đang mở.
 *
 * Toast lỗi của cấp số không theo mẫu cố định (vd. "Cấu hình cấp số không tồn tại") nên khi chờ hết
 * giờ phải đọc lại mọi thông báo trên màn — không để lỗi trơ ra là "waitForFunction timeout".
 */
/**
 * Hộp "Nhập thông tin trình duyệt ký" — hiện ra sau khi bấm "Trình ký" (đo 30/09/2026).
 *
 * Gồm: "Người ký văn bản" (khoá, đã điền sẵn thẩm phán chủ tọa), "Mức độ ưu tiên" (Bình thường),
 * "Nội dung trình duyệt ký" và nút "Gửi". Không bấm "Gửi" thì quyết định vẫn "Chưa có hiệu lực"
 * mà màn hình KHÔNG báo lỗi gì.
 */
async function trinhDuyetKy(page: Page, ghi: GhiChu, ten: string) {
  const hop = page.locator('.ant-modal-content:visible').filter({ hasText: /thông tin trình duyệt ký/i }).first();
  if (!(await hienTrong(hop, 2_500))) return;

  const oNoiDung = hop.getByRole('textbox', { name: /Nội dung trình duyệt ký/i }).first();
  if (await hienTrong(oNoiDung, 3_000)) {
    await oNoiDung.fill(`Trình ký ${ten}`);
  }
  const nutGui = hop.getByRole('button', { name: /Gửi$/i }).first();
  if (!(await hienTrong(nutGui, 5_000))) {
    throw new Error(`Hộp "Nhập thông tin trình duyệt ký" của ${ten} không có nút "Gửi"`);
  }
  await nutGui.click();
  await choHetSpin(page);
  ghi(`ký ${ten}`, 'đã gửi trình duyệt ký');
}

/**
 * Tìm NÚT trong một khung: thử theo tên trợ năng trước, không có thì lọc theo CHỮ HIỂN THỊ.
 *
 * Vì sao cần: ở màn phúc thẩm, tên trợ năng của nút KHÁC hẳn chữ hiển thị — `getByRole('button',
 * { name })` không thấy "Lưu" dù nút ghi rõ "Lưu" (đo 01/10/2026 ở 66-DS: lớp có đúng ba nút
 * `Chọn lịch xét xử | Lưu | Đóng`). Hậu quả tai hại vì `luuBieuMau` không thấy nút thì THOÁT IM
 * LẶNG: biểu mẫu không được lưu, không lỗi, và bước sau mới vỡ ra.
 */
export function nutTheoChu(khung: Locator, ten: RegExp): Locator {
  return khung
    .getByRole('button', { name: ten })
    .or(khung.locator('button').filter({ hasText: ten }))
    .first();
}

/** Liệt kê nút đang có trên biểu mẫu — để thông báo lỗi nói được vì sao, thay vì đoán */
async function dsNut(bm: Locator): Promise<string> {
  const ds = (await bm.getByRole('button').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return ds.slice(0, 12).join(' | ') || '(không nút nào)';
}

export async function laySoVaKyLogic(page: Page, bm: Locator, ghi: GhiChu, ten: string) {
  // Ký hỏng mà màn không báo gì là chuyện thường ở hệ này — chỉ API nói được vì sao
  const { batLoiApi } = await import('./antd');
  const loiApi = batLoiApi(page);
  const nutLaySo = nutTheoChu(bm, /Lấy số$/);
  if (await hienTrong(nutLaySo, 10_000)) {
    await nutLaySo.click();
    try {
      await toastDaHien(page, /Đã cấp số thành công|thành công/i, 60_000, /Không thể cấp số|thất bại/i);
    } catch {
      throw new Error(`Lấy số ${ten} không thành công. Màn hình đang báo: ${await nguyenNhanLoi(page, bm, 120_000)}`);
    }
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
    ghi(`lấy số ${ten}`, 'đã cấp số');
  } else {
    ghi(`lấy số ${ten}`, `không thấy nút "Lấy số". Nút đang có: ${await dsNut(bm)}`);
  }

  /**
   * Hai kiểu ký: quyết định ký SỐ có nút "Ký logic"; biên bản ký GIẤY (48-DS, 51-DS) chỉ có
   * "Xác nhận đã ký" cạnh ô tải bản scan (đo 30/09/2026). Thử cả hai, nút nào hiện thì dùng.
   */
  let nutKy = nutTheoChu(bm, /Ký logic$/);
  if (!(await hienTrong(nutKy, 10_000))) {
    const nutXacNhan = nutTheoChu(bm, /Xác nhận đã ký/i);
    const nutTrinhKy = nutTheoChu(bm, /Trình ký$/i);
    if (await hienTrong(nutXacNhan, 5_000)) {
      nutKy = nutXacNhan;
      ghi(`ký ${ten}`, 'biểu mẫu ký giấy → dùng "Xác nhận đã ký"');
    } else if (await hienTrong(nutTrinhKy, 5_000)) {
      nutKy = nutTrinhKy;
      ghi(`ký ${ten}`, 'quyết định ký số → dùng "Trình ký"');
    }
  }
  /**
   * Biểu mẫu ký GIẤY: "Xác nhận đã ký" bị KHOÁ tới khi tải lên bản scan
   * ("Kéo thả hoặc bấm để chọn tệp (PDF/ảnh scan bản ký giấy)"). Gặp ở 48-DS, 51-DS (sơ thẩm) và
   * biên bản giao nhận 01-DS (phúc thẩm) — đặt ở đây để mọi luồng dùng chung, không nhân bản.
   */
  if ((await hienTrong(nutKy, 3_000)) && !(await nutKy.isEnabled().catch(() => true))) {
    const oTep = bm.locator('input[type="file"]').first();
    if (await oTep.count()) {
      await oTep.setInputFiles(path.resolve(__dirname, '../data/bien-ban-da-ky.pdf'));
      await choHetSpin(page);
      await nghi(page, 1500, 2500);
      ghi(`ký ${ten}`, `đã tải bản scan — nút bật? ${await nutKy.isEnabled().catch(() => '?')}`);
    }
  }

  if (!(await hienTrong(nutKy, 5_000))) {
    /**
     * KHÔNG được kết luận "đã ký ở lượt trước" — bản trước ghi đúng câu đó rồi đi tiếp, trong khi
     * thật ra biểu mẫu chưa ký và bước sau thiếu điều kiện (đo 30/09/2026 với 48-DS: dòng trong
     * bảng vẫn "Chưa có hiệu lực" mà sổ cái ghi như đã ký). Liệt kê nút đang có để biết vì sao.
     */
    ghi(`ký ${ten}`, `KHÔNG ký được — không thấy nút "Ký logic". Nút đang có: ${await dsNut(bm)}`);
    return;
  }
  await nutKy.click();
  await trinhDuyetKy(page, ghi, ten);
  await xacNhanHopThoai(page);
  try {
    /**
     * KHÔNG nhận mẫu "thành công" trần: toast tải tệp ("Tải lên bản biên bản đã ký thành công")
     * hiện ngay trước đó cũng khớp, và `toastDaHien` có ngó lại 5s nên sẽ báo xanh giả.
     * Biên bản ký giấy báo "Đã xác nhận biên bản đã ký" — không có chữ "thành công" (đo 30/09/2026).
     */
    await toastDaHien(
      page,
      /Ký logic thành công|Đã xác nhận biên bản|ký thành công|[Tt]rình ký|[Tt]rình duyệt ký/,
      120_000,
      /thất bại|Không thể|lỗi/i,
      30_000,
    );
  } catch {
    throw new Error(
      `Ký ${ten} không thành công.\n  Màn hình đang báo: ${await nguyenNhanLoi(page, bm, 60_000)}\n  ` +
        `Nút đang có: ${await dsNut(bm)}\n  ${loiApi()}`,
    );
  }
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi(`ký ${ten}`, 'đã ký logic');
}

/**
 * Mở lại một biểu mẫu ĐÃ LẬP NHƯNG CHƯA KÝ (dòng "Chưa có hiệu lực") rồi ký nốt.
 *
 * Cột "Thao tác" của các bảng biểu mẫu là ICON chứ không phải nút: `img "eye"` để xem,
 * `img "file-pdf"` để tải (đo 30/09/2026) — `getByRole('button')` trên dòng trả về 0.
 *
 * Vì sao cần: lượt chạy hỏng giữa chừng để lại biểu mẫu chưa ký; chạy lại mà chỉ bỏ qua vì
 * "đã có" thì luồng kẹt vĩnh viễn — quyết định chưa có hiệu lực thì bước sau không mở ra.
 */
export async function moLaiVaKy(page: Page, dong: Locator, ghi: GhiChu, ten: string) {
  const mat = dong.getByRole('img', { name: 'eye' }).first();
  if (!(await hienTrong(mat, 5_000))) {
    const nhan = (await dong.getByRole('img').evaluateAll(ds => ds.map(el => el.getAttribute('aria-label')))).join(
      ' | ',
    );
    throw new Error(`Dòng ${ten} không có icon "eye" để mở lại. Icon đang có: ${nhan || '(không có)'}`);
  }
  /**
   * `force` sau khi cuộn: ô `<td class="ant-table-cell">` của bảng nằm đè lên icon nên click thường
   * bị "intercepts pointer events" rồi hết 30 s (đo 02/10/2026 ở bảng bản án phúc thẩm).
   */
  await mat.scrollIntoViewIfNeeded().catch(() => {});
  await mat.click({ force: true });
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  if (!(await bm.isVisible().catch(() => false))) {
    throw new Error(`Không mở lại được ${ten} để ký — bấm icon xem nhưng không có biểu mẫu nào mở ra`);
  }
  await laySoVaKyLogic(page, bm, ghi, ten);
  await dongBieuMau(page, bm);
  await choHetSpin(page);
}

/** Biểu mẫu đang mở (drawer hoặc modal) */
export const bieuMauDangMo = (page: Page) =>
  page.locator('.ant-drawer-content:visible, .ant-modal-content:visible').last();

/** Đóng biểu mẫu đang mở; không có nút Đóng thì bỏ qua */
export async function dongBieuMau(page: Page, bm: Locator) {
  await bm.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => {});
  await choHetSpin(page);
}

/** Đọc số của biểu mẫu (ô `#<idBieuMau>_so`) — bằng chứng để ghi vào CaseState */
export async function soCuaBieuMau(bm: Locator, idBieuMau: string): Promise<string> {
  return (await bm.locator(`#${idBieuMau}_so`).inputValue().catch(() => '')).trim();
}

/**
 * Chọn một mục trong dropdown antd vừa mở.
 *
 * KHÔNG dùng `page.getByRole('menuitem', …)`: menu bên trái của app cũng là role=menuitem, nên khi
 * dropdown chưa mở thì locator rơi vào sidebar và báo "đang có: Tổng quan | Trang chủ | …".
 * Chỉ tìm trong `.ant-dropdown` đang hiện; không có mục khớp thì liệt kê đúng mục của dropdown đó.
 */
export async function chonMucDropdown(page: Page, ten: RegExp, viec = 'menu') {
  const muc = page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item');
  await expect(muc.first(), `Bấm "${viec}" nhưng dropdown không mở`).toBeVisible({ timeout: 15_000 });
  const chon = muc.filter({ hasText: ten }).first();
  if (!(await hienTrong(chon, 5_000))) {
    const ds = (await muc.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Escape');
    throw new Error(`Dropdown "${viec}" không có mục khớp ${ten}. Đang có: ${ds.join(' | ') || '(rỗng)'}`);
  }
  await chon.click();
  await choHetSpin(page);
}

/**
 * Điền "Số" và "Ngày quyết định" khi biểu mẫu KHÔNG cấp số tự động.
 *
 * Nhiều biểu mẫu của luồng có `laySoTuDong=false` (BE trả): chân biểu mẫu không có nút "Lấy số",
 * mà "Ký logic" lại báo "Văn bản chưa cấp số, cần lấy số trước khi ký số" rồi chờ hết giờ.
 * Đo 30/09/2026 với 26-DS và 10-VDS. Số sinh TẤT ĐỊNH từ rootCaseKey để chạy lại ra cùng giá trị.
 */
export async function dienSoVaNgayNeuCan(
  page: Page,
  bm: Locator,
  rootCaseKey: string,
  ten: string,
  ghi: GhiChu,
) {
  const { soTatDinh } = await import('../khung/so-tat-dinh');
  const { ddmmyyyy } = await import('./du-lieu');
  const { chonNgay, go, oTheoNhan } = await import('./antd');

  const oSo = oTheoNhan(page, bm, /^Số (quyết định|thông báo|biên bản)?/i);
  if ((await oSo.isEditable().catch(() => false)) && !(await oSo.inputValue().catch(() => ''))) {
    const so = soTatDinh(rootCaseKey, `so-${ten}`, 6);
    await go(oSo, so);
    ghi(`số ${ten} (tự nhập)`, so);
  }
  const oNgay = oTheoNhan(page, bm, /^Ngày (quyết định|ban hành|lập)?/i);
  if ((await oNgay.isEditable().catch(() => false)) && !(await oNgay.inputValue().catch(() => ''))) {
    await chonNgay(oNgay, ddmmyyyy(new Date()));
  }
}

/**
 * Thêm một biểu mẫu từ cặp "Chọn loại biểu mẫu" + nút "Thêm biểu mẫu"/"Thêm mới quyết định"
 * (mẫu dùng ở tab Chuẩn bị xét xử và Xét xử). Không có mục khớp thì liệt kê danh sách đang có.
 */
export async function themBieuMauTuDanhSach(
  page: Page,
  khung: Locator,
  /**
   * CHUỖI tìm kiếm, vd. '47-DS'. Phải là chuỗi: ô là Select có tìm kiếm, `chonSelect` GÕ giá trị này
   * để lọc. Truyền RegExp rồi ép sang chuỗi thì nó gõ đúng chữ "/47-DS/i" → không khớp gì, và danh
   * sách hiện ra chỉ là trang đầu CHƯA LỌC (đo 30/09/2026 — làm tôi kết luận nhầm là màn không có
   * biểu mẫu đó).
   */
  maBieuMau: string,
  tenNut: RegExp = /Thêm (biểu mẫu|mới quyết định|quyết định)/i,
): Promise<Locator> {
  const { chonSelect, choHetSpin } = await import('./antd');
  const oChon = khung.locator('[role="combobox"]').first();
  await expect(oChon, 'Khối không có ô "Chọn loại biểu mẫu"').toBeVisible({ timeout: 30_000 });
  await chonSelect(page, oChon, maBieuMau);

  const nut = khung.getByRole('button', { name: tenNut }).first();
  await expect(nut, `Khối không có nút khớp ${tenNut}`).toBeVisible({ timeout: 15_000 });
  await nut.click();
  await choHetSpin(page);
  return bieuMauDangMo(page);
}

/**
 * Mở một tab của màn chi tiết theo TÊN HIỂN THỊ.
 *
 * Không đoán khoá `?tab=`: cùng một vụ án có nhiều màn chi tiết, mỗi màn một bộ khoá tab. Mở
 * `?tab=chuan-bi-xet-xu` trên màn không có khoá đó thì ra TRANG TRẮNG (đo 30/09/2026 ở route
 * `vu-an/dan-su/so-tham/chi-tiet`). Tài liệu Tester cũng ghi thao tác là "Ấn vào tab …".
 */
/** Thoát ký tự đặc biệt để ghép chuỗi vào biểu thức chính quy */
const thoat = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function moTab(page: Page, ten: string | RegExp) {
  const { choHetSpin, nghi } = await import('./antd');

  /**
   * TÊN CHÍNH XÁC trước, khớp chuỗi con sau.
   *
   * Vì sao: màn chi tiết vụ án sơ thẩm có cả "Chuẩn bị xét xử" và "Xét xử". Khớp chuỗi con rồi
   * `.first()` thì `moTab(page, 'Xét xử')` luôn bấm vào "Chuẩn bị xét xử" — trang vẫn đổi nội
   * dung nên nhìn như chạy đúng, mà bước sau lại báo "tab không có khối …" (đo 30/09/2026; chính
   * nó làm tôi kết luận nhầm là màn thiếu khối "Quyết định của Hội đồng xét xử").
   */
  const timTab = () => {
    const chinhXac =
      typeof ten === 'string' ? page.getByRole('tab', { name: ten, exact: true }).first() : null;
    const tab = page.getByRole('tab', { name: ten }).first();
    const tabPhu = page
      .locator('.ant-tabs-tab, [role="tab"]')
      .filter({ hasText: typeof ten === 'string' ? new RegExp(`^\\s*${thoat(ten)}\\s*$`) : ten })
      .first();
    return { chinhXac, tab, tabPhu };
  };

  /**
   * STG thỉnh thoảng trả TRANG TRẮNG: HTTP 200, menu trái vẽ xong nhưng vùng nội dung không nạp
   * (đo 30/09/2026, hai lượt). Không phải lỗi selector — tải lại một lần là qua. Bộ bắt 5xx của
   * khung không nhận ra loại này vì mã trả về vẫn là 200.
   */
  for (let lan = 0; lan < 3; lan++) {
    await choHetSpin(page);
    const { chinhXac, tab, tabPhu } = timTab();
    /**
     * PHẢI CHỜ RỒI MỚI CHỌN. Bản trước hỏi `count()` ngay khi vừa hết spinner: lúc đó dải tab
     * chưa render nên mọi ứng viên đều bằng 0 và code rơi thẳng về nhánh khớp chuỗi con — tức là
     * `moTab(page,'Xét xử')` vẫn bấm "Chuẩn bị xét xử" dù đã có nhánh khớp chính xác
     * (đo 30/09/2026).
     */
    const ungVien = [chinhXac, tabPhu, tab].filter(Boolean) as Locator[];
    // Lần đầu chờ ngắn để còn kịp tải lại khi gặp trang trắng, lần cuối chờ dài
    const hanChot = lan === 2 ? 60_000 : 15_000;
    let muc = ungVien[ungVien.length - 1];
    let hien = false;
    for (const [i, uv] of ungVien.entries()) {
      // Ứng viên sau chỉ cần liếc nhanh: tới lượt nó thì dải tab đã render rồi
      const cho = i === 0 ? hanChot : 2_000;
      if (await uv.waitFor({ state: 'visible', timeout: cho }).then(() => true).catch(() => false)) {
        muc = uv;
        hien = true;
        break;
      }
    }

    if (hien) {
      // PHẢI BẤM, không chỉ kiểm tra. Bản trước chỉ `expect(...).toBeVisible()` ở nhánh cuối nên
      // trang vẫn nằm ở tab mặc định và bước sau báo "khối không có ô …" (đo 30/09/2026).
      if ((await muc.getAttribute('aria-selected')) !== 'true') {
        await muc.click();
        await choHetSpin(page);
        await nghi(page, 600, 1000);
      }
      return;
    }
    if (lan < 2) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await nghi(page, 1500, 2500);
    }
  }

  /**
   * LIỆT KÊ TAB ĐANG CÓ trong thông báo lỗi. Không có nó thì hai nguyên nhân rất khác nhau trông y
   * hệt: (1) màn trả về TRANG TRẮNG — danh sách tab rỗng; (2) tab ĐỔI TÊN — danh sách có tab nhưng
   * tên khác. Lần trước phải mở trình duyệt tay mới phân biệt được (đo 03/10/2026, bước 14).
   */
  const dsTab = (await page.locator('.ant-tabs-tab, [role="tab"]').allInnerTexts().catch(() => []))
    .map(t => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const chuMan = (await page.locator('main, body').first().innerText().catch(() => ''))
    .replace(/\s+/g, ' ')
    .trim();
  // Trang 404 của SPA trông y hệt "trang trắng" với mọi selector → gọi đúng tên nó
  if (/Không tìm thấy trang/i.test(chuMan)) {
    throw new Error(
      `Màn hình đang là TRANG 404 "Rất tiếc! Không tìm thấy trang!" nên không có tab "${ten}". ` +
        `Không phải lỗi selector: route không dựng được màn (hay gặp khi chunk JS của màn tải lỗi). ` +
        `URL: ${page.url()}`,
    );
  }
  throw new Error(
    `Màn hình không có tab "${ten}" sau 3 lần thử (đã tải lại 2 lần). ` +
      (dsTab.length
        ? `Tab đang có trên màn (${dsTab.length}): ${dsTab.join(' | ')} → nhiều khả năng tab ĐỔI TÊN.`
        : `KHÔNG có tab nào trên màn → vùng nội dung không nạp (lỗi tải trang của máy chủ), không phải ` +
          `lỗi kịch bản; chữ trên màn: "${chuMan.slice(0, 200) || '(trống)'}".`) +
      ` URL: ${page.url()}`,
  );
}

/**
 * Mở tab rồi CHỜ NỘI DUNG panel nạp; panel rỗng thì tải lại trang và mở lại.
 *
 * Vì sao cần: hệ này hay trả tab đã chọn mà `tabpanel` rỗng — không nút, không ô. Lúc đó mọi
 * locator đều "không tìm thấy" và lỗi in ra nghe như sai selector. Đo 01/10/2026: tab "Phân công"
 * của vụ án hình sự `[selected]` nhưng panel trống, báo "Tab Phân công không có nút Phân công".
 */
export async function moTabVaCho(
  page: Page,
  tenTab: string | RegExp,
  ghi?: GhiChu,
  /**
   * Chữ đặc trưng của tab, để biết panel ĐÃ nạp. Cần vì nội dung tab nằm NGOÀI `[role="tabpanel"]`
   * (thẻ đó rỗng), và khối "Thông tin chung của vụ án" hiện ở mọi tab — nên "trang có nút" không
   * phân biệt được tab đã nạp hay chưa (đo 01/10/2026: báo panel rỗng 3 lần trong khi màn đầy dữ liệu).
   */
  dauHieu?: RegExp,
) {
  const { choHetSpin, nghi } = await import('./antd');
  for (let lan = 0; lan < 3; lan++) {
    await moTab(page, tenTab);
    await choHetSpin(page);
    const moc = dauHieu
      ? page.getByText(dauHieu).first()
      : page.locator('.ant-collapse-item, .ant-card, .ant-table').first();
    const coND = await moc
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (coND) return;
    ghi?.(`tab ${String(tenTab)}`, `panel rỗng (lần ${lan + 1}) → tải lại trang`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    await nghi(page, 2000, 3000);
  }
  throw new Error(`Mở tab "${String(tenTab)}" nhưng panel không nạp nội dung sau 3 lần tải lại`);
}

/**
 * Mở một khối thu gọn (antd collapse) theo tiêu đề.
 *
 * Khối đang thu gọn thì antd KHÔNG render nội dung: mọi nút/ô bên trong đều "không tìm thấy" và
 * lỗi nghe như sai selector. Nhận biết bằng icon: `plus-square` = đang đóng, `minus-square` = đã mở.
 * Đo 01/10/2026: tab Phân công của vụ án hình sự có hai khối đóng sẵn
 * ("Danh sách quyết định phân công", "Thành phần hội đồng xét xử") nên không thấy nút "Phân công".
 */
export async function moKhoi(page: Page, tieuDe: RegExp, ghi?: GhiChu) {
  const { choHetSpin, nghi, hienTrong } = await import('./antd');
  /**
   * Header khối là `<button>` mang TÊN TRỢ NĂNG gồm cả icon, vd. "plus-square Danh sách quyết định
   * phân công". `filter({ hasText })` trên `button` không khớp khi chữ nằm trong phần tử con được
   * tính vào accessible name nhưng không phải text node của button (đo 01/10/2026) — nên thử cả
   * `getByRole` theo tên trợ năng.
   */
  const dong = page
    .getByRole('button', { name: tieuDe })
    .or(page.locator('button').filter({ hasText: tieuDe }))
    .first();
  if (!(await hienTrong(dong, 20_000))) {
    const ds = (await page.getByRole('button').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    ghi?.('mở khối', `không thấy khối ${String(tieuDe)}. Nút đang có: ${[...new Set(ds)].slice(0, 20).join(' | ')}`);
    return false;
  }
  const dangDong = await dong.locator('img[aria-label="plus-square"], .anticon-plus-square').count();
  if (dangDong) {
    await dong.click();
    await choHetSpin(page);
    await nghi(page, 800, 1200);
    ghi?.('mở khối', `đã mở "${String(tieuDe)}"`);
  }
  return true;
}

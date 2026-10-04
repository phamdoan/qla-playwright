/**
 * DÒ (CHỈ ĐỌC): vì sao form bản án báo "0 yêu cầu của đương sự" với án HNGĐ / Lao động.
 *
 *   QLA_MA_VU=VA26-005506,VA26-005369 npm run ds:do-yeu-cau
 *
 * Vì sao cần: hai case HNGĐ (`bacb-022`) và Lao động (`bacb-030`) đi xanh 11/23 rồi DỪNG ở bước 12
 * (lập bản án sơ thẩm 52-DS) với ghi chú:
 *
 *     · bản án: kết quả "Chấp nhận toàn bộ" cho 0 yêu cầu của đương sự
 *     · lưu bản án sơ thẩm (52-DS): không thấy toast thành công
 *
 * Form bản án BẮT BUỘC chọn "Kết quả giải quyết" cho TẤT CẢ yêu cầu; không có yêu cầu nào thì không
 * lưu được. Mà bước 01 có thêm yêu cầu VÀ có kiểm nó vào danh sách (`tao-don.flow.ts` b7), nên yêu
 * cầu tồn tại trên ĐƠN — chỗ mất là khi sang VỤ ÁN.
 *
 * PHÉP ĐO MẠNH NHẤT LÀ SO SÁNH: cùng một luồng, cùng bộ bước, một vụ dân sự ĐÃ QUA b12 và một vụ
 * HNGĐ ĐỨNG Ở b12. Khai cả hai mã vụ, spec in cùng một khối cho từng vụ rồi để chỗ khác nhau tự hiện.
 *
 * Mặc định so `VA26-005506` (HNGĐ, b12 đỏ) với `VA26-005369` (dân sự, b12 PASSED).
 * ⚠ Chỉ đọc: không bấm Sửa, không lưu, không tạo bản án.
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';

const CAT = (s: unknown, n = 140) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

test('dò · yêu cầu của đương sự: vụ HNGĐ so với vụ dân sự đã qua bước 12', async ({ browser }, testInfo) => {
  testInfo.setTimeout(30 * 60_000);
  /**
   * Khai theo cặp `mã=id`: id lấy từ CaseState của chính case đã chạy, nên không phải đi tìm vụ trên
   * lưới (lưới là nơi 96% lỗi của bộ này nằm — tránh được thì tránh).
   *
   * Mặc định: VA26-005506 (HNGĐ, b12 đỏ) so với VA26-005369 (dân sự, b12 PASSED).
   */
  const dsVu = (
    process.env.QLA_VU ||
    'VA26-005506=2446f89f-3859-47ac-bac3-b3107fa986ec,VA26-005369=9e14f05b-4da8-4d88-a1e2-8ec7dd06f314'
  )
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(x => {
      const [ma, id] = x.split('=');
      return { ma, id };
    });
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAnDanSu');

  for (const maVu of dsMaVu) {
    console.log(`\n${'═'.repeat(78)}\n═ VỤ ${maVu}\n${'═'.repeat(78)}`);

    const id = await timVuTheoMa(page, maVu).catch(() => '');
    if (!id) {
      console.log('  ⚠ không tìm được vụ này trên màn hồ sơ sơ thẩm — bỏ qua');
      continue;
    }

    // Tab "Xét xử" là nơi form bản án đọc danh sách yêu cầu của đương sự
    for (const tab of ['thong-tin-chung', 'xet-xu']) {
      await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${id}&tab=${tab}`, { waitUntil: 'domcontentloaded' });
      await choHetSpin(page);
      await nghi(page, 1800, 2600);
      console.log(`\n── tab ${tab}`);

      /** Bảng/khối nào nói về yêu cầu của đương sự */
      const khoi = page
        .locator('.ant-card, .ant-collapse-item, .ant-table-wrapper')
        .filter({ hasText: /Yêu cầu|yêu cầu khởi kiện|Kết quả giải quyết/i });
      const n = await khoi.count();
      if (!n) {
        console.log('   (không có khối nào nhắc "Yêu cầu" / "Kết quả giải quyết")');
        continue;
      }
      for (let i = 0; i < Math.min(n, 4); i++) {
        const k = khoi.nth(i);
        if (!(await hienTrong(k, 2_000))) continue;
        const tieuDe = CAT(
          await k.locator('.ant-card-head-title, .ant-collapse-header').first().innerText().catch(() => ''),
          60,
        );
        const dong = k.locator('.ant-table-row');
        const sd = await dong.count();
        console.log(`   · khối "${tieuDe || '(không tiêu đề)'}" — ${sd} dòng`);
        for (let j = 0; j < Math.min(sd, 6); j++) {
          console.log(`       ${CAT(await dong.nth(j).innerText().catch(() => ''))}`);
        }
        if (!sd) {
          // Không có bảng thì in chữ của khối — có thể là danh sách dạng thẻ
          console.log(`       ${CAT(await k.innerText().catch(() => ''), 220)}`);
        }
      }
    }
  }

  console.log(
    `\n${'═'.repeat(78)}\nCÁCH ĐỌC: so hai vụ ở CÙNG tab, CÙNG khối. Vụ dân sự có dòng yêu cầu mà vụ\n` +
      'HNGĐ không có → yêu cầu không được chuyển từ đơn sang vụ với loại đơn này, và đó là chỗ\n' +
      'phải sửa ở bước gieo (bước 01) hoặc ở bước thụ lý (bước 06), KHÔNG phải ở bước 12.\n' +
      '⚠ Spec này chỉ đọc.\n',
  );
});

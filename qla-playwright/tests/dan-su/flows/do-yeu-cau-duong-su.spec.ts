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

  for (const { ma: maVu, id } of dsVu) {
    console.log(`\n${'═'.repeat(78)}\n═ VỤ ${maVu}  (id ${id})\n${'═'.repeat(78)}`);
    if (!id) {
      console.log('  ⚠ thiếu id — khai dạng mã=id, bỏ qua');
      continue;
    }

    // Tab "Xét xử" là nơi form bản án đọc danh sách yêu cầu của đương sự
    for (const tab of ['thong-tin-chung', 'xet-xu']) {
      /**
       * VÀO TRANG RỒI TẢI LẠI, và chờ tới khi trang THẬT SỰ DỰNG XONG.
       *
       * `goto` thẳng vào URL chi tiết trả về VỎ RỖNG: đo 04/10/2026, URL đúng nhưng trang có
       * 0 bảng · 0 card · 0 khối gập và không tiêu đề — trên CẢ HAI vụ, kể cả vụ đã qua bước 12.
       * Không phải 404, chỉ là SPA chưa nạp nội dung. Khung chạy luồng có sẵn cơ chế nhận 404 và thử
       * lại; spec dò viết tay thì không, nên ba lượt dò trước đọc vỏ rỗng mà tưởng là "thiếu khối".
       *
       * Chờ theo DẤU HIỆU TRANG ĐÃ DỰNG (có ít nhất một card/bảng/khối gập), không chờ theo thời gian.
       */
      for (let lan = 0; lan < 3; lan++) {
        await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${id}&tab=${tab}`, { waitUntil: 'domcontentloaded' });
        await choHetSpin(page);
        await nghi(page, 2000, 3000);
        const dungXong = await page
          .locator('.ant-card, .ant-table-wrapper, .ant-collapse-item')
          .first()
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => true)
          .catch(() => false);
        if (dungXong) break;
        console.log(`   (lần ${lan + 1}: trang còn rỗng, tải lại)`);
      }
      /**
       * CHỨNG MINH ĐÃ VÀO ĐÚNG TRANG trước khi kết luận gì.
       *
       * Ba lượt dò trước đều báo "không có khối nào" cho CẢ HAI vụ — kể cả vụ dân sự ĐÃ QUA bước 12 —
       * và mỗi trang chỉ mất ~4 s, quá nhanh cho trang có dữ liệu. Một phép đo không chứng minh được
       * nó đo đúng trang thì vô giá trị: "không thấy khối" và "không vào được trang" trông y như nhau.
       */
      console.log(`\n── tab ${tab}`);
      console.log(`   URL thật  : ${page.url()}`);
      const tieuDe = [
        ...new Set(
          (await page.locator('h1, h2, h3, .ant-tabs-tab-active').allInnerTexts().catch(() => []))
            .map(t => CAT(t, 46))
            .filter(Boolean),
        ),
      ];
      console.log(`   tiêu đề   : ${tieuDe.join(' | ') || '(không có)'}`);
      console.log(
        `   trên trang: ${await page.locator('.ant-table-wrapper').count()} bảng · ` +
          `${await page.locator('.ant-card').count()} card · ` +
          `${await page.locator('.ant-collapse-item').count()} khối gập`,
      );
      const than = await page.locator('body').innerText().catch(() => '');
      if (/Không tìm thấy trang|Rất tiếc/i.test(than)) {
        console.log('   ⚠ TRANG 404 — không vào được chi tiết vụ; mọi kết luận bên dưới vô nghĩa');
        continue;
      }

      /** Bảng/khối nào nói về yêu cầu của đương sự */
      const khoi = page
        .locator('.ant-card, .ant-collapse-item, .ant-table-wrapper')
        /**
         * LỌC THEO "BẢN ÁN SƠ THẨM", không theo "Yêu cầu".
         *
         * Lượt dò đầu lọc /Yêu cầu|Kết quả giải quyết/ và báo "không có khối nào" cho CẢ HAI vụ — kể
         * cả vụ dân sự đã qua bước 12. Tức phép đo sai chỗ, không phải vụ thiếu dữ liệu: danh sách
         * yêu cầu nằm TRONG form bản án, không nằm trên tab vụ án.
         *
         * Câu hỏi thật là: bảng "Bản án sơ thẩm" của vụ HNGĐ có dòng nào không. Bước 12 đỏ với
         * "Lập bản án xong nhưng bảng Bản án sơ thẩm vẫn không có dòng nào", mà ảnh trang lại hiện
         * mục "Bản án sơ thẩm" kèm hai mốc thời gian — nên có thể bảng CÓ dòng mà phép kiểm không thấy.
         */
        .filter({ hasText: /Bản án sơ thẩm|Các lần mở phiên tòa|Quyết định của Hội đồng xét xử/i });
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

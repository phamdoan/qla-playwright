/**
 * Sinh PDF đơn đề nghị GĐT GIẢ LẬP cho kịch bản e2e-gdt-1410 (môi trường đào tạo).
 * Không dùng các PDF trong data/: đó là bản quét hồ sơ thật (có CCCD, số điện thoại).
 *
 *   node tools/tao-pdf-don-gdt-1410.js  →  fixtures/don-gdt-1410-gia-lap.pdf
 *   Đơn theo bản án khác: đặt QLA_1410_SO / NGAY / TOA / CAP và người làm đơn QLA_1410_NGUOI / NAM_SINH / DIA_CHI
 *   / TU_CACH, tệp ra QLA_1410_TEP (mặc định fixtures/don-gdt-<số>-<ngày>.pdf).
 */
const path = require('path');
const { chromium } = require('@playwright/test');

const e = process.env;
const SO = e.QLA_1410_SO || '824';
const NGAY = e.QLA_1410_NGAY || '02/10/2026';
const TOA = e.QLA_1410_TOA || 'Tòa Phúc thẩm Tòa án nhân dân tối cao tại Hà Nội';
const CAP = (e.QLA_1410_CAP || 'Phúc thẩm').toLowerCase();
const NGUOI = e.QLA_1410_NGUOI || 'Trần Văn Khải';
const NAM_SINH = e.QLA_1410_NAM_SINH || '1975';
const DIA_CHI = e.QLA_1410_DIA_CHI || 'Số 18, ngõ 72, phố Thái Hà, phường Đống Đa, thành phố Hà Nội';
const TU_CACH = e.QLA_1410_TU_CACH || 'người có quyền lợi liên quan đến vụ án';
const RA = path.resolve(
  __dirname,
  '..',
  e.QLA_1410_TEP || (e.QLA_1410_SO ? `fixtures/don-gdt-${SO.replace(/[^\w-]+/g, '_')}-${NGAY.replace(/\//g, '')}.pdf` : 'fixtures/don-gdt-1410-gia-lap.pdf'),
);
const homNay = new Date();
const NGAY_DON = `ngày ${homNay.getDate()} tháng ${homNay.getMonth() + 1} năm ${homNay.getFullYear()}`;
const BA = `Bản án ${CAP} số ${SO} ngày ${NGAY}`;
const LA_TB_VPPL = /^Thông báo phát hiện vi phạm/.test(e.QLA_1410_HINH_THUC || '');

const HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.5;margin:0}
.c{text-align:center}.b{font-weight:bold}.i{font-style:italic}.r{text-align:right}
p{margin:4pt 0;text-align:justify}.gl{border:1px solid #999;padding:4pt;font-size:10pt;color:#666;text-align:center}
</style></head><body>
<div class="gl">TÀI LIỆU GIẢ LẬP PHỤC VỤ KIỂM THỬ TỰ ĐỘNG — KHÔNG CÓ GIÁ TRỊ PHÁP LÝ</div>
<p class="c b">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br><u>Độc lập - Tự do - Hạnh phúc</u></p>
<p class="r i">Hà Nội, ${NGAY_DON}</p>
<p class="c b">${LA_TB_VPPL ? 'THÔNG BÁO<br>PHÁT HIỆN VI PHẠM PHÁP LUẬT TRONG BẢN ÁN ĐÃ CÓ HIỆU LỰC PHÁP LUẬT' : 'ĐƠN ĐỀ NGHỊ<br>XEM XÉT THEO THỦ TỤC GIÁM ĐỐC THẨM'}</p>
<p class="c i">Đối với ${BA}<br>của ${TOA}</p>
<p><span class="i">Kính gửi:</span> Chánh án Tòa án nhân dân tối cao.</p>
<p>Tôi tên: <b>${NGUOI}</b>, sinh năm ${NAM_SINH}.</p>
<p>Địa chỉ: ${DIA_CHI}.</p>
<p>Là ${TU_CACH} đã được giải quyết tại ${BA} của ${TOA}.</p>
<p>${LA_TB_VPPL ? 'Tôi xin thông báo: bản án' : 'Tôi cho rằng bản án'} ${CAP} nêu trên có vi phạm nghiêm trọng thủ tục tố tụng và có sai lầm nghiêm trọng
trong việc áp dụng pháp luật: Hội đồng xét xử đánh giá chứng cứ không khách quan, chưa xem xét đầy đủ các
tài liệu tôi đã cung cấp tại phiên tòa, làm ảnh hưởng đến quyền, lợi ích hợp pháp của tôi.</p>
<p>Vì vậy, tôi kính đề nghị Chánh án Tòa án nhân dân tối cao xem xét kháng nghị theo thủ tục giám đốc thẩm
đối với ${BA} của ${TOA}.</p>
<p class="b i">Tài liệu kèm theo:</p>
<p class="i">1. Bản sao ${BA}.</p>
<p class="r b" style="margin-top:24pt">${LA_TB_VPPL ? 'Người thông báo' : 'Người làm đơn'}<br><br><br>${NGUOI}</p>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(HTML, { waitUntil: 'load' });
  await page.pdf({ path: RA, format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '25mm', right: '20mm' } });
  await browser.close();
  console.log('Đã tạo', RA);
})();

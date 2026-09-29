/**
 * globalTeardown: chạy xong là cập nhật luôn báo cáo hai đợt GĐT/Tái thẩm (27-09-2026 hình sự pháp nhân
 * và 28-09-2026 KDTM + dân sự) ở seed-output/bao-cao-gdt-tt-27-09-va-28-09.<env>.<ngày>.csv, để không
 * phải nhớ chạy tay.
 *
 * Chỉ cập nhật khi sổ cái của bộ này vừa bị ghi trong lượt chạy (mtime trong 30 phút gần đây) — lượt
 * chạy luồng khác (dân sự, hành chính…) sẽ bỏ qua, không sinh báo cáo thừa.
 */
import fs from 'fs';
import path from 'path';

const DS_BO = ['gdt-tai-tham-phap-nhan-27-09-2026', 'gdt-kdtm-dan-su-28-09-2026'];

export default function baoCaoSauChay() {
  const env = process.env.QLA_ENV || 'stg';
  const thuMuc = path.resolve(__dirname, '../seed-output');
  if (!fs.existsSync(thuMuc)) return;
  const vuaGhi = fs
    .readdirSync(thuMuc)
    .filter(t => DS_BO.some(bo => t.startsWith(`${bo}.${env}.ledger`)) && t.endsWith('.json'))
    .some(t => Date.now() - fs.statSync(path.join(thuMuc, t)).mtimeMs < 30 * 60_000);
  if (!vuaGhi) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { taoBaoCao } = require('../tools/bao-cao-gdt-tt.js');
    taoBaoCao();
  } catch (e) {
    console.log('    · Không cập nhật được báo cáo:', (e as Error).message);
  }
}

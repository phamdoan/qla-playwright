/**
 * globalTeardown: chạy xong là cập nhật luôn báo cáo đợt GĐT/Tái thẩm 27-09-2026
 * (seed-output/gdt-tai-tham-phap-nhan-27-09-2026.<env>.bao-cao.<ngày>.csv) để không phải nhớ chạy tay.
 *
 * Chỉ cập nhật khi sổ cái của bộ này vừa bị ghi trong lượt chạy (mtime trong 30 phút gần đây) — lượt
 * chạy luồng khác (dân sự, hành chính…) sẽ bỏ qua, không sinh báo cáo thừa.
 */
import fs from 'fs';
import path from 'path';

const TEN_BO = 'gdt-tai-tham-phap-nhan-27-09-2026';

export default function baoCaoSauChay() {
  const env = process.env.QLA_ENV || 'stg';
  const thuMuc = path.resolve(__dirname, '../seed-output');
  if (!fs.existsSync(thuMuc)) return;
  const dau = `${TEN_BO}.${env}.ledger`;
  const vuaGhi = fs
    .readdirSync(thuMuc)
    .filter(t => t.startsWith(dau) && t.endsWith('.json'))
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

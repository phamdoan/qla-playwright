/**
 * Sinh số/chuỗi TẤT ĐỊNH từ một hạt giống (rootCaseKey + tên ô).
 *
 * Thay cho `soNgau()`: số ngẫu nhiên làm hai lượt chạy cùng một case ra hai giá trị khác nhau, nên
 * không đối chiếu được và không tra lại được trên hệ thống. Cùng hạt giống thì mãi ra cùng một số.
 *
 *   soTatDinh('KDTM|flow-001|case-001', 'soBienLai', 8) → luôn là một số 8 chữ số cố định
 */

/** FNV-1a 32 bit — đủ tản cho việc sinh số hồ sơ, không cần mật mã */
function bam(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Số gồm `soChuSo` chữ số, không bắt đầu bằng 0 */
export function soTatDinh(hat: string, ten: string, soChuSo = 8): string {
  const h = bam(`${hat}|${ten}`);
  const min = 10 ** (soChuSo - 1);
  const khoang = 9 * min;
  return String(min + (h % khoang));
}

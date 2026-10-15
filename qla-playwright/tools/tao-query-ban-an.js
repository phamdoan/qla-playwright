/**
 * Sinh câu SELECT lấy Số/Ngày/Tòa ra bản án thật trên DB cho mọi mã vụ án trong
 * seed-output/toan-bo-data-stg.csv.
 *
 *   node tools/tao-query-ban-an.js > /duong/dan/q.sql
 */
const fs = require('fs');
const path = require('path');

const csv = fs.readFileSync(path.resolve(__dirname, '../seed-output/toan-bo-data-stg.csv'), 'utf8').replace(/^﻿/, '');
const ma = csv
  .split('\n')
  .slice(1)
  .filter(Boolean)
  .map(d => (d.split('","')[1] || '').replace(/"/g, '').trim())
  .filter(x => /^VA26-\d+$/.test(x));

const trongNgoac = [...new Set(ma)].map(x => `'${x}'`).join(',');
process.stdout.write(
  `SELECT v.MA_VUAN, b.SO_BAN_AN, TO_CHAR(b.NGAY_BAN_AN,'DD/MM/YYYY') NGAY_BA, b.TEN_DONVI_RA_BANAN, b.GIAI_DOAN, b.TRANG_THAI ` +
    `FROM VUAN v LEFT JOIN BAN_AN b ON b.ID_VUAN = v.ID AND b.DANH_DAU_XOA = 0 ` +
    `WHERE v.MA_VUAN IN (${trongNgoac}) ORDER BY v.MA_VUAN\n`,
);

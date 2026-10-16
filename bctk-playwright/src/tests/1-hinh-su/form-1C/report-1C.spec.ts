import { test, expect } from '@playwright/test';
import { CreateCase1CPage } from '../../../pages/1-hinh-su/form-1C/create-case-1C.page';
import { docData, luuMaVuAn } from '../../../utils/file-helper';
import { sinhTruong } from '../../../utils/fake-data';

const data = docData('1-hinh-su', '1C');

test.describe(`[${data.bieuMau}] ${data.tenBieuMau}`, () => {
  for (const c of data.cases) {
    const soLuong = Number(process.env.BCTK_SO_LUONG) || c.soLuong || 1;

    for (let i = 1; i <= soLuong; i++) {
      test(`${c.id} - ${c.moTa} (#${i}/${soLuong})`, async ({ page }) => {
        const form = new CreateCase1CPage(page);
        await form.mo();

        const maVuAn = await form.taoVuAn(sinhTruong(c.truong));
        expect(maVuAn).toBeTruthy();

        await luuMaVuAn(data.linhVuc, data.bieuMau, c.id, maVuAn);
        test.info().annotations.push({ type: 'Mã vụ án', description: maVuAn });
      });
    }
  }
});

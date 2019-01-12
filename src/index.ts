import * as fs from "fs";
import { launch, Page } from 'puppeteer';
import { parse, addDays, format, isAfter } from "date-fns";

interface PriceResult {
    startDate: Date;
    endDate: Date;
    price: string;
    dataSource: "naver"
}

(async () => {
    const tripEnd = parse("2019.10.30");
    const tripDays = 5;
    const browser = await launch();
    const page = await browser.newPage();
    page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 12_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1");
    page.setViewport({ width: 414, height: 736 });

    let startDate = parse("2019.01.30");
    let endDate = addDays(startDate, tripDays);

    const result: PriceResult[] = [];
    while (isAfter(tripEnd, startDate)) {
        console.log(`Trying to get ticket information that starting at  ${startDate} from Naver Scanner`);
        const url = `https://m.store.naver.com/flights/v2/results?trip=RT&scity1=ICN,%20GMP&ecity1=TAS&scity2=TAS&ecity2=ICN,%20GMP&adult=1&child=0&infant=0&sdate1=${format(startDate, "YYYY.MM.DD")}.&sdate2=${format(endDate, "YYYY.MM.DD")}.&fareType=Y`;
        await getNaverResult(page, url, startDate, endDate, result);
        startDate = addDays(startDate, 1);
        endDate = addDays(startDate, tripDays);
    }

    await browser.close();

    fs.writeFileSync("./dst/result.json", JSON.stringify(result, null, 2));
})();

async function getNaverResult(page: Page, url: string, startDate: Date, endDate: Date, result: PriceResult[]) {
    await page.goto(url, {waitUntil: "networkidle0"});
    await page.waitForSelector(".tit_result");
    await page.waitForSelector("#_mini_loading", {hidden: true});

    const rawPrice = await page.$eval(".txt_pay", node => node.textContent);
    if (rawPrice) {
        const price = rawPrice.replace(/\D/g,'');
        result.push({
            price,
            startDate,
            endDate,
            dataSource: "naver",
        });

        await page.screenshot({path: `dst/${format(startDate, "YYYY-MM-DD")}-naver.png`});
    }
}
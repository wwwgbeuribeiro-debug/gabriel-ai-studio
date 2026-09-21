const { chromium } = require("playwright");

async function demonstrarSite(url) {
    console.log("🎥 Jairo: iniciando demonstração");
    console.log(`🌐 Abrindo ${url}`);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 400,
        args: ["--start-maximized"]
    });

    const context = await browser.newContext({
        viewport: null
    });

    const page = await context.newPage();

    const cdp = await context.newCDPSession(page);

    const { windowId } = await cdp.send("Browser.getWindowForTarget");

    await cdp.send("Browser.setWindowBounds", {
        windowId,
        bounds: {
            windowState: "maximized"
        }
    });

    await page.goto(url, {
        waitUntil: "networkidle"
    });

    console.log("✅ Site aberto em tela maximizada");

    await page.waitForTimeout(2000);

    await page.evaluate(() => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });
    });

    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    await page.waitForTimeout(2000);

    console.log("✅ Primeira demonstração concluída");
}

const url = process.argv[2];

if (!url) {
    console.error("❌ Informe a URL do site.");
    process.exit(1);
}

demonstrarSite(url).catch((erro) => {
    console.error("❌ Erro no Jairo Browser:", erro);
});

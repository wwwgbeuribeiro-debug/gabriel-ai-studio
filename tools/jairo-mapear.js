const { chromium } = require("playwright");

async function mapearSite(url) {
    console.log("🧠 Jairo: analisando o site...");
    console.log(`🌐 ${url}`);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 300,
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

    console.log("\n✅ Site carregado\n");

    const mapa = await page.evaluate(() => {
        function texto(el) {
            return (
                el.innerText ||
                el.getAttribute("aria-label") ||
                el.getAttribute("title") ||
                el.getAttribute("placeholder") ||
                el.value ||
                ""
            )
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 120);
        }

        const elementos = [
            ...document.querySelectorAll(
                'button, a, input, select, textarea, [role="button"]'
            )
        ];

        return elementos
            .filter(el => {
                const style = getComputedStyle(el);

                return (
                    style.display !== "none" &&
                    style.visibility !== "hidden" &&
                    el.offsetWidth > 0 &&
                    el.offsetHeight > 0
                );
            })
            .map((el, index) => ({
                numero: index + 1,
                tipo: el.tagName.toLowerCase(),
                texto: texto(el),
                id: el.id || "",
                classe: el.className || "",
                href: el.getAttribute("href") || "",
                name: el.getAttribute("name") || ""
            }));
    });

    console.log("======= MAPA DO SITE =======");

    for (const item of mapa) {
        console.log(
            `[${item.numero}] ${item.tipo.toUpperCase()} | ${item.texto || "(sem texto)"}`
        );
    }

    console.log("\n============================");
    console.log(`🔎 ${mapa.length} elementos interativos encontrados.`);
    console.log("\nJairo terminou o mapeamento.");

    // deixa o navegador aberto
}

const url = process.argv[2];

if (!url) {
    console.error("❌ Informe a URL.");
    process.exit(1);
}

mapearSite(url).catch(error => {
    console.error("❌ Erro:", error);
});
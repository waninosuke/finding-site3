// さっきコピーしたGASのウェブアプリURLをここに貼り付ける
const myGasUrl = "https://script.google.com/a/macros/edu.nishiyamato.ed.jp/s/AKfycbx15WTiSzX89h2gAnXCIrAgHQkF4e4IEtUdoYQMy-toPvDCToHCaWzsVOigg8S1yIyh/exec";

document.getElementById('load-btn').addEventListener('click', async () => {
    const urlInput = document.getElementById('target-url').value.trim();
    const container = document.getElementById('viewer-container');
    
    if (!urlInput) { return; }
    container.innerHTML = '<div class="loading">Googleサーバー経由で読み込み中...</div>';

    try {
        // 自分で作ったGoogleの中継サーバーにリクエストを送る
        const response = await fetch(`${myGasUrl}?url=${encodeURIComponent(urlInput)}`);
        const data = await response.json();
        const htmlText = data.contents;

        if (htmlText.startsWith("エラー:")) {
            throw new Error(htmlText);
        }

        // --- 以下は前回と同じHTML解析・表示の処理 ---
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const baseUrl = new URL(urlInput);

        doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                img.src = new URL(src, baseUrl).href;
            }
        });
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http')) { link.href = new URL(href, baseUrl).href; }
        });
        doc.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) { a.href = new URL(href, baseUrl).href; }
            a.target = '_blank';
        });

        container.innerHTML = ''; 
        const shadowRoot = container.attachShadow({ mode: 'open' });
        const wrapper = document.createElement('div');
        wrapper.innerHTML = doc.documentElement.innerHTML;
        shadowRoot.appendChild(wrapper);

    } catch (error) {
        container.innerHTML = `<div class="loading" style="color: red;">読み込み失敗: ${error.message}</div>`;
    }
});

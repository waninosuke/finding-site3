document.getElementById('load-btn').addEventListener('click', async () => {
    const urlInput = document.getElementById('target-url').value.trim();
    const container = document.getElementById('viewer-container');
    
    if (!urlInput) {
        alert('URLを入力してください');
        return;
    }

    container.innerHTML = '<div class="loading">サイトを読み込み中...（数十秒かかる場合があります）</div>';

    try {
        // 1. CORS制限を回避するために無料のプロキシ（AllOrigins）を経由してHTMLを取得
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(urlInput)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error('サイトのデータが取得できませんでした。');
        
        const data = await response.json();
        const htmlText = data.contents; // 元のサイトのHTML（文字列）

        // 2. 読み込んだテキストをHTMLの形に変換する（パース）
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const baseUrl = new URL(urlInput);

        // 3. 画像(img)のリンク切れを防ぐため、相対パスを絶対パスに変換
        doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                img.src = new URL(src, baseUrl).href;
            }
        });

        // 4. スタイルシート(css)やフォントのリンクも絶対パスに変換
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http')) {
                link.href = new URL(href, baseUrl).href;
            }
        });

        // 5. リンク(aタグ)をクリックしたときに、新しいタブで開くようにする
        doc.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                a.href = new URL(href, baseUrl).href;
            }
            a.target = '_blank';
        });

        // 6. 自分のサイトのデザインと衝突させないために「Shadow DOM」を作成して表示
        container.innerHTML = ''; // 読み込み中を消す
        const shadowRoot = container.attachShadow({ mode: 'open' });

        // 隔離されたカプセル（Shadow DOM）の中に、相手サイトのHTMLを丸ごと流し込む
        const wrapper = document.createElement('div');
        wrapper.innerHTML = doc.documentElement.innerHTML;
        shadowRoot.appendChild(wrapper);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="loading" style="color: red;">エラーが発生しました: ${error.message}<br>※サイトによってはセキュリティで拒否される場合があります。</div>`;
    }
});
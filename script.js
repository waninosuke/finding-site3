document.getElementById('load-btn').addEventListener('click', async () => {
    const urlInput = document.getElementById('target-url').value.trim();
    const container = document.getElementById('viewer-container');
    
    if (!urlInput) {
        alert('URLを入力してください');
        return;
    }

    container.innerHTML = '<div class="loading">サイトを読み込み中...（数十秒かかる場合があります）</div>';

    // ★ 対策①：複数の無料プロキシを準備し、全滅するまで順番に試す仕組み
    const proxies = [
        {
            name: 'AllOrigins',
            getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            getHtml: async (res) => {
                const data = await res.json();
                return data.contents;
            }
        },
        {
            name: 'CodeTabs',
            getUrl: (url) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(url)}`,
            getHtml: async (res) => await res.text()
        }
    ];

    let htmlText = null;
    let usedProxyName = '';

    // プロキシを順番に実行
    for (const proxy of proxies) {
        try {
            console.log(`ユーザー通信：${proxy.name} で接続テスト中...`);
            const response = await fetch(proxy.getUrl(urlInput));
            if (response.ok) {
                htmlText = await proxy.getHtml(response);
                usedProxyName = proxy.name;
                break; // 読み込みに成功したらループを抜ける
            }
        } catch (e) {
            console.warn(`${proxy.name} が失敗しました。次のプロキシを試します。`, e);
        }
    }

    // すべてのプロキシが失敗した場合のエラー表示
    if (!htmlText) {
        container.innerHTML = `
            <div class="loading" style="color: red; text-align: left;">
                <p><strong>エラーが発生しました: Failed to fetch</strong></p>
                <p style="font-size: 14px; color: #555;">すべての接続ルートがブロックされました。以下の原因が考えられます：</p>
                <ul style="font-size: 14px; color: #555; padding-left: 20px;">
                    <li><strong>ローカルで実行している：</strong>パソコンのファイルを直接ダブルクリック（file://...）で開くとエラーになります。必ずGitHub PagesにアップロードしたURL（https://...）から開いてください。</li>
                    <li><strong>広告ブロック（Adblock等）：</strong>ブラウザの拡張機能がプロキシ通信を「広告や追跡」と誤認して遮断していることがあります。一度オフにしてみてください。</li>
                </ul>
            </div>`;
        return;
    }

    try {
        // 2. 読み込んだテキストをHTMLの形に変換する（パース）
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const baseUrl = new URL(urlInput);

        // 3. 画像(img)の相対パスを絶対パスに変換
        doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                img.src = new URL(src, baseUrl).href;
            }
        });

        // 4. スタイルシート(css)のリンクを絶対パスに変換
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http')) {
                link.href = new URL(href, baseUrl).href;
            }
        });

        // 5. リンク(aタグ)を新しいタブで開くようにする
        doc.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                a.href = new URL(href, baseUrl).href;
            }
            a.target = '_blank';
        });

        // 6. Shadow DOMを作成して表示
        container.innerHTML = ''; 
        const shadowRoot = container.attachShadow({ mode: 'open' });

        const wrapper = document.createElement('div');
        wrapper.innerHTML = doc.documentElement.innerHTML;
        shadowRoot.appendChild(wrapper);
        
        console.log(`${usedProxyName} を経由して正常に読み込みました！`);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="loading" style="color: red;">HTMLの解析エラー: ${error.message}</div>`;
    }
});

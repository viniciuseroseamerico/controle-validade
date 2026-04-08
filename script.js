// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://zqmvpqvkvyuvuatbsrlv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PAukwIprVTGAum9ElAzbBA_WcBMh6St';

// ELEMENTOS DA TELA
const codigoInput = document.getElementById('codigo');
const buscarBtn = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');
const loadingDiv = document.getElementById('loading');
const gerarRelatorioBtn = document.getElementById('gerarRelatorioBtn');
const imprimirRemoverBtn = document.getElementById('imprimirRemoverBtn');
const relatorioDiv = document.getElementById('relatorio');

function formatarDataBR(dataISO) {
    if (!dataISO) return '';
    const partes = dataISO.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataISO;
}

function calcularDiasRestantes(dataValidade) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(dataValidade);
    validade.setHours(0, 0, 0, 0);
    const diffTime = validade - hoje;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function buscarProduto(ean) {
    loadingDiv.style.display = 'block';
    resultadoDiv.innerHTML = '';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?eam=eq.${ean}&select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        const produtos = await response.json();
        loadingDiv.style.display = 'none';
        
        if (produtos.length === 0) {
            resultadoDiv.innerHTML = `
                <div class="nao-encontrado">⚠️ PRODUTO NÃO CADASTRADO!</div>
                <div class="form-cadastro">
                    <h4>📝 Cadastrar novo produto:</h4>
                    <input type="text" id="novaDescricao" placeholder="Descrição do produto">
                    <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)">
                    <button id="salvarProdutoBtn" class="btn-salvar">💾 Cadastrar</button>
                </div>
            `;
            document.getElementById('salvarProdutoBtn').onclick = () => {
                const descricao = document.getElementById('novaDescricao').value;
                const validade = document.getElementById('novaValidade').value;
                if (descricao && validade) cadastrarProduto(ean, descricao, validade);
            };
        } else {
            let html = `<h3>📦 Produto encontrado (${produtos.length} lote(s)):</h3>`;
            produtos.forEach(produto => {
                const dias = calcularDiasRestantes(produto.validade);
                let acao = '';
                if (dias < 0) acao = '🔴 RETIRAR DO ESTOQUE';
                else if (dias <= 60) acao = '🟠 AÇÃO 30% DESCONTO';
                else if (dias <= 90) acao = '🟡 AÇÃO 20% DESCONTO';
                else acao = '✅ NORMAL';
                
                html += `<div class="produto-info">
                    <p><strong>📝 Descrição:</strong> ${produto.descricao}</p>
                    <p><strong>📅 Validade:</strong> ${formatarDataBR(produto.validade)}</p>
                    <p><strong>⏰ Dias:</strong> ${dias} dias</p>
                    <p><strong>🎯 AÇÃO:</strong> ${acao}</p>
                </div>`;
            });
            html += `<div class="form-cadastro">
                <h4>➕ Nova data de validade:</h4>
                <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)">
                <button id="salvarNovaValidadeBtn" class="btn-salvar">💾 Salvar</button>
            </div>`;
            resultadoDiv.innerHTML = html;
            
            document.getElementById('salvarNovaValidadeBtn').onclick = () => {
                const novaValidade = document.getElementById('novaValidade').value;
                if (novaValidade) adicionarNovaValidade(ean, produtos[0].descricao, novaValidade);
            };
        }
        codigoInput.value = '';
        codigoInput.focus();
    } catch (error) {
        loadingDiv.style.display = 'none';
        resultadoDiv.innerHTML = `<div class="mensagem-erro">Erro: ${error.message}</div>`;
        codigoInput.value = '';
        codigoInput.focus();
    }
}

async function adicionarNovaValidade(ean, descricao, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) return alert('Data inválida');
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'block';
    
    await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ eam: ean, descricao, validade: validadeISO })
    });
    loadingDiv.style.display = 'none';
    buscarProduto(ean);
}

async function cadastrarProduto(ean, descricao, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) return alert('Data inválida');
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'block';
    
    await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ eam: ean, descricao, validade: validadeISO })
    });
    loadingDiv.style.display = 'none';
    alert('Produto cadastrado!');
    codigoInput.value = '';
    codigoInput.focus();
}

async function gerarRelatorio() {
    relatorioDiv.innerHTML = '<div class="loading">⏳ Gerando...</div>';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const produtos = await response.json();
    
    let html = `<h2>📊 RELATÓRIO</h2><p>Total: ${produtos.length}</p><hr>`;
    html += `<div class="secao-vencidos"><h3>🔴 VENCIDOS</h3>`;
    const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
    if (vencidos.length) {
        html += `<table><tr><th>EAN</th><th>Descrição</th><th>Validade</th></tr>`;
        vencidos.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum produto vencido</p>`;
    html += `</div><div class="secao-30"><h3>🟠 30% DESCONTO</h3>`;
    const promocao30 = produtos.filter(p => {
        const d = calcularDiasRestantes(p.validade);
        return d > 0 && d <= 60;
    });
    if (promocao30.length) {
        html += `<table><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        promocao30.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum produto com 30%</p>`;
    html += `</div><div class="secao-20"><h3>🟡 20% DESCONTO</h3>`;
    const promocao20 = produtos.filter(p => {
        const d = calcularDiasRestantes(p.validade);
        return d > 60 && d <= 90;
    });
    if (promocao20.length) {
        html += `<table><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        promocao20.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum produto com 20%</p>`;
    html += `</div>`;
    relatorioDiv.innerHTML = html;
}

function abrirJanelaImpressao() {
    const conteudo = relatorioDiv.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Relatório</title><style>
        body { font-family: Arial; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #1e3c72; color: white; }
        .secao-vencidos h3 { background: #c53030; color: white; padding: 10px; }
        .secao-30 h3 { background: #dd6b20; color: white; padding: 10px; }
        .secao-20 h3 { background: #b7791f; color: white; padding: 10px; }
        @media print { button { display: none; } }
    </style></head><body>${conteudo}<script>window.onload = () => setTimeout(() => window.print(), 500);<\/script></body></html>`);
    win.document.close();
}

async function imprimirERemoverVencidos() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?validade=lt.${new Date().toISOString().split('T')[0]}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const vencidos = await response.json();
    if (vencidos.length === 0) return abrirJanelaImpressao();
    if (!confirm(`${vencidos.length} vencido(s) serão removidos. Continuar?`)) return;
    for (const p of vencidos) {
        await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?id=eq.${p.id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
    }
    await gerarRelatorio();
    abrirJanelaImpressao();
}

buscarBtn.onclick = () => { if (codigoInput.value.trim()) buscarProduto(codigoInput.value.trim()); };
codigoInput.onkeypress = (e) => { if (e.key === 'Enter' && codigoInput.value.trim()) buscarProduto(codigoInput.value.trim()); };
gerarRelatorioBtn.onclick = gerarRelatorio;
imprimirRemoverBtn.onclick = imprimirERemoverVencidos;
codigoInput.focus();

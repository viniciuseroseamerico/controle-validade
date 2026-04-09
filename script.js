// CONFIGURAÇÃO
const SUPABASE_URL = 'https://zqmvpqvkvyuvuatbsrlv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PAukwIprVTGAum9ElAzbBA_WcBMh6St';

// ELEMENTOS
const codigoInput = document.getElementById('codigo');
const buscarBtn = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');
const loadingDiv = document.getElementById('loading');
const gerarRelatorioBtn = document.getElementById('gerarRelatorioBtn');
const imprimirRemoverBtn = document.getElementById('imprimirRemoverBtn');
const relatorioDiv = document.getElementById('relatorio');

// FUNÇÕES
function formatarDataBR(dataISO) {
    if (!dataISO) return '';
    const partes = dataISO.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataISO;
}

function calcularDiasRestantes(dataValidade) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(dataValidade);
    validade.setHours(0, 0, 0, 0);
    return Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
}

// BUSCAR PRODUTO
async function buscarProduto(ean) {
    loadingDiv.style.display = 'block';
    resultadoDiv.innerHTML = '';
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?eam=eq.${ean}&select=*`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const produtos = await response.json();
        loadingDiv.style.display = 'none';
        if (produtos.length === 0) {
            resultadoDiv.innerHTML = `<div class="nao-encontrado">⚠️ PRODUTO NÃO CADASTRADO!</div>
                <div class="form-cadastro"><h4>📝 Cadastrar:</h4>
                <input type="text" id="novaDescricao" placeholder="Descrição">
                <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)">
                <button id="salvarProdutoBtn" class="btn-salvar">💾 Cadastrar</button></div>`;
            document.getElementById('salvarProdutoBtn').onclick = () => {
                const desc = document.getElementById('novaDescricao').value;
                const val = document.getElementById('novaValidade').value;
                if (desc && val) cadastrarProduto(ean, desc, val);
            };
        } else {
            let html = `<h3>📦 Produto encontrado (${produtos.length} lote(s)):</h3>`;
            produtos.forEach(p => {
                const dias = calcularDiasRestantes(p.validade);
                let acao = dias < 0 ? '🔴 RETIRAR' : (dias <= 60 ? '🟠 30% OFF' : (dias <= 90 ? '🟡 20% OFF' : '✅ NORMAL'));
                html += `<div style="border-left:4px solid #1e3c72; padding:10px; margin:10px 0; background:#f9f9f9;">
                    <p><strong>📝 ${p.descricao}</strong></p>
                    <p>📅 ${formatarDataBR(p.validade)} | ⏰ ${dias} dias | 🎯 ${acao}</p></div>`;
            });
            html += `<div><h4>➕ Nova data:</h4><input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)">
                <button id="salvarNovaValidadeBtn" class="btn-salvar">💾 Salvar</button></div>`;
            resultadoDiv.innerHTML = html;
            document.getElementById('salvarNovaValidadeBtn').onclick = () => {
                const val = document.getElementById('novaValidade').value;
                if (val) adicionarValidade(ean, produtos[0].descricao, val);
            };
        }
        codigoInput.value = '';
        codigoInput.focus();
    } catch(e) {
        loadingDiv.style.display = 'none';
        resultadoDiv.innerHTML = `<div class="mensagem-erro">Erro: ${e.message}</div>`;
    }
}

async function cadastrarProduto(ean, desc, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) return alert('Data inválida');
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'block';
    await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ eam: ean, descricao: desc, validade: validadeISO })
    });
    loadingDiv.style.display = 'none';
    alert('Cadastrado!');
    codigoInput.value = '';
    codigoInput.focus();
    resultadoDiv.innerHTML = '';
}

async function adicionarValidade(ean, desc, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) return alert('Data inválida');
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'block';
    await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ eam: ean, descricao: desc, validade: validadeISO })
    });
    loadingDiv.style.display = 'none';
    alert('Validade adicionada!');
    buscarProduto(ean);
}

// RELATÓRIO
async function gerarRelatorio() {
    relatorioDiv.innerHTML = '<div class="loading">⏳ Gerando...</div>';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const produtos = await response.json();
    const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
    const p30 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 0 && d <= 60; });
    const p20 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 60 && d <= 90; });
    
    let html = `<h2>📊 RELATÓRIO</h2><p>Total: ${produtos.length}</p><hr>`;
    html += `<h3 style="background:#c53030;color:white;padding:10px;">🔴 VENCIDOS</h3>`;
    if (vencidos.length) {
        html += `<table border="1" style="width:100%"><tr style="background:#1e3c72;color:white"><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        vencidos.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${Math.abs(calcularDiasRestantes(p.validade))}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum</p>`;
    
    html += `<h3 style="background:#dd6b20;color:white;padding:10px;">🟠 30% OFF</h3>`;
    if (p30.length) {
        html += `<table border="1" style="width:100%"><tr style="background:#1e3c72;color:white"><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        p30.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum</p>`;
    
    html += `<h3 style="background:#b7791f;color:white;padding:10px;">🟡 20% OFF</h3>`;
    if (p20.length) {
        html += `<table border="1" style="width:100%"><tr style="background:#1e3c72;color:white"><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        p20.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum</p>`;
    relatorioDiv.innerHTML = html;
}

// IMPRIMIR
async function imprimirRelatorio() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const produtos = await response.json();
    const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
    const p30 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 0 && d <= 60; });
    const p20 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 60 && d <= 90; });
    
    if (vencidos.length > 0 && !confirm(`${vencidos.length} vencido(s) serão removidos. Continuar?`)) return;
    for (const p of vencidos) {
        await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?id=eq.${p.id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
    }
    
    let html = `<h2>📊 RELATÓRIO</h2><p>Data: ${new Date().toLocaleDateString()}</p><p>Total: ${produtos.length}</p><hr>`;
    html += `<h3>🔴 VENCIDOS</h3>`;
    if (vencidos.length) {
        html += `<table border="1"><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        vencidos.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${Math.abs(calcularDiasRestantes(p.validade))}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum</p>`;
    
    html += `<h3>🟠 30% OFF</h3>`;
    if (p30.length) {
        html += `<table border="1"><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        p30.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum</p>`;
    
    html += `<h3>🟡 20% OFF</h3>`;
    if (p20.length) {
        html += `<table border="1"><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
        p20.forEach(p => html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`);
        html += `</table>`;
    } else html += `<p>✅ Nenhum</p>`;
    
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Relatório</title><style>body{font-family:Arial;margin:20px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px}</style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>window.print(),500)}<\/script></body></html>`);
    win.document.close();
}

// EVENTOS
buscarBtn.onclick = () => { if (codigoInput.value.trim()) buscarProduto(codigoInput.value.trim()); };
codigoInput.onkeypress = (e) => { if (e.key === 'Enter' && codigoInput.value.trim()) buscarProduto(codigoInput.value.trim()); };
gerarRelatorioBtn.onclick = gerarRelatorio;
imprimirRemoverBtn.onclick = imprimirRelatorio;
codigoInput.focus();

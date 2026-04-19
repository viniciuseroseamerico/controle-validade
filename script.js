// ============================================= //
// CONFIGURAÇÃO SUPABASE                         //
// ============================================= //

const SUPABASE_URL = 'https://zqmvpqvkvyuvuatbsrlv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PAukwIprVTGAum9ElAzbBA_WcBMh6St';

// ============================================= //
// ELEMENTOS DOM                                  //
// ============================================= //

const codigoInput          = document.getElementById('codigo');
const buscarBtn            = document.getElementById('buscarBtn');
const resultadoDiv         = document.getElementById('resultado');
const loadingDiv           = document.getElementById('loading');
const gerarRelatorioBtn    = document.getElementById('gerarRelatorioBtn');
const imprimirRemoverBtn   = document.getElementById('imprimirRemoverBtn');
const relatorioDiv         = document.getElementById('relatorio');

// ============================================= //
// UTILITÁRIOS                                   //
// ============================================= //

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

function getStatusInfo(dias) {
    if (dias < 0)       return { label: '🔴 RETIRAR',  classe: 'status-retirar', badgeClass: 'badge-red',    chipClass: 'chip-red',    cor: '#ff6b6b', key: 'retirar' };
    if (dias <= 60)     return { label: '🟠 30% OFF',   classe: 'status-30',     badgeClass: 'badge-orange', chipClass: 'chip-orange', cor: '#ffaa44', key: '30' };
    if (dias <= 90)     return { label: '🟡 20% OFF',   classe: 'status-20',     badgeClass: 'badge-yellow', chipClass: 'chip-yellow', cor: '#f0c040', key: '20' };
    return              { label: '✅ NORMAL',           classe: 'status-normal', badgeClass: 'badge-green',  chipClass: 'chip-green',  cor: '#4caf7d', key: 'normal' };
}

// ============================================= //
// BUSCAR PRODUTO                                //
// ============================================= //

async function buscarProduto(ean) {
    loadingDiv.style.display = 'flex';
    resultadoDiv.innerHTML = '';
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/produtos_validade?eam=eq.${ean}&select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const produtos = await response.json();
        loadingDiv.style.display = 'none';

        if (produtos.length === 0) {
            resultadoDiv.innerHTML = `
                <div class="nao-encontrado">⚠️ PRODUTO NÃO CADASTRADO!</div>
                <div class="form-cadastro">
                    <h4>📝 Cadastrar novo produto</h4>
                    <input type="text" id="novaDescricao" placeholder="Descrição do produto">
                    <input type="text" id="novaValidade" placeholder="Data de validade (DD/MM/AAAA)">
                    <button id="salvarProdutoBtn" class="btn btn-save">💾 Cadastrar Produto</button>
                </div>`;
            document.getElementById('salvarProdutoBtn').onclick = () => {
                const desc = document.getElementById('novaDescricao').value.trim();
                const val  = document.getElementById('novaValidade').value.trim();
                if (desc && val) cadastrarProduto(ean, desc, val);
                else alert('Preencha a descrição e a data de validade.');
            };
        } else {
            let html = `<h3>📦 Produto encontrado — ${produtos.length} lote(s)</h3>`;
            produtos.forEach(p => {
                const dias   = calcularDiasRestantes(p.validade);
                const status = getStatusInfo(dias);
                const diasTexto = dias < 0 ? `${Math.abs(dias)} dias vencido` : `${dias} dias restantes`;
                html += `
                <div class="produto-lote ${status.classe}">
                    <div class="lote-nome">${p.descricao}</div>
                    <div class="lote-meta">
                        <span>📅 ${formatarDataBR(p.validade)}</span>
                        <span>⏰ ${diasTexto}</span>
                        <span class="lote-badge ${status.badgeClass}">${status.label}</span>
                    </div>
                </div>`;
            });
            html += `
                <div class="form-cadastro" style="margin-top:16px;">
                    <h4>➕ Adicionar novo lote</h4>
                    <input type="text" id="novaValidade" placeholder="Data de validade (DD/MM/AAAA)">
                    <button id="salvarNovaValidadeBtn" class="btn btn-save">💾 Salvar Nova Validade</button>
                </div>`;
            resultadoDiv.innerHTML = html;
            document.getElementById('salvarNovaValidadeBtn').onclick = () => {
                const val = document.getElementById('novaValidade').value.trim();
                if (val) adicionarValidade(ean, produtos[0].descricao, val);
                else alert('Digite a data de validade.');
            };
        }
        codigoInput.value = '';
        codigoInput.focus();
    } catch(e) {
        loadingDiv.style.display = 'none';
        resultadoDiv.innerHTML = `<div class="mensagem-erro">❌ Erro de conexão: ${e.message}</div>`;
    }
}

// ============================================= //
// CADASTRAR PRODUTO                             //
// ============================================= //

async function cadastrarProduto(ean, desc, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) return alert('Data inválida. Use o formato DD/MM/AAAA');
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'flex';
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ eam: ean, descricao: desc, validade: validadeISO })
        });
        loadingDiv.style.display = 'none';
        resultadoDiv.innerHTML = `<div class="mensagem-sucesso">✅ Produto cadastrado com sucesso!</div>`;
        codigoInput.value = '';
        codigoInput.focus();
    } catch(e) {
        loadingDiv.style.display = 'none';
        resultadoDiv.innerHTML = `<div class="mensagem-erro">❌ Erro ao cadastrar: ${e.message}</div>`;
    }
}

// ============================================= //
// ADICIONAR VALIDADE                            //
// ============================================= //

async function adicionarValidade(ean, desc, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) return alert('Data inválida. Use o formato DD/MM/AAAA');
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'flex';
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ eam: ean, descricao: desc, validade: validadeISO })
        });
        loadingDiv.style.display = 'none';
        buscarProduto(ean);
    } catch(e) {
        loadingDiv.style.display = 'none';
        resultadoDiv.innerHTML = `<div class="mensagem-erro">❌ Erro ao salvar: ${e.message}</div>`;
    }
}

// ============================================= //
// GRÁFICO DE PIZZA (Canvas nativo)             //
// ============================================= //

function desenharPizza(canvasId, dados) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 160;
    canvas.width  = size;
    canvas.height = size;
    const cx = size / 2, cy = size / 2, r = (size / 2) - 8;

    const total = dados.reduce((s, d) => s + d.valor, 0);
    if (total === 0) { ctx.fillStyle = '#3a4149'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); return; }

    let angulo = -Math.PI / 2;
    dados.forEach(d => {
        if (d.valor === 0) return;
        const fatia = (d.valor / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angulo, angulo + fatia);
        ctx.closePath();
        ctx.fillStyle = d.cor;
        ctx.fill();
        ctx.strokeStyle = '#1c2025';
        ctx.lineWidth = 2;
        ctx.stroke();
        angulo += fatia;
    });

    // Buraco central (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#2e343c';
    ctx.fill();

    // Total no centro
    ctx.fillStyle = '#e0e6ed';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy);
}

// ============================================= //
// GERAR RELATÓRIO                               //
// ============================================= //

async function gerarRelatorio() {
    relatorioDiv.innerHTML = `
        <div class="loading-bar" style="display:flex;">
            <div class="loading-spinner"></div>
            <span>Carregando dados do banco de dados...</span>
        </div>`;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/produtos_validade?select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const produtos = await response.json();

        const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
        const p30      = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d >= 0 && d <= 60; });
        const p20      = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 60 && d <= 90; });
        const pOk      = produtos.filter(p => calcularDiasRestantes(p.validade) > 90);
        const total    = produtos.length;

        // KPI Cards
        let html = `
        <div class="kpi-grid">
            <div class="kpi-card total"><div class="kpi-label">Total</div><div class="kpi-value">${total}</div></div>
            <div class="kpi-card vencidos"><div class="kpi-label">Vencidos</div><div class="kpi-value">${vencidos.length}</div></div>
            <div class="kpi-card off30"><div class="kpi-label">30% OFF</div><div class="kpi-value">${p30.length}</div></div>
            <div class="kpi-card off20"><div class="kpi-label">20% OFF</div><div class="kpi-value">${p20.length}</div></div>
            <div class="kpi-card ok"><div class="kpi-label">Normal</div><div class="kpi-value">${pOk.length}</div></div>
        </div>`;

        // Gráfico de Pizza
        const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
        html += `
        <div class="grafico-wrap">
            <div class="grafico-titulo" style="flex-basis:100%">Distribuição por Status</div>
            <div class="pizza-canvas-wrap"><canvas id="pizzaChart"></canvas></div>
            <div class="pizza-legenda">
                <div class="legenda-item"><span class="legenda-cor" style="background:#ff6b6b"></span> Vencidos <span class="legenda-pct">${vencidos.length} · ${pct(vencidos.length)}%</span></div>
                <div class="legenda-item"><span class="legenda-cor" style="background:#ffaa44"></span> 30% OFF <span class="legenda-pct">${p30.length} · ${pct(p30.length)}%</span></div>
                <div class="legenda-item"><span class="legenda-cor" style="background:#f0c040"></span> 20% OFF <span class="legenda-pct">${p20.length} · ${pct(p20.length)}%</span></div>
                <div class="legenda-item"><span class="legenda-cor" style="background:#4caf7d"></span> Normal <span class="legenda-pct">${pOk.length} · ${pct(pOk.length)}%</span></div>
            </div>
        </div>`;

        // Tabela helper
        function tabelaSecao(lista, chipFn) {
            if (!lista.length) return `<p class="sem-produtos">Nenhum produto nesta categoria.</p>`;
            let t = `<table class="tabela-relatorio">
                <thead><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr></thead><tbody>`;
            lista.forEach(p => {
                const dias = calcularDiasRestantes(p.validade);
                const chip = chipFn(dias);
                t += `<tr>
                    <td class="td-code">${p.eam}</td>
                    <td>${p.descricao}</td>
                    <td>${formatarDataBR(p.validade)}</td>
                    <td><span class="dias-chip ${chip}">${Math.abs(dias)}</span></td>
                </tr>`;
            });
            return t + `</tbody></table>`;
        }

        html += `
        <div class="secao-relatorio secao-vencidos">
            <div class="secao-header">🔴 Vencidos — RETIRAR DO ESTOQUE <span class="secao-count">${vencidos.length}</span></div>
            ${tabelaSecao(vencidos, () => 'chip-red')}
        </div>
        <div class="secao-relatorio secao-30">
            <div class="secao-header">🟠 Vence em até 60 dias — 30% OFF <span class="secao-count">${p30.length}</span></div>
            ${tabelaSecao(p30, () => 'chip-orange')}
        </div>
        <div class="secao-relatorio secao-20">
            <div class="secao-header">🟡 Vence em 61–90 dias — 20% OFF <span class="secao-count">${p20.length}</span></div>
            ${tabelaSecao(p20, () => 'chip-yellow')}
        </div>
        <div class="secao-relatorio secao-normal">
            <div class="secao-header">✅ Normal — dentro do prazo <span class="secao-count">${pOk.length}</span></div>
            ${tabelaSecao(pOk, () => 'chip-green')}
        </div>`;

        relatorioDiv.innerHTML = html;

        // Desenha pizza após renderizar DOM
        setTimeout(() => {
            desenharPizza('pizzaChart', [
                { valor: vencidos.length, cor: '#ff6b6b' },
                { valor: p30.length,      cor: '#ffaa44' },
                { valor: p20.length,      cor: '#f0c040' },
                { valor: pOk.length,      cor: '#4caf7d' },
            ]);
        }, 50);

    } catch(e) {
        relatorioDiv.innerHTML = `<div class="mensagem-erro">❌ Erro ao gerar relatório: ${e.message}</div>`;
    }
}

// ============================================= //
// IMPRIMIR E REMOVER VENCIDOS                   //
// ============================================= //

async function imprimirRelatorio() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/produtos_validade?select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const produtos = await response.json();

        const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
        const p30      = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d >= 0 && d <= 60; });
        const p20      = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 60 && d <= 90; });

        if (vencidos.length > 0 && !confirm(`${vencidos.length} produto(s) vencido(s) serão removidos permanentemente. Deseja continuar?`)) return;

        for (const p of vencidos) {
            await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?id=eq.${p.id}`, {
                method: 'DELETE',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
        }

        const dataAtual = new Date().toLocaleDateString('pt-BR');

        function tabelaImprimir(lista) {
            if (!lista.length) return '<p>Nenhum produto.</p>';
            let t = `<table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse">
                <tr style="background:#1e3c72;color:white"><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
            lista.forEach(p => {
                const dias = calcularDiasRestantes(p.validade);
                t += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${Math.abs(dias)}</td></tr>`;
            });
            return t + '</table>';
        }

        const html = `
        <html><head><title>Relatório de Validade — ${dataAtual}</title>
        <style>body{font-family:Arial,sans-serif;margin:20px;color:#222}h1{color:#1e3c72}h2{margin-top:24px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;font-size:13px}th{background:#1e3c72;color:white}</style>
        </head><body>
        <h1>📊 Relatório de Controle de Validade</h1>
        <p>Data de geração: <strong>${dataAtual}</strong> &nbsp;|&nbsp; Total de produtos: <strong>${produtos.length}</strong></p>
        <h2 style="color:#bb0000">🔴 Vencidos (${vencidos.length}) — Removidos do sistema</h2>${tabelaImprimir(vencidos)}
        <h2 style="color:#c44500">🟠 30% OFF — Vence em até 60 dias (${p30.length})</h2>${tabelaImprimir(p30)}
        <h2 style="color:#b7791f">🟡 20% OFF — Vence em 61–90 dias (${p20.length})</h2>${tabelaImprimir(p20)}
        <script>window.onload=()=>{setTimeout(()=>window.print(),500)}<\/script>
        </body></html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();

    } catch(e) {
        alert('Erro: ' + e.message);
    }
}

// ============================================= //
// EVENTOS                                       //
// ============================================= //

buscarBtn.onclick = () => {
    const val = codigoInput.value.trim();
    if (val) buscarProduto(val);
};

codigoInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
        const val = codigoInput.value.trim();
        if (val) buscarProduto(val);
    }
};

gerarRelatorioBtn.onclick   = gerarRelatorio;
imprimirRemoverBtn.onclick  = imprimirRelatorio;

codigoInput.focus();

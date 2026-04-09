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

// FUNÇÕES AUXILIARES
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
            resultadoDiv.innerHTML = `
                <div class="nao-encontrado">⚠️ PRODUTO NÃO CADASTRADO!</div>
                <div class="form-cadastro">
                    <h4>📝 Cadastrar novo produto:</h4>
                    <input type="text" id="novaDescricao" placeholder="Descrição">
                    <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)">
                    <button id="salvarProdutoBtn" class="btn-salvar">💾 Cadastrar</button>
                </div>
            `;
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
                    <p>📅 ${formatarDataBR(p.validade)} | ⏰ ${dias} dias | 🎯 ${acao}</p>
                </div>`;
            });
            html += `<div><h4>➕ Nova data:</h4>
                <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)">
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

// CADASTRAR PRODUTO
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

// ADICIONAR VALIDADE
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

// GERAR RELATÓRIO NA TELA (COM GRÁFICO PIZZA BONITO)
async function gerarRelatorio() {
    relatorioDiv.innerHTML = '<div class="loading">⏳ Gerando relatório...</div>';
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const produtos = await response.json();
    
    if (produtos.length === 0) {
        relatorioDiv.innerHTML = '<p>Nenhum produto cadastrado.</p>';
        return;
    }
    
    const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
    const p30 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 0 && d <= 60; });
    const p20 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 60 && d <= 90; });
    const normais = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 90; });
    
    const total = produtos.length;
    const percentualVencidos = ((vencidos.length / total) * 100).toFixed(1);
    const percentual30 = ((p30.length / total) * 100).toFixed(1);
    const percentual20 = ((p20.length / total) * 100).toFixed(1);
    const percentualNormal = ((normais.length / total) * 100).toFixed(1);
    
    let html = `
        <div class="relatorio-container">
            <h2 style="text-align:center;">📊 RELATÓRIO DE VALIDADE</h2>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Total de produtos:</strong> ${total}</p>
            <hr>
            
            <!-- GRÁFICO DE PIZZA -->
            <div style="margin: 20px auto; text-align: center; max-width: 300px;">
                <div style="width: 200px; height: 200px; margin: 0 auto; border-radius: 50%; background: conic-gradient(
                    #c53030 0% ${percentualVencidos}%,
                    #dd6b20 ${percentualVencidos}% ${parseFloat(percentualVencidos) + parseFloat(percentual30)}%,
                    #b7791f ${parseFloat(percentualVencidos) + parseFloat(percentual30)}% ${parseFloat(percentualVencidos) + parseFloat(percentual30) + parseFloat(percentual20)}%,
                    #48bb78 ${parseFloat(percentualVencidos) + parseFloat(percentual30) + parseFloat(percentual20)}% 100%
                );"></div>
                <div style="margin-top: 15px;">
                    <p><span style="display:inline-block;width:12px;height:12px;background:#c53030;border-radius:50%;"></span> Vencidos: ${percentualVencidos}%</p>
                    <p><span style="display:inline-block;width:12px;height:12px;background:#dd6b20;border-radius:50%;"></span> 30% OFF: ${percentual30}%</p>
                    <p><span style="display:inline-block;width:12px;height:12px;background:#b7791f;border-radius:50%;"></span> 20% OFF: ${percentual20}%</p>
                    <p><span style="display:inline-block;width:12px;height:12px;background:#48bb78;border-radius:50%;"></span> Normal: ${percentualNormal}%</p>
                </div>
            </div>
            <hr>
    `;
    
    // Vencidos
    html += `<div style="margin-bottom: 30px;">
        <h3 style="background:#c53030; color:white; padding:10px;">🔴 PRODUTOS VENCIDOS</h3>`;
    if (vencidos.length) {
        html += `<table style="width:100%; border-collapse:collapse;">
            <tr style="background:#1e3c72; color:white;">
                <th style="border:1px solid #ccc; padding:8px;">EAN</th>
                <th style="border:1px solid #ccc; padding:8px;">Descrição</th>
                <th style="border:1px solid #ccc; padding:8px;">Validade</th>
                <th style="border:1px solid #ccc; padding:8px;">Dias</th>
            </tr>`;
        vencidos.forEach(p => {
            html += `<tr>
                <td style="border:1px solid #ccc; padding:8px;">${p.eam}</td>
                <td style="border:1px solid #ccc; padding:8px;">${p.descricao}</td>
                <td style="border:1px solid #ccc; padding:8px;">${formatarDataBR(p.validade)}</td
                <td style="border:1px solid #ccc; padding:8px;">${Math.abs(calcularDiasRestantes(p.validade))} dias</td
            </tr>`;
        });
        html += `</table>`;
    } else {
        html += `<p>✅ Nenhum produto vencido</p>`;
    }
    html += `</div>`;
    
    // 30%
    html += `<div style="margin-bottom: 30px;">
        <h3 style="background:#dd6b20; color:white; padding:10px;">🟠 30% DESCONTO (até 60 dias)</h3>`;
    if (p30.length) {
        html += `<table style="width:100%; border-collapse:collapse;">
            <tr style="background:#1e3c72; color:white;">
                <th style="border:1px solid #ccc; padding:8px;">EAN</th>
                <th style="border:1px solid #ccc; padding:8px;">Descrição</th>
                <th style="border:1px solid #ccc; padding:8px;">Validade</th>
                <th style="border:1px solid #ccc; padding:8px;">Dias</th>
            </tr>`;
        p30.forEach(p => {
            html += `<tr>
                <td style="border:1px solid #ccc; padding:8px;">${p.eam}</td>
                <td style="border:1px solid #ccc; padding:8px;">${p.descricao}</td>
                <td style="border:1px solid #ccc; padding:8px;">${formatarDataBR(p.validade)}</td
                <td style="border:1px solid #ccc; padding:8px;">${calcularDiasRestantes(p.validade)} dias</td
            </tr>`;
        });
        html += `</table>`;
    } else {
        html += `<p>✅ Nenhum produto com 30% de desconto</p>`;
    }
    html += `</div>`;
    
    // 20%
    html += `<div style="margin-bottom: 30px;">
        <h3 style="background:#b7791f; color:white; padding:10px;">🟡 20% DESCONTO (61 a 90 dias)</h3>`;
    if (p20.length) {
        html += `<table style="width:100%; border-collapse:collapse;">
            <tr style="background:#1e3c72; color:white;">
                <th style="border:1px solid #ccc; padding:8px;">EAN</th>
                <th style="border:1px solid #ccc; padding:8px;">Descrição</th>
                <th style="border:1px solid #ccc; padding:8px;">Validade</th>
                <th style="border:1px solid #ccc; padding:8px;">Dias</th>
            </tr>`;
        p20.forEach(p => {
            html += `<tr>
                <td style="border:1px solid #ccc; padding:8px;">${p.eam}</td>
                <td style="border:1px solid #ccc; padding:8px;">${p.descricao}</td>
                <td style="border:1px solid #ccc; padding:8px;">${formatarDataBR(p.validade)}</td
                <td style="border:1px solid #ccc; padding:8px;">${calcularDiasRestantes(p.validade)} dias</td
            </tr>`;
        });
        html += `</table>`;
    } else {
        html += `<p>✅ Nenhum produto com 20% de desconto</p>`;
    }
    html += `</div>`;
    
    relatorioDiv.innerHTML = html;
}

// IMPRIMIR RELATÓRIO (SEM GRÁFICO, SÓ DADOS)
async function imprimirRelatorio() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const produtos = await response.json();
    
    const vencidos = produtos.filter(p => calcularDiasRestantes(p.validade) < 0);
    const p30 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 0 && d <= 60; });
    const p20 = produtos.filter(p => { const d = calcularDiasRestantes(p.validade); return d > 60 && d <= 90; });
    
    if (vencidos.length > 0) {
        if (!confirm(`${vencidos.length} produto(s) vencido(s) serão removidos. Continuar?`)) return;
        for (const p of vencidos) {
            await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?id=eq.${p.id}`, {
                method: 'DELETE',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
        }
        alert(`${vencidos.length} produto(s) removidos!`);
    }
    
    let html = `<h2 style="text-align:center;">📊 RELATÓRIO DE VALIDADE</h2>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Total de produtos:</strong> ${produtos.length}</p>
                <hr>`;
    
    html += `<div><h3 style="background:#c53030; color:white; padding:10px;">🔴 PRODUTOS VENCIDOS</h3>`;
    if (vencidos.length) {
        html += `<table style="width:100%; border-collapse:collapse;">
                    <tr style="background:#1e3c72; color:white;">
                        <th style="border:1px solid #ccc; padding:8px;">EAN</th>
                        <th style="border:1px solid #ccc; padding:8px;">Descrição</th>
                        <th style="border:1px solid #ccc; padding:8px;">Validade</th>
                        <th style="border:1px solid #ccc; padding:8px;">Dias</th>
                    </tr>`;
        vencidos.forEach(p => {
            html += `<tr>
                        <td style="border:1px solid #ccc; padding:8px;">${p.eam}</td>
                        <td style="border:1px solid #ccc; padding:8px;">${p.descricao}</td>
                        <td style="border:1px solid #ccc; padding:8px;">${formatarDataBR(p.validade)}</td
                        <td style="border:1px solid #ccc; padding:8px;">${Math.abs(calcularDiasRestantes(p.validade))} dias</td
                    </tr>`;
        });
        html += `</table>`;
    } else {
        html += `<p>✅ Nenhum produto vencido</p>`;
    }
    html += `</div>`;
    
    html += `<div><h3 style="background:#dd6b20; color:white; padding:10px;">🟠 30% DESCONTO</h3>`;
    if (p30.length) {
        html += `<table style="width:100%; border-collapse:collapse;">
                    <tr style="background:#1e3c72; color:white;">
                        <th style="border:1px solid #ccc; padding:8px;">EAN</th>
                        <th style="border:1px solid #ccc; padding:8px;">Descrição</th>
                        <th style="border:1px solid #ccc; padding:8px;">Validade</th>
                        <th style="border:1px solid #ccc; padding:8px;">Dias</th>
                    </tr>`;
        p30.forEach(p => {
            html += `<td>
                        <td style="border:1px solid #ccc; padding:8px;">${p.eam}</td>
                        <td style="border:1px solid #ccc; padding:8px;">${p.descricao}</td>
                        <td style="border:1px solid #ccc; padding:8px;">${formatarDataBR(p.validade)}</td
                        <td style="border:1px solid #ccc; padding:8px;">${calcularDiasRestantes(p.validade)} dias</td
                    </tr>`;
        });
        html += `</table>`;
    } else {
        html += `<p>✅ Nenhum produto com 30% de desconto</p>`;
    }
    html += `</div>`;
    
    html += `<div><h3 style="background:#b7791f; color:white; padding:10px;">🟡 20% DESCONTO</h3>`;
    if (p20.length) {
        html += `<table style="width:100%; border-collapse:collapse;">
                    <tr style="background:#1e3c72; color:white;">
                        <th style="border:1px solid #ccc; padding:8px;">EAN</th>
                        <th style="border:1px solid #ccc; padding:8px;">Descrição</th>
                        <th style="border:1px solid #ccc; padding:8px;">Validade</th>
                        <th style="border:1px solid #ccc; padding:8px;">Dias</th>
                    </tr>`;
        p20.forEach(p => {
            html += `<tr>
                        <td style="border:1px solid #ccc; padding:8px;">${p.eam}</td>
                        <td style="border:1px solid #ccc; padding:8px;">${p.descricao}</td>
                        <td style="border:1px solid #ccc; padding:8px;">${formatarDataBR(p.validade)}</td
                        <td style="border:1px solid #ccc; padding:8px;">${calcularDiasRestantes(p.validade)} dias</td
                    </tr>`;
        });
        html += `</table>`;
    } else {
        html += `<p>✅ Nenhum produto com 20% de desconto</p>`;
    }
    html += `</div>`;
    
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up bloqueado! Permita pop-ups.'); return; }
    win.document.write(`<html><head><title>Relatório de Validade</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            @media print { body { margin: 0; padding: 10px; } }
        </style>
    </head><body>${html}<script>window.onload = () => { setTimeout(() => window.print(), 500); }<\/script></body></html>`);
    win.document.close();
}

// EVENTOS
buscarBtn.onclick = () => { if (codigoInput.value.trim()) buscarProduto(codigoInput.value.trim()); };
codigoInput.onkeypress = (e) => { if (e.key === 'Enter' && codigoInput.value.trim()) buscarProduto(codigoInput.value.trim()); };
gerarRelatorioBtn.onclick = gerarRelatorio;
imprimirRemoverBtn.onclick = imprimirRelatorio;
codigoInput.focus();

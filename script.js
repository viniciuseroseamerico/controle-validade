// =============================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================
const SUPABASE_URL = 'https://zqmvpqvkvyuvuatbsrlv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PAukwIprVTGAum9ElAzbBA_WcBMh6St';

// =============================================
// ELEMENTOS DA TELA
// =============================================
const codigoInput = document.getElementById('codigo');
const buscarBtn = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');
const loadingDiv = document.getElementById('loading');
const gerarRelatorioBtn = document.getElementById('gerarRelatorioBtn');
const imprimirRemoverBtn = document.getElementById('imprimirRemoverBtn');
const relatorioDiv = document.getElementById('relatorio');

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
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

function mostrarMensagem(mensagem, tipo) {
    resultadoDiv.innerHTML = `<div class="mensagem-${tipo}">${mensagem}</div>`;
}

// =============================================
// FUNÇÃO DE CADASTRO
// =============================================
async function cadastrarProduto(ean, descricao, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) {
        alert('Data inválida. Use DD/MM/AAAA');
        return;
    }
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'block';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                eam: ean,
                descricao: descricao,
                validade: validadeISO
            })
        });
        
        loadingDiv.style.display = 'none';
        
        if (response.ok) {
            alert('✅ Produto cadastrado com sucesso!');
            codigoInput.value = '';
            codigoInput.focus();
            resultadoDiv.innerHTML = '';
        } else {
            alert('❌ Erro ao cadastrar produto');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        alert('Erro: ' + error.message);
    }
}

// =============================================
// FUNÇÃO DE ADICIONAR VALIDADE
// =============================================
async function adicionarNovaValidade(ean, descricao, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) {
        alert('Data inválida. Use DD/MM/AAAA');
        return;
    }
    const validadeISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
    loadingDiv.style.display = 'block';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                eam: ean,
                descricao: descricao,
                validade: validadeISO
            })
        });
        
        loadingDiv.style.display = 'none';
        
        if (response.ok) {
            alert('✅ Nova validade adicionada!');
            buscarProduto(ean);
        } else {
            alert('❌ Erro ao adicionar validade');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        alert('Erro: ' + error.message);
    }
}

// =============================================
// FUNÇÃO DE BUSCA
// =============================================
async function buscarProduto(ean) {
    loadingDiv.style.display = 'block';
    resultadoDiv.innerHTML = '';
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/produtos_validade?eam=eq.${ean}&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const produtos = await response.json();
        loadingDiv.style.display = 'none';
        
        if (produtos.length === 0) {
            // Produto não cadastrado - mostrar formulário
            resultadoDiv.innerHTML = `
                <div class="nao-encontrado">⚠️ PRODUTO NÃO CADASTRADO!</div>
                <div class="form-cadastro">
                    <h4>📝 Cadastrar novo produto:</h4>
                    <input type="text" id="novaDescricao" placeholder="Descrição do produto" style="width:100%; margin-bottom:10px;">
                    <input type="text" id="novaValidade" placeholder="Data de validade (DD/MM/AAAA)" maxlength="10">
                    <button id="salvarProdutoBtn" class="btn-salvar" style="margin-top:10px;">💾 Cadastrar Produto</button>
                </div>
            `;
            document.getElementById('salvarProdutoBtn').onclick = () => {
                const descricao = document.getElementById('novaDescricao').value;
                const validade = document.getElementById('novaValidade').value;
                if (descricao && validade) {
                    cadastrarProduto(ean, descricao, validade);
                } else {
                    alert('Preencha descrição e data');
                }
            };
        } else {
            // Produto existe - mostrar dados e formulário para nova validade
            let html = `<h3>📦 Produto encontrado (${produtos.length} lote(s)):</h3>`;
            
            produtos.forEach(produto => {
                const dias = calcularDiasRestantes(produto.validade);
                let acaoPrincipal = '';
                if (dias < 0) acaoPrincipal = '🔴 RETIRAR DO ESTOQUE';
                else if (dias <= 60) acaoPrincipal = '🟠 AÇÃO 30% DESCONTO';
                else if (dias <= 90) acaoPrincipal = '🟡 AÇÃO 20% DESCONTO';
                else acaoPrincipal = '✅ NORMAL';
                
                html += `
                    <div class="produto-info" style="border-left:4px solid #1e3c72; padding:10px; margin:10px 0; background:#f9f9f9;">
                        <p><strong>📝 Descrição:</strong> ${produto.descricao}</p>
                        <p><strong>📅 Validade:</strong> ${formatarDataBR(produto.validade)}</p>
                        <p><strong>⏰ Dias restantes:</strong> ${dias} dias</p>
                        <p><strong>🎯 AÇÃO:</strong> ${acaoPrincipal}</p>
                    </div>
                `;
            });
            
            html += `
                <div class="form-cadastro" style="margin-top:20px; padding-top:15px; border-top:1px solid #ddd;">
                    <h4>➕ Adicionar nova data de validade (novo lote):</h4>
                    <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)" maxlength="10">
                    <button id="salvarNovaValidadeBtn" class="btn-salvar" style="margin-top:10px;">💾 Salvar nova validade</button>
                </div>
            `;
            
            resultadoDiv.innerHTML = html;
            
            document.getElementById('salvarNovaValidadeBtn').onclick = () => {
                const novaValidade = document.getElementById('novaValidade').value;
                if (novaValidade) {
                    adicionarNovaValidade(ean, produtos[0].descricao, novaValidade);
                } else {
                    alert('Digite uma data válida');
                }
            };
        }
        
        codigoInput.value = '';
        codigoInput.focus();
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        mostrarMensagem('Erro ao buscar: ' + error.message, 'erro');
        codigoInput.value = '';
        codigoInput.focus();
    }
}

// =============================================
// FUNÇÃO GERAR RELATÓRIO
// =============================================
async function gerarRelatorio() {
    relatorioDiv.innerHTML = '<div class="loading">⏳ Gerando relatório...</div>';
    relatorioDiv.style.display = 'block';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        const produtos = await response.json();
        
        if (produtos.length === 0) {
            relatorioDiv.innerHTML = '<p>Nenhum produto cadastrado.</p>';
            return;
        }
        
        const vencidos = [];
        const promocao30 = [];
        const promocao20 = [];
        
        produtos.forEach(produto => {
            const dias = calcularDiasRestantes(produto.validade);
            if (dias < 0) {
                vencidos.push(produto);
            } else if (dias <= 60) {
                promocao30.push(produto);
            } else if (dias <= 90) {
                promocao20.push(produto);
            }
        });
        
        let html = `
            <div class="relatorio-container">
                <h2>📊 RELATÓRIO DE VALIDADE</h2>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Total de produtos:</strong> ${produtos.length}</p>
                <hr>
        `;
        
        // Vencidos
        html += `<div class="secao-vencidos"><h3>🔴 PRODUTOS VENCIDOS (RETIRAR)</h3>`;
        if (vencidos.length > 0) {
            html += `<table class="tabela-relatorio"><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
            vencidos.forEach(p => {
                html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${Math.abs(calcularDiasRestantes(p.validade))}</td></tr>`;
            });
            html += `</table>`;
        } else {
            html += `<p>✅ Nenhum produto vencido</p>`;
        }
        html += `</div>`;
        
        // 30%
        html += `<div class="secao-30"><h3>🟠 PRODUTOS 30% DESCONTO</h3>`;
        if (promocao30.length > 0) {
            html += `<table class="tabela-relatorio"><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
            promocao30.forEach(p => {
                html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`;
            });
            html += `</table>`;
        } else {
            html += `<p>✅ Nenhum produto com 30%</p>`;
        }
        html += `</div>`;
        
        // 20%
        html += `<div class="secao-20"><h3>🟡 PRODUTOS 20% DESCONTO</h3>`;
        if (promocao20.length > 0) {
            html += `<table class="tabela-relatorio"><tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias</th></tr>`;
            promocao20.forEach(p => {
                html += `<tr><td>${p.eam}</td><td>${p.descricao}</td><td>${formatarDataBR(p.validade)}</td><td>${calcularDiasRestantes(p.validade)}</td></tr>`;
            });
            html += `</table>`;
        } else {
            html += `<p>✅ Nenhum produto com 20%</p>`;
        }
        html += `</div>`;
        
        html += `</div>`;
        relatorioDiv.innerHTML = html;
        
    } catch (error) {
        relatorioDiv.innerHTML = `<div class="mensagem-erro">Erro: ${error.message}</div>`;
    }
}

// =============================================
// FUNÇÃO IMPRIMIR
// =============================================
function abrirJanelaImpressao() {
    const conteudo = relatorioDiv.innerHTML;
    const win = window.open('', '_blank');
    
    if (!win) {
        alert('Pop-up bloqueado! Permita pop-ups para este site.');
        return;
    }
    
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Validade</title>
            <style>
                body { font-family: Arial; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background: #1e3c72; color: white; }
                .secao-vencidos h3 { background: #c53030; color: white; padding: 10px; }
                .secao-30 h3 { background: #dd6b20; color: white; padding: 10px; }
                .secao-20 h3 { background: #b7791f; color: white; padding: 10px; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>${conteudo}<script>window.onload = () => { setTimeout(() => window.print(), 500); }<\/script></body>
        </html>
    `);
    win.document.close();
}

async function imprimirERemoverVencidos() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?validade=lt.${new Date().toISOString().split('T')[0]}`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    
    const vencidos = await response.json();
    
    if (vencidos.length === 0) {
        abrirJanelaImpressao();
        return;
    }
    
    if (!confirm(`⚠️ ${vencidos.length} produto(s) vencido(s) serão removidos. Continuar?`)) return;
    
    for (const produto of vencidos) {
        await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?id=eq.${produto.id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
    }
    
    await gerarRelatorio();
    abrirJanelaImpressao();
}

// =============================================
// EVENTOS
// =============================================
buscarBtn.onclick = () => {
    const ean = codigoInput.value.trim();
    if (ean) buscarProduto(ean);
    else mostrarMensagem('Digite ou escaneie um código', 'erro');
};

codigoInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
        const ean = codigoInput.value.trim();
        if (ean) buscarProduto(ean);
    }
};

gerarRelatorioBtn.onclick = gerarRelatorio;
imprimirRemoverBtn.onclick = imprimirERemoverVencidos;

codigoInput.focus();

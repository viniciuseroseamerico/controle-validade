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
// UTILITÁRIOS
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function determinarStatus(diasRestantes) {
    if (diasRestantes < 0) {
        return { status: 'Vencido', acao: 'RETIRAR DO ESTOQUE', cor: 'red', desconto: 0 };
    } else if (diasRestantes <= 30) {
        return { status: 'Atenção', acao: 'AÇÃO RÁPIDA - 30 DIAS', cor: 'orange', desconto: 0 };
    } else if (diasRestantes <= 60) {
        return { status: 'Promoção 30%', acao: 'APLICAR 30% DESCONTO', cor: 'orange', desconto: 30 };
    } else if (diasRestantes <= 90) {
        return { status: 'Promoção 20%', acao: 'APLICAR 20% DESCONTO', cor: 'yellow', desconto: 20 };
    } else {
        return { status: 'Normal', acao: 'NENHUMA', cor: 'green', desconto: 0 };
    }
}

function mostrarMensagem(mensagem, tipo = 'erro') {
    resultadoDiv.innerHTML = `<div class="mensagem-${tipo}">${mensagem}</div>`;
}

// =============================================
// FUNÇÕES DO SCANNER
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
            mostrarFormularioCadastro(ean);
        } else {
            mostrarProdutos(produtos, ean);
        }
        
        // 🔄 NOVO: Limpar o campo e focar para o próximo escaneamento
        codigoInput.value = '';
        codigoInput.focus();
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        mostrarMensagem(`Erro ao buscar produto: ${error.message}`, 'erro');
        // Mesmo com erro, limpa o campo
        codigoInput.value = '';
        codigoInput.focus();
    }
}

function mostrarProdutos(produtos, ean) {
    let html = `<h3>📦 Produto encontrado (${produtos.length} lote(s)):</h3>`;
    
    produtos.forEach(produto => {
        const dias = calcularDiasRestantes(produto.validade);
        const statusInfo = determinarStatus(dias);
        const dataFormatada = formatarDataBR(produto.validade);
        
        let acaoPrincipal = '';
        if (dias < 0) {
            acaoPrincipal = '🔴 RETIRAR DO ESTOQUE';
        } else if (dias <= 60) {
            acaoPrincipal = '🟠 AÇÃO 30% DESCONTO';
        } else if (dias <= 90) {
            acaoPrincipal = '🟡 AÇÃO 20% DESCONTO';
        } else {
            acaoPrincipal = '✅ NORMAL';
        }
        
        html += `
            <div class="produto-info">
                <p><strong>📝 Descrição:</strong> ${produto.descricao}</p>
                <p><strong>📅 Validade:</strong> ${dataFormatada}</p>
                <p><strong>⏰ Dias restantes:</strong> ${dias} dias</p>
                <p><strong>🎯 AÇÃO PRINCIPAL:</strong> ${acaoPrincipal}</p>
                <p><strong>📊 Status:</strong> ${statusInfo.status}</p>
            </div>
        `;
    });
    
    html += `
        <div class="form-cadastro">
            <h4>➕ Adicionar nova data de validade (novo lote):</h4>
            <input type="text" id="novaValidade" placeholder="Data (DD/MM/AAAA)" maxlength="10">
            <button id="salvarNovaValidadeBtn" class="btn-salvar">💾 Salvar nova validade</button>
        </div>
    `;
    
    resultadoDiv.innerHTML = html;
    
    document.getElementById('salvarNovaValidadeBtn').addEventListener('click', () => {
        const novaValidade = document.getElementById('novaValidade').value;
        if (novaValidade) {
            adicionarNovaValidade(ean, produtos[0].descricao, novaValidade);
        } else {
            mostrarMensagem('Digite uma data válida', 'erro');
        }
    });
}

async function adicionarNovaValidade(ean, descricao, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) {
        mostrarMensagem('Data inválida. Use o formato DD/MM/AAAA', 'erro');
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
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                eam: ean,
                descricao: descricao,
                validade: validadeISO
            })
        });
        
        loadingDiv.style.display = 'none';
        
        if (response.ok) {
            mostrarMensagem(`✅ Nova validade adicionada com sucesso!`, 'sucesso');
            setTimeout(() => buscarProduto(ean), 1500);
        } else {
            mostrarMensagem(`Erro ao adicionar validade`, 'erro');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        mostrarMensagem(`Erro: ${error.message}`, 'erro');
    }
}

function mostrarFormularioCadastro(ean) {
    resultadoDiv.innerHTML = `
        <div class="nao-encontrado">
            ⚠️ PRODUTO NÃO CADASTRADO!
        </div>
        <div class="form-cadastro">
            <h4>📝 Cadastrar novo produto:</h4>
            <input type="text" id="novaDescricao" placeholder="Descrição do produto" style="width: 100%;">
            <input type="text" id="novaValidade" placeholder="Data de validade (DD/MM/AAAA)" maxlength="10">
            <button id="salvarProdutoBtn" class="btn-salvar">💾 Cadastrar Produto</button>
        </div>
    `;
    
    document.getElementById('salvarProdutoBtn').addEventListener('click', () => {
        const descricao = document.getElementById('novaDescricao').value;
        const validade = document.getElementById('novaValidade').value;
        
        if (!descricao || !validade) {
            mostrarMensagem('Preencha descrição e data de validade', 'erro');
            return;
        }
        
        cadastrarProduto(ean, descricao, validade);
    });
}

async function cadastrarProduto(ean, descricao, validadeBR) {
    const partes = validadeBR.split('/');
    if (partes.length !== 3) {
        mostrarMensagem('Data inválida. Use o formato DD/MM/AAAA', 'erro');
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
            mostrarMensagem(`✅ Produto cadastrado com sucesso!`, 'sucesso');
            codigoInput.value = '';
            codigoInput.focus();
        } else {
            mostrarMensagem(`Erro ao cadastrar produto`, 'erro');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        mostrarMensagem(`Erro: ${error.message}`, 'erro');
    }
}

// =============================================
// FUNÇÕES DO RELATÓRIO
// =============================================

async function gerarRelatorio() {
    relatorioDiv.innerHTML = '<div class="loading">⏳ Gerando relatório...</div>';
    relatorioDiv.classList.add('ativo');
    
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
                vencidos.push({ ...produto, dias });
            } else if (dias <= 60) {
                promocao30.push({ ...produto, dias });
            } else if (dias <= 90) {
                promocao20.push({ ...produto, dias });
            }
        });
        
        const total = produtos.length;
        const percentualVencidos = ((vencidos.length / total) * 100).toFixed(1);
        const percentual30 = ((promocao30.length / total) * 100).toFixed(1);
        const percentual20 = ((promocao20.length / total) * 100).toFixed(1);
        
        let html = `
            <div class="relatorio-container">
                <h2>📊 RELATÓRIO DE VALIDADE</h2>
                <p><strong>Data de geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Total de produtos:</strong> ${total}</p>
                
                <div class="grafico-pizza" style="margin: 20px 0; text-align: center;">
                    <div style="display: inline-block; width: 200px; height: 200px; border-radius: 50%; background: conic-gradient(
                        #e53e3e 0% ${percentualVencidos}%,
                        #ed8936 ${percentualVencidos}% ${parseFloat(percentualVencidos) + parseFloat(percentual30)}%,
                        #ecc94b ${parseFloat(percentualVencidos) + parseFloat(percentual30)}% ${parseFloat(percentualVencidos) + parseFloat(percentual30) + parseFloat(percentual20)}%,
                        #48bb78 ${parseFloat(percentualVencidos) + parseFloat(percentual30) + parseFloat(percentual20)}% 100%
                    );"></div>
                    <div style="margin-top: 15px;">
                        <p><span style="color:#e53e3e">🔴</span> Vencidos: ${percentualVencidos}%</p>
                        <p><span style="color:#ed8936">🟠</span> 30% OFF: ${percentual30}%</p>
                        <p><span style="color:#ecc94b">🟡</span> 20% OFF: ${percentual20}%</p>
                    </div>
                </div>
                <hr>
        `;
        
        if (vencidos.length > 0) {
            html += `<div class="secao-relatorio secao-vencidos">
                <h3>🔴 PRODUTOS VENCIDOS (RETIRAR) - ${vencidos.length} produtos (${percentualVencidos}%)</h3>
                <table class="tabela-relatorio">
                    <tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias vencido</th></tr>`;
            vencidos.forEach(p => {
                html += `<tr>
                    <td>${p.eam}</td>
                    <td>${p.descricao}</td>
                    <td>${formatarDataBR(p.validade)}</td>
                    <td style="color:red">${Math.abs(p.dias)} dias</td>
                </tr>`;
            });
            html += `</table></div>`;
        }
        
        if (promocao30.length > 0) {
            html += `<div class="secao-relatorio secao-30">
                <h3>🟠 PRODUTOS 30% DESCONTO - ${promocao30.length} produtos (${percentual30}%)</h3>
                <table class="tabela-relatorio">
                    <tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias restantes</th></tr>`;
            promocao30.forEach(p => {
                html += `<tr>
                    <td>${p.eam}</td>
                    <td>${p.descricao}</td>
                    <td>${formatarDataBR(p.validade)}</td>
                    <td style="color:#ed8936">${p.dias} dias</td>
                </tr>`;
            });
            html += `</table></div>`;
        }
        
        if (promocao20.length > 0) {
            html += `<div class="secao-relatorio secao-20">
                <h3>🟡 PRODUTOS 20% DESCONTO - ${promocao20.length} produtos (${percentual20}%)</h3>
                <table class="tabela-relatorio">
                    <tr><th>EAN</th><th>Descrição</th><th>Validade</th><th>Dias restantes</th></tr>`;
            promocao20.forEach(p => {
                html += `<tr>
                    <td>${p.eam}</td>
                    <td>${p.descricao}</td>
                    <td>${formatarDataBR(p.validade)}</td>
                    <td style="color:#ecc94b">${p.dias} dias</td>
                </tr>`;
            });
            html += `</table></div>`;
        }
        
        html += `</div>`;
        relatorioDiv.innerHTML = html;
        
    } catch (error) {
        relatorioDiv.innerHTML = `<div class="mensagem-erro">Erro ao gerar relatório: ${error.message}</div>`;
    }
}

async function imprimirERemoverVencidos() {
    // Buscar produtos vencidos
    const response = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?validade=lt.${new Date().toISOString().split('T')[0]}`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    
    const vencidos = await response.json();
    
    if (vencidos.length === 0) {
        alert('✅ Não há produtos vencidos para remover!');
        return;
    }
    
    const confirmar = confirm(`⚠️ ATENÇÃO! ${vencidos.length} produto(s) vencido(s) serão removidos. Continuar?`);
    
    if (!confirmar) return;
    
    // Remover produtos vencidos
    let removidos = 0;
    for (const produto of vencidos) {
        const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/produtos_validade?id=eq.${produto.id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (deleteResponse.ok) {
            removidos++;
        }
    }
    
    alert(`✅ ${removidos} produto(s) removidos!`);
    
    // Gerar relatório atualizado
    await gerarRelatorio();
    
    // 🔧 VERSÃO ALTERNATIVA: Criar um link de impressão
    setTimeout(() => {
        const relatorioContent = document.getElementById('relatorio');
        
        if (!relatorioContent || !relatorioContent.innerHTML) {
            alert('Erro: Relatório não encontrado');
            return;
        }
        
        // Criar um elemento temporário para impressão
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'absolute';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
        
        const frameDoc = printFrame.contentWindow.document;
        frameDoc.write(`
            <html>
            <head>
                <title>Relatório de Validade</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #1e3c72; color: white; }
                    .secao-vencidos h3 { background: #c53030; color: white; padding: 10px; }
                    .secao-30 h3 { background: #dd6b20; color: white; padding: 10px; }
                    .secao-20 h3 { background: #b7791f; color: white; padding: 10px; }
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                ${relatorioContent.innerHTML}
            </body>
            </html>
        `);
        frameDoc.close();
        
        // Imprimir o iframe
        printFrame.contentWindow.print();
        
        // Remover o iframe após a impressão
        setTimeout(() => {
            document.body.removeChild(printFrame);
        }, 1000);
    }, 1000);
}
// =============================================
// EVENTOS
// =============================================

buscarBtn.addEventListener('click', () => {
    const ean = codigoInput.value.trim();
    if (ean) {
        buscarProduto(ean);
    } else {
        mostrarMensagem('Digite ou escaneie um código de barras', 'erro');
    }
});

codigoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const ean = codigoInput.value.trim();
        if (ean) {
            buscarProduto(ean);
        }
   // FUNÇÃO DE TESTE - IMPRESSÃO DIRETA
function testarImpressao() {
    const relatorioContent = document.getElementById('relatorio');
    
    if (!relatorioContent) {
        alert('Elemento relatorio não encontrado!');
        return;
    }
    
    if (!relatorioContent.innerHTML || relatorioContent.innerHTML.trim() === '') {
        alert('Relatório está vazio! Gere o relatório primeiro.');
        return;
    }
    
    alert('Preparando impressão...'); // Teste 1
    
    const win = window.open();
    
    if (!win) {
        alert('Pop-up bloqueado! Permita pop-ups para este site.');
        return;
    }
    
    alert('Janela aberta!'); // Teste 2
    
    win.document.write(`
        <html>
        <head>
            <title>Teste de Impressão</title>
        </head>
        <body>
            <h1>Teste</h1>
            <p>Se você está vendo isso, a janela funcionou!</p>
            ${relatorioContent.innerHTML}
        </body>
        </html>
    `);
    win.document.close();
    
    alert('Conteúdo escrito!'); // Teste 3
    
    win.print();
    
    alert('Print chamado!'); // Teste 4
} }
});

gerarRelatorioBtn.addEventListener('click', gerarRelatorio);
imprimirRemoverBtn.addEventListener('click', imprimirERemoverVencidos);

codigoInput.focus();

// app.js?v=4.1

// ====================
// 🔧 CONFIGURAÇÃO ÚNICA
// ====================

const VERSAO_ATUAL = "20260211_0000_R04";

const configRodada = {
    nomeBolao: "⚽ Bolão Campeonato Brasileiro 2026",
    numeroRodada: "RODADA 04",
    dataInicio: "25/02/2026",
    dataLimite: "24/02/2026"
};

const jogosRodada = [
    { id: "1", timeA: "Flamengo RJ", timeB: "Mirassol SP" },
    { id: "2", timeA: "Botafogo RJ", timeB: "Vitória BA" },
    { id: "3", timeA: "Santos SP", timeB: "Vasco RJ" },
    { id: "4", timeA: "Palmeiras SP", timeB: "Fluminense RJ" },
    { id: "5", timeA: "Bragantino SP", timeB: "Athletico PR" },
    { id: "6", timeA: "Cruzeiro MG", timeB: "Corinthians SP" },
    { id: "7", timeA: "Grêmio RS", timeB: "Atlético MG" },
    { id: "8", timeA: "Coritiba PR", timeB: "São Paulo SP" },
    { id: "9", timeA: "Bahia BA", timeB: "Chapecoense SC" },
    { id: "10", timeA: "Remo PA", timeB: "Internacional RS" }
];

const CONFIG_GOOGLE_FORMS = {
    url: 'https://docs.google.com/forms/d/1haBOnuTc65ZE9wcM9N64b7-hgVauhE0JptwIk1eUDWQ/formResponse',
    entryIds: [
        'entry.26241625', // Rodada
        'entry.39347237', // Time A
        'entry.654774410', // Palpite A
        'entry.514438451', // Palpite B
        'entry.1360858266', // Time B
        'entry.1629904542', // Participante
        'entry.1686925319'  // Data e Hora
    ]
};

// ====================
// 🚀 SISTEMA DE ATUALIZAÇÃO
// ====================

(function iniciarSistemaAtualizacao() {
    const versaoSalva = localStorage.getItem('bolao_versao_atual');
    
    if (!versaoSalva || versaoSalva !== VERSAO_ATUAL) {
        localStorage.setItem('bolao_versao_atual', VERSAO_ATUAL);
        const url = new URL(window.location);
        url.searchParams.set('_v', VERSAO_ATUAL.replace(/[^a-zA-Z0-9]/g, ''));
        
        if (window.location.href !== url.toString()) {
            window.location.replace(url.toString());
        }
    }
})();

// ====================
// ⚽ LÓGICA DO BOLÃO
// ====================

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

let dadosApp = {
    participante: '',
    rodadaSalva: '',
    palpitesSalvos: [],
    dadosEnviados: false,
    dadosCompartilhados: false,
    tentativaForaPrazo: null,
    ultimoErroEnvio: null,
    erroInternet: false
};

// ====================
// 🆕 SISTEMA DE TOAST NOTIFICATION
// ====================

function mostrarToast(mensagem, tipo = 'success') {
    // Remove toast existente se houver
    const toastExistente = document.querySelector('.toast-notification');
    if (toastExistente) {
        toastExistente.remove();
    }

    // Cria o toast
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${tipo}`;
    
    let icone = '';
    if (tipo === 'success') icone = '<i class="bi bi-check-circle-fill me-2"></i>';
    if (tipo === 'warning') icone = '<i class="bi bi-exclamation-triangle-fill me-2"></i>';
    if (tipo === 'info') icone = '<i class="bi bi-info-circle-fill me-2"></i>';
    
    toast.innerHTML = `
        ${icone}
        <span class="flex-grow-1">${mensagem}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// ====================
// 🆕 SALVAMENTO AUTOMÁTICO
// ====================

function salvarPalpiteAutomatico(jogoId) {
    const placarA = document.querySelector(`select[name="placarA-${jogoId}"]`);
    const placarB = document.querySelector(`select[name="placarB-${jogoId}"]`);
    
    // Só salva se ambos os placares estiverem preenchidos
    if (placarA && placarB && placarA.value && placarB.value) {
        
        // Busca palpites atuais
        const palpites = [];
        
        jogosRodada.forEach(jogo => {
            const pA = document.querySelector(`select[name="placarA-${jogo.id}"]`);
            const pB = document.querySelector(`select[name="placarB-${jogo.id}"]`);
            
            palpites.push({
                jogoId: jogo.id,
                timeA: jogo.timeA,
                placarA: pA && pA.value ? pA.value : '',
                timeB: jogo.timeB,
                placarB: pB && pB.value ? pB.value : ''
            });
        });

        const palpiteRodada = {
            timestamp: new Date().toISOString(),
            data_hora: new Date().toLocaleString('pt-BR'),
            data_hora_palpite: '', // Só preenchida no envio
            participante: dadosApp.participante,
            rodada: configRodada.numeroRodada,
            palpites: palpites
        };

        // Atualiza os palpites salvos
        if (dadosApp.palpitesSalvos.length > 0) {
            dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1] = palpiteRodada;
        } else {
            dadosApp.palpitesSalvos.push(palpiteRodada);
        }
        
        salvarDados();
        
        // Mostra feedback visual
        const jogo = jogosRodada.find(j => j.id === jogoId);
        mostrarToast(`✅ Palpite do Jogo ${jogoId} (${jogo.timeA} x ${jogo.timeB}) salvo!`, 'success');
    }
}

// ====================
// 🆕 CARREGAR PALPITES SALVOS
// ====================

function carregarPalpitesSalvos() {
    if (dadosApp.palpitesSalvos.length > 0) {
        const ultimoPalpite = dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1];
        
        jogosRodada.forEach(jogo => {
            const palpiteSalvo = ultimoPalpite.palpites.find(p => p.jogoId === jogo.id);
            if (palpiteSalvo && palpiteSalvo.placarA && palpiteSalvo.placarB) {
                const placarA = document.querySelector(`select[name="placarA-${jogo.id}"]`);
                const placarB = document.querySelector(`select[name="placarB-${jogo.id}"]`);
                
                if (placarA && placarB) {
                    placarA.value = palpiteSalvo.placarA;
                    placarB.value = palpiteSalvo.placarB;
                }
            }
        });
        
        // Mostra toast informativo apenas se houver palpites salvos
        const totalPreenchidos = ultimoPalpite.palpites.filter(p => p.placarA && p.placarB).length;
        if (totalPreenchidos > 0) {
            mostrarToast(`📋 ${totalPreenchidos} palpites carregados do rascunho`, 'info');
        }
    }
}

function formatarDataHora() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} - ${horas}:${minutos}:${segundos}`;
}

function gerarOpcoesSelect(valorSelecionado = '') {
    let opcoes = '<option value="">--</option>';
    for (let i = 0; i <= 10; i++) {
        const selecionado = valorSelecionado === i.toString() ? 'selected' : '';
        opcoes += `<option value="${i}" ${selecionado}>${i}</option>`;
    }
    return opcoes;
}

function converterDataStringParaDate(dataString) {
    const partes = dataString.split('/');
    return new Date(partes[2], partes[1] - 1, partes[0], 23, 59, 59);
}

function verificarPrazoValido() {
    if (dadosApp.tentativaForaPrazo) {
        return false;
    }
    
    const hoje = new Date();
    const dataLimiteObj = converterDataStringParaDate(configRodada.dataLimite);
    
    if (hoje > dataLimiteObj) {
        if (!dadosApp.tentativaForaPrazo) {
            dadosApp.tentativaForaPrazo = {
                timestamp: new Date().toISOString(),
                dataHora: formatarDataHora(),
                rodada: configRodada.numeroRodada
            };
            salvarDados();
        }
        return false;
    }
    
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('touchmove', function(e) {
        if (e.target.tagName === 'SELECT') {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchstart', function() {}, { passive: true });
    
    carregarDadosSalvos();
    configurarFormularios();
    atualizarInfoRodada();
    verificarEstadoAplicacao();
    
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            window.scrollTo(0, 0);
            atualizarDashboardHeader();
        }, 100);
    });
});

function configurarFormularios() {
    document.getElementById('formParticipante').addEventListener('submit', function(e) {
        e.preventDefault();
        dadosApp.participante = document.getElementById('nomeParticipante').value;
        salvarDados();
        mostrarTela('tela-palpites');
        carregarJogos();
        carregarPalpitesSalvos(); // 🆕 Carrega palpites salvos automaticamente
        atualizarDashboardHeader();
    });

    document.getElementById('formPalpites').addEventListener('submit', function(e) {
        e.preventDefault();
        salvarPalpites();
    });
}

function carregarDadosSalvos() {
    try {
        const dados = localStorage.getItem('bolaoBrasileiro');
        if (dados) {
            const parsed = JSON.parse(dados);
            dadosApp = { 
                participante: '',
                rodadaSalva: '',
                palpitesSalvos: [],
                dadosEnviados: false,
                dadosCompartilhados: false,
                tentativaForaPrazo: null,
                ultimoErroEnvio: null,
                erroInternet: false,
                ...parsed 
            };
        }
    } catch (e) {
        localStorage.removeItem('bolaoBrasileiro');
        dadosApp = {
            participante: '',
            rodadaSalva: '',
            palpitesSalvos: [],
            dadosEnviados: false,
            dadosCompartilhados: false,
            tentativaForaPrazo: null,
            ultimoErroEnvio: null,
            erroInternet: false
        };
    }
}

function verificarRodadaSalva() {
    if (!dadosApp.rodadaSalva) return 'dados_invalidos';
    
    if (dadosApp.rodadaSalva === configRodada.numeroRodada) {
        return 'mesma_rodada';
    } else {
        return 'rodada_diferente';
    }
}

function verificarEstadoAplicacao() {
    const statusRodada = verificarRodadaSalva();
    
    // Esconde todos os alertas primeiro
    document.getElementById('alert-rodada-diferente').classList.add('d-none');
    document.getElementById('alert-dados-enviados').classList.add('d-none');
    document.getElementById('alert-erro-envio').classList.add('d-none');
    document.getElementById('alert-prazo-expirado').classList.add('d-none');
    document.getElementById('formulario-inicial').classList.add('d-none');
    
    // Se não há dados salvos, mostra formulário inicial
    if (!dadosApp.participante && dadosApp.palpitesSalvos.length === 0) {
        document.getElementById('formulario-inicial').classList.remove('d-none');
        return;
    }
    
    // CASO 1: RODADA DIFERENTE
    if (statusRodada === 'rodada_diferente') {
        document.getElementById('texto-rodada-diferente').textContent = 
            `📋 Existem palpites salvos da ${dadosApp.rodadaSalva} no seu dispositivo.\n\n` +
            `Para acessar a ${configRodada.numeroRodada}, limpe os dados salvos primeiro.`;
        document.getElementById('alert-rodada-diferente').classList.remove('d-none');
        return;
    }
    
    // CASO 2: MESMA RODADA
    if (statusRodada === 'mesma_rodada') {
        
        // Subcaso 2.1: PALPITES JÁ ENVIADOS COM SUCESSO
        if (dadosApp.dadosEnviados) {
            document.getElementById('texto-dados-enviados').innerHTML = `
                <strong>✅ Palpites enviados com sucesso!</strong><br>
                Seus palpites da ${configRodada.numeroRodada} já foram enviados.
            `;
            document.getElementById('alert-dados-enviados').classList.remove('d-none');
            return;
        }
        
        // Subcaso 2.2: HOUVE ERRO NO ENVIO ANTERIOR
        if (dadosApp.ultimoErroEnvio) {
            const erroMsg = dadosApp.ultimoErroEnvio.mensagem || 'Erro desconhecido';
            
            if (dadosApp.erroInternet || erroMsg.includes('internet') || erroMsg.includes('network') || erroMsg.includes('conexão')) {
                document.getElementById('texto-erro-envio').innerHTML = `
                    <strong>📡 Falta de conexão com a internet!</strong><br>
                    Seus palpites da ${configRodada.numeroRodada} foram salvos, mas não foi possível enviá-los.<br>
                    Tente enviar novamente quando estiver conectado.
                `;
            } else {
                document.getElementById('texto-erro-envio').innerHTML = `
                    <strong>❌ Erro no envio anterior!</strong><br>
                    Seus palpites da ${configRodada.numeroRodada} estão salvos, mas o envio falhou.<br>
                    Erro: ${erroMsg}<br>
                    Tente enviar novamente.
                `;
            }
            
            document.getElementById('alert-erro-envio').classList.remove('d-none');
            return;
        }
        
        // Subcaso 2.3: PALPITES SALVOS (RASCUNHO) - NUNCA ENVIADOS
        // É O ÚNICO CASO QUE FALTAVA TRATAR CORRETAMENTE!
        
        // Conta quantos palpites estão preenchidos
        let totalPreenchidos = 0;
        if (dadosApp.palpitesSalvos.length > 0) {
            const ultimoPalpite = dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1];
            totalPreenchidos = ultimoPalpite.palpites.filter(p => p.placarA && p.placarB).length;
        }
        
        document.getElementById('texto-dados-enviados').innerHTML = `
            <strong>📋 Palpites salvos no dispositivo!</strong><br>
            Você tem <strong>${totalPreenchidos} de 10</strong> palpites preenchidos.<br>
            Continue preenchendo todos os jogos para enviar seus palpites.
        `;
        
        // Altera o texto do botão de "Visualizar/Editar" para "Continuar Preenchendo"
        const alertDadosEnviados = document.getElementById('alert-dados-enviados');
        const botoesExistentes = alertDadosEnviados.querySelectorAll('.btn');
        
        // Remove botões antigos se existirem
        botoesExistentes.forEach(btn => btn.remove());
        
        // Adiciona novos botões
        const divBotoes = document.createElement('div');
        divBotoes.className = 'mt-2 d-flex gap-2 flex-wrap';
        divBotoes.innerHTML = `
            <button class="btn btn-sm btn-primary" onclick="visualizarPalpitesSalvos()">
                <i class="bi bi-play-circle"></i> Continuar Preenchendo
            </button>
            <button class="btn btn-sm btn-danger" onclick="limparDados()">
                <i class="bi bi-trash"></i> Limpar Dados
            </button>
        `;
        
        alertDadosEnviados.appendChild(divBotoes);
        alertDadosEnviados.classList.remove('d-none');
    }
    
    // Verifica prazo expirado
    const prazoValido = verificarPrazoValido();
    if (!prazoValido && dadosApp.participante && statusRodada === 'mesma_rodada' && !dadosApp.dadosEnviados) {
        document.getElementById('alert-prazo-expirado').classList.remove('d-none');
    }
}

function reenviarPalpites() {
    if (dadosApp.palpitesSalvos.length === 0) {
        alert('Nenhum palpite para enviar.');
        return;
    }
    
    if (!verificarPrazoValido()) {
        alert('⏰ O prazo para envio dos palpites desta rodada já expirou.');
        return;
    }
    
    if (!navigator.onLine) {
        alert('📡 Sem conexão com internet! Conecte-se para enviar os palpites.');
        return;
    }
    
    mostrarTela('tela-envio-google');
    document.getElementById('resultado-envio').classList.add('d-none');
    document.getElementById('btn-fechar-envio-internet').classList.add('d-none');
    document.getElementById('btn-fechar-envio-sucesso').classList.add('d-none');
    document.getElementById('btn-reiniciar-envio').classList.add('d-none');
    enviarParaGoogleForms();
}

function reiniciarEnvio() {
    if (!navigator.onLine) {
        alert('📡 Sem conexão com internet! Conecte-se para reiniciar o envio.');
        return;
    }
    
    document.getElementById('resultado-envio').classList.add('d-none');
    document.getElementById('btn-reiniciar-envio').classList.add('d-none');
    document.getElementById('btn-fechar-envio-internet').classList.add('d-none');
    document.getElementById('btn-fechar-envio-sucesso').classList.add('d-none');
    
    enviarParaGoogleForms();
}

function visualizarPalpitesEnviados() {
    mostrarTela('tela-palpites');
    carregarJogosComDadosSalvos();
}

function visualizarPalpitesSalvos() {
    mostrarTela('tela-palpites');
    carregarJogosComDadosSalvos();
}

function voltarParaEdicao() {
    mostrarTela('tela-palpites');
    carregarJogosComDadosSalvos();
}

function irParaConclusaoComErroInternet() {
    dadosApp.erroInternet = true;
    salvarDados();
    mostrarTela('tela-conclusao');
    atualizarBotoesConclusao();
}

function irParaConclusaoComSucesso() {
    dadosApp.dadosEnviados = true;
    dadosApp.erroInternet = false;
    salvarDados();
    mostrarTela('tela-conclusao');
    atualizarBotoesConclusao();
}

function atualizarBotoesConclusao() {
    const alertInternet = document.getElementById('alert-sem-internet-conclusao');
    const alertSucesso = document.getElementById('alert-envio-sucesso-conclusao');
    const alertPrazo = document.getElementById('alert-prazo-expirado-conclusao');
    const dataLimiteExibida = document.getElementById('data-limite-exibida');
    
    const alertSucessoElement = document.getElementById('alert-envio-sucesso-conclusao');
    if (alertSucessoElement) {
        alertSucessoElement.innerHTML = `
            <h6 class="alert-heading"><i class="bi bi-check-circle"></i> Palpites enviados com sucesso!</h6>
            <p class="mb-0">Seus palpites da ${configRodada.numeroRodada} já foram enviados.</p>
        `;
    }
    
    alertInternet.classList.add('d-none');
    alertSucesso.classList.add('d-none');
    alertPrazo.classList.add('d-none');
    
    const prazoValido = verificarPrazoValido();
    
    if (!prazoValido) {
        alertPrazo.classList.remove('d-none');
        dataLimiteExibida.textContent = configRodada.dataLimite;
    } else if (dadosApp.dadosEnviados) {
        alertSucesso.classList.remove('d-none');
    } else if (dadosApp.erroInternet) {
        alertInternet.classList.remove('d-none');
    }
}

function carregarJogosComDadosSalvos() {
    const container = document.getElementById('jogos-container');
    container.innerHTML = '';
    
    document.getElementById('participante-atual').textContent = dadosApp.participante;

    const ultimoPalpite = dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1];
    const palpitesSalvos = ultimoPalpite.palpites;

    jogosRodada.forEach(jogo => {
        const palpiteSalvo = palpitesSalvos.find(p => p.jogoId === jogo.id);
        const placarA = palpiteSalvo ? palpiteSalvo.placarA : '';
        const placarB = palpiteSalvo ? palpiteSalvo.placarB : '';
        
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="jogo-card h-100">
                <div class="cabecalho-jogo rounded-top text-white p-3">
                    <h6 class="mb-0">Jogo ${jogo.id}</h6>
                </div>
                <div class="p-3">
                    <div class="row align-items-center">
                        <div class="col-5 text-center">
                            <div class="fw-bold mb-2 small">${jogo.timeA}</div>
                            <select class="form-control input-placar" 
                                    name="placarA-${jogo.id}" 
                                    onchange="atualizarDashboardHeader(); salvarPalpiteAutomatico('${jogo.id}')">
                                ${gerarOpcoesSelect(placarA)}
                            </select>
                        </div>
                        <div class="col-2 text-center">
                            <div class="fw-bold fs-5">X</div>
                        </div>
                        <div class="col-5 text-center">
                            <div class="fw-bold mb-2 small">${jogo.timeB}</div>
                            <select class="form-control input-placar" 
                                    name="placarB-${jogo.id}" 
                                    onchange="atualizarDashboardHeader(); salvarPalpiteAutomatico('${jogo.id}')">
                                ${gerarOpcoesSelect(placarB)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    const btnSalvar = document.getElementById('btn-salvar-palpites');
    const titulo = document.getElementById('titulo-tela-palpites');
    
    btnSalvar.classList.remove('d-none');
    
    if (dadosApp.dadosEnviados) {
        titulo.textContent = '👀 Visualizar/Editar Palpites - ' + configRodada.numeroRodada;
        btnSalvar.innerHTML = '<i class="bi bi-save"></i> Salvar Alterações e Enviar';
    } else {
        titulo.textContent = '📝 Seus Palpites - ' + configRodada.numeroRodada;
        btnSalvar.innerHTML = '<i class="bi bi-save"></i> Salvar e Enviar';
    }

    atualizarDashboardHeader();
}

function salvarDados() {
    try {
        dadosApp.rodadaSalva = configRodada.numeroRodada;
        localStorage.setItem('bolaoBrasileiro', JSON.stringify(dadosApp));
        atualizarDashboardHeader();
    } catch (e) {
        mostrarToast('⚠️ Erro ao salvar dados. Tente novamente.', 'warning');
    }
}

function atualizarInfoRodada() {
    document.getElementById('nome-bolao').textContent = configRodada.nomeBolao;
    document.getElementById('data-inicio').textContent = configRodada.dataInicio;
    document.getElementById('data-limite').textContent = configRodada.dataLimite;
    document.getElementById('numero-rodada').textContent = configRodada.numeroRodada;
    
    document.getElementById('rodada-tela-participante').textContent = configRodada.numeroRodada;
    document.getElementById('rodada-tela-palpites').textContent = configRodada.numeroRodada;
    document.getElementById('rodada-tela-conclusao').textContent = configRodada.numeroRodada;
    document.getElementById('rodada-tela-exportacao').textContent = configRodada.numeroRodada;
    document.getElementById('rodada-tela-envio').textContent = configRodada.numeroRodada;
}

function atualizarDashboardHeader() {
    const barra = document.getElementById('header-barra-progresso-palpites');
    const textoBarra = document.getElementById('header-texto-barra');
    const bolaFutebol = document.getElementById('bola-futebol');
    const bolaEmoji = bolaFutebol ? bolaFutebol.querySelector('.bola-emoji') : null;
    
    const preenchidos = contarJogosPreenchidos();
    const totalJogos = jogosRodada.length;
    const porcentagem = Math.round((preenchidos / totalJogos) * 100);
    
    const posicaoAnterior = parseFloat(barra.style.width) || 0;
    const distancia = Math.abs(porcentagem - posicaoAnterior);
    
    barra.style.width = porcentagem + '%';
    textoBarra.textContent = `${preenchidos} de ${totalJogos} (${porcentagem}%)`;
    
    let posicaoBola = porcentagem;
    if (posicaoBola > 100) posicaoBola = 100;
    if (posicaoBola < 0) posicaoBola = 0;
    
    if (posicaoBola === 0) {
        bolaFutebol.style.left = '0%';
    } else if (posicaoBola === 100) {
        bolaFutebol.style.left = '100%';
    } else {
        bolaFutebol.style.left = posicaoBola + '%';
    }
    
    barra.classList.remove('baixo', 'medio', 'alto', 'completo');
    bolaFutebol.classList.remove('baixo', 'medio', 'alto', 'animando', 'completo');
    
    if (porcentagem < 30) {
        barra.classList.add('baixo');
        bolaFutebol.classList.add('baixo');
    } else if (porcentagem < 70) {
        barra.classList.add('medio');
        bolaFutebol.classList.add('medio');
    } else {
        barra.classList.add('alto');
        bolaFutebol.classList.add('alto');
    }
    
    if (porcentagem === 100) {
        barra.classList.add('completo');
        bolaFutebol.classList.add('completo');
    }
    
    if (distancia > 0 && porcentagem < 100) {
        bolaFutebol.classList.add('animando');
        
        setTimeout(() => {
            if (bolaFutebol) {
                bolaFutebol.classList.remove('animando');
            }
        }, 800);
    }
    
    barra.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    bolaFutebol.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
}

function contarJogosPreenchidos() {
    let preenchidos = 0;
    jogosRodada.forEach(jogo => {
        const placarA = document.querySelector(`select[name="placarA-${jogo.id}"]`);
        const placarB = document.querySelector(`select[name="placarB-${jogo.id}"]`);
        
        if (placarA && placarA.value && placarB && placarB.value) {
            preenchidos++;
        }
    });
    return preenchidos;
}

function verificarTodosJogosPreenchidos() {
    let todosPreenchidos = true;
    let jogosNaoPreenchidos = [];
    
    jogosRodada.forEach(jogo => {
        const placarA = document.querySelector(`select[name="placarA-${jogo.id}"]`);
        const placarB = document.querySelector(`select[name="placarB-${jogo.id}"]`);
        
        if (!placarA.value || !placarB.value) {
            todosPreenchidos = false;
            jogosNaoPreenchidos.push(jogo.id);
        }
    });
    
    return {
        todosPreenchidos,
        jogosNaoPreenchidos
    };
}

function carregarJogos() {
    const container = document.getElementById('jogos-container');
    container.innerHTML = '';
    
    document.getElementById('participante-atual').textContent = dadosApp.participante;

    jogosRodada.forEach(jogo => {
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="jogo-card h-100">
                <div class="cabecalho-jogo rounded-top text-white p-3">
                    <h6 class="mb-0">Jogo ${jogo.id}</h6>
                </div>
                <div class="p-3">
                    <div class="row align-items-center">
                        <div class="col-5 text-center">
                            <div class="fw-bold mb-2 small">${jogo.timeA}</div>
                            <select class="form-control input-placar" 
                                    name="placarA-${jogo.id}" 
                                    onchange="atualizarDashboardHeader(); salvarPalpiteAutomatico('${jogo.id}')">
                                ${gerarOpcoesSelect()}
                            </select>
                        </div>
                        <div class="col-2 text-center">
                            <div class="fw-bold fs-5">X</div>
                        </div>
                        <div class="col-5 text-center">
                            <div class="fw-bold mb-2 small">${jogo.timeB}</div>
                            <select class="form-control input-placar" 
                                    name="placarB-${jogo.id}" 
                                    onchange="atualizarDashboardHeader(); salvarPalpiteAutomatico('${jogo.id}')">
                                ${gerarOpcoesSelect()}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function salvarPalpites() {
    const verificacao = verificarTodosJogosPreenchidos();
    
    if (!verificacao.todosPreenchidos) {
        let mensagem = '⚠️ Por favor, preencha todos os 10 jogos antes de salvar:\n\n';
        verificacao.jogosNaoPreenchidos.forEach(jogoId => {
            mensagem += `• Jogo ${jogoId}\n`;
        });
        mensagem += '\nÉ obrigatório preencher todos os jogos.';
        alert(mensagem);
        return;
    }

    const palpites = [];

    jogosRodada.forEach(jogo => {
        const placarA = document.querySelector(`select[name="placarA-${jogo.id}"]`);
        const placarB = document.querySelector(`select[name="placarB-${jogo.id}"]`);
        
        palpites.push({
            jogoId: jogo.id,
            timeA: jogo.timeA,
            placarA: placarA.value,
            timeB: jogo.timeB,
            placarB: placarB.value
        });
    });

    const dataHoraFormatada = formatarDataHora();

    const palpiteRodada = {
        timestamp: new Date().toISOString(),
        data_hora: new Date().toLocaleString('pt-BR'),
        data_hora_palpite: dataHoraFormatada,
        participante: dadosApp.participante,
        rodada: configRodada.numeroRodada,
        palpites: palpites
    };

    dadosApp.dadosEnviados = false;
    dadosApp.ultimoErroEnvio = null;
    dadosApp.erroInternet = false;
    
    if (dadosApp.palpitesSalvos.length > 0) {
        dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1] = palpiteRodada;
    } else {
        dadosApp.palpitesSalvos.push(palpiteRodada);
    }
    
    salvarDados();

    mostrarTela('tela-envio-google');
    document.getElementById('resultado-envio').classList.add('d-none');
    document.getElementById('btn-fechar-envio-internet').classList.add('d-none');
    document.getElementById('btn-fechar-envio-sucesso').classList.add('d-none');
    document.getElementById('btn-reiniciar-envio').classList.add('d-none');
    
    if (verificarPrazoValido()) {
        enviarParaGoogleForms();
    } else {
        document.getElementById('resultado-envio').classList.remove('d-none');
        document.getElementById('resultado-envio').innerHTML = `
            <div class="alert alert-warning">
                <h6 class="alert-heading"><i class="bi bi-clock"></i> Prazo Expirado!</h6>
                <p class="mb-0">
                    O prazo para envio dos palpites desta rodada já expirou em ${configRodada.dataLimite}.<br>
                    Seus palpites foram salvos, mas não podem ser enviados.
                </p>
            </div>`;
        document.getElementById('btn-fechar-envio-sucesso').classList.remove('d-none');
    }
    
    atualizarDashboardHeader();
}

function voltarInicio() {
    dadosApp.participante = '';
    dadosApp.rodadaSalva = '';
    dadosApp.palpitesSalvos = [];
    dadosApp.dadosEnviados = false;
    dadosApp.dadosCompartilhados = false;
    dadosApp.tentativaForaPrazo = null;
    dadosApp.ultimoErroEnvio = null;
    dadosApp.erroInternet = false;
    salvarDados();
    mostrarTela('tela-participante');
    verificarEstadoAplicacao();
}

function voltarConclusao() {
    mostrarTela('tela-conclusao');
    atualizarBotoesConclusao();
}

function limparDados() {
    if (confirm('⚠️ ATENÇÃO: Isso vai apagar TODOS os dados salvos.\n\nTem certeza?')) {
        dadosApp.participante = '';
        dadosApp.rodadaSalva = '';
        dadosApp.palpitesSalvos = [];
        dadosApp.dadosEnviados = false;
        dadosApp.dadosCompartilhados = false;
        dadosApp.tentativaForaPrazo = null;
        dadosApp.ultimoErroEnvio = null;
        dadosApp.erroInternet = false;
        salvarDados();
        
        document.getElementById('alert-rodada-diferente').classList.add('d-none');
        document.getElementById('alert-dados-enviados').classList.add('d-none');
        document.getElementById('alert-erro-envio').classList.add('d-none');
        document.getElementById('alert-prazo-expirado').classList.add('d-none');
        
        mostrarToast('✅ Dados limpos com sucesso!', 'success');
        
        mostrarTela('tela-participante');
        verificarEstadoAplicacao();
    }
}

function mostrarTela(telaId) {
    document.querySelectorAll('.tela').forEach(tela => {
        tela.classList.add('d-none');
    });
    document.getElementById(telaId).classList.remove('d-none');
    
    if (isIOS()) {
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.body.style.overflow = '';
        }, 50);
    }
    
    const areaRodada = document.getElementById('area-rodada-header');
    const datasRodada = document.getElementById('datas-rodada-container');
    const progressoPalpites = document.querySelector('.progresso-palpites-header');
    
    if (telaId === 'tela-palpites') {
        document.body.classList.add('tela-formulario');
        progressoPalpites.classList.remove('d-none');
        areaRodada.classList.remove('d-none');
        datasRodada.classList.add('d-none');
        atualizarDashboardHeader();
    } else {
        document.body.classList.remove('tela-formulario');
        progressoPalpites.classList.add('d-none');
        areaRodada.classList.remove('d-none');
        datasRodada.classList.remove('d-none');
    }
    
    if (telaId === 'tela-participante') {
        verificarEstadoAplicacao();
    }
    
    if (telaId === 'tela-conclusao') {
        atualizarBotoesConclusao();
    }
    
    window.scrollTo(0, 0);
}

function iniciarEnvioGoogleForms() {
    if (dadosApp.palpitesSalvos.length === 0) {
        alert('⚠️ Nenhum palpite para enviar!');
        return;
    }
    
    if (!verificarPrazoValido()) {
        alert('⏰ O prazo para envio dos palpites desta rodada já expirou.');
        return;
    }
    
    if (!navigator.onLine) {
        alert('📡 Sem conexão com internet! Conecte-se para enviar os palpites.');
        return;
    }
    
    mostrarTela('tela-envio-google');
    document.getElementById('resultado-envio').classList.add('d-none');
    document.getElementById('btn-fechar-envio-internet').classList.add('d-none');
    document.getElementById('btn-fechar-envio-sucesso').classList.add('d-none');
    document.getElementById('btn-reiniciar-envio').classList.add('d-none');
    
    enviarParaGoogleForms();
}

async function compartilharCSV() {
    if (dadosApp.palpitesSalvos.length === 0) {
        alert('Nenhum palpite para compartilhar.');
        return;
    }

    try {
        const cabecalho = ['Rodada', 'Time_A', 'Placar_A', 'Placar_B', 'Time_B', 'Participante', 'Data_Hora'];

        const linhas = [];
        
        const ultimoPalpite = dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1];
        
        ultimoPalpite.palpites.forEach(jogo => {
            const linha = [
                ultimoPalpite.rodada,
                jogo.timeA,
                jogo.placarA,
                jogo.placarB,
                jogo.timeB,
                ultimoPalpite.participante,
                ultimoPalpite.data_hora_palpite
            ];

            const linhaFormatada = linha.map(valor => {
                const valorString = String(valor);
                if (valorString.includes(',') || valorString.includes('\n') || valorString.includes('"')) {
                    return `"${valorString.replace(/"/g, '""')}"`;
                }
                return valorString;
            }).join(',');

            linhas.push(linhaFormatada);
        });

        const csvData = [cabecalho.join(','), ...linhas].join('\n');
        
        const nomeParticipante = dadosApp.participante || 'Participante';
        const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        
        const nomeParticipanteLimpo = nomeParticipante
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_');
        
        const nomeArquivo = `Bolao_${configRodada.numeroRodada.replace(/\s+/g, '_')}_${nomeParticipanteLimpo}_${dataAtual}.csv`;
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        
        if (isIOS() && navigator.share) {
            try {
                const url = URL.createObjectURL(blob);
                await navigator.share({
                    title: 'Palpites do Bolão',
                    text: `Palpites do ${configRodada.numeroRodada} - ${nomeParticipante}`,
                    url: url
                });
                
                URL.revokeObjectURL(url);
                dadosApp.dadosCompartilhados = true;
                salvarDados();
                mostrarTela('tela-exportacao');
                
            } catch (error) {
                fazerDownloadCSV(blob, nomeArquivo);
            }
        } else if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], nomeArquivo)] })) {
            try {
                const file = new File([blob], nomeArquivo, { type: 'text/csv' });
                await navigator.share({
                    title: 'Palpites do Bolão',
                    text: `Palpites do ${configRodada.numeroRodada} - ${nomeParticipante}`,
                    files: [file]
                });
                
                dadosApp.dadosCompartilhados = true;
                salvarDados();
                mostrarTela('tela-exportacao');
                
            } catch (error) {
                if (error.name !== 'AbortError') {
                    fazerDownloadCSV(blob, nomeArquivo);
                }
            }
        } else {
            alert('Seu navegador não suporta compartilhamento de arquivos. Fazendo download...');
            fazerDownloadCSV(blob, nomeArquivo);
        }
        
    } catch (error) {
        alert('❌ Erro ao gerar arquivo CSV. Tente novamente.');
    }
}

function fazerDownloadCSV(blob, nomeArquivo) {
    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        
        link.dispatchEvent(clickEvent);
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            dadosApp.dadosCompartilhados = true;
            salvarDados();
            mostrarTela('tela-exportacao');
        }, 100);
        
    } catch (error) {
        alert('❌ Erro ao fazer download do arquivo. Tente novamente.');
    }
}

async function enviarParaGoogleForms() {
    if (dadosApp.palpitesSalvos.length === 0) {
        alert('Nenhum palpite para enviar.');
        return;
    }

    if (!verificarPrazoValido()) {
        document.getElementById('resultado-envio').classList.remove('d-none');
        document.getElementById('resultado-envio').innerHTML = `
            <div class="alert alert-warning">
                <h6 class="alert-heading"><i class="bi bi-clock"></i> Prazo Expirado!</h6>
                <p class="mb-0">
                    O prazo para envio dos palpites desta rodada já expirou em ${configRodada.dataLimite}.<br>
                    Seus palpites foram salvos, mas não podem ser enviados.
                </p>
            </div>`;
        document.getElementById('btn-fechar-envio-sucesso').classList.remove('d-none');
        return;
    }

    if (!navigator.onLine) {
        document.getElementById('resultado-envio').classList.remove('d-none');
        document.getElementById('resultado-envio').innerHTML = `
            <div class="alert alert-info">
                <h6 class="alert-heading"><i class="bi bi-wifi-off"></i> Sem conexão com internet!</h6>
                <p class="mb-0">
                    Não foi possível enviar os palpites porque você está offline.<br>
                    Conecte-se à internet e tente novamente.
                </p>
            </div>`;
        document.getElementById('btn-fechar-envio-internet').classList.remove('d-none');
        return;
    }

    try {
        const ultimoPalpite = dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1];
        const totalJogos = ultimoPalpite.palpites.length;
        
        let enviados = 0;
        let erros = [];

        document.getElementById('texto-progresso-envio').textContent = 
            `Enviando 0 de ${totalJogos}`;

        for (let i = 0; i < totalJogos; i++) {
            const jogo = ultimoPalpite.palpites[i];
            
            try {
                const formData = new FormData();
                
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[0], ultimoPalpite.rodada);
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[1], jogo.timeA);
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[2], jogo.placarA);
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[3], jogo.placarB);
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[4], jogo.timeB);
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[5], ultimoPalpite.participante);
                formData.append(CONFIG_GOOGLE_FORMS.entryIds[6], ultimoPalpite.data_hora_palpite);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                await fetch(CONFIG_GOOGLE_FORMS.url, {
                    method: 'POST',
                    body: formData,
                    mode: 'no-cors',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                enviados++;
                
                const porcentagem = (enviados / totalJogos) * 100;
                document.getElementById('barra-progresso-envio').style.width = porcentagem + '%';
                document.getElementById('texto-progresso-envio').textContent = 
                    `Enviando ${enviados} de ${totalJogos}`;
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                erros.push({ 
                    jogoId: jogo.jogoId,
                    error: error.message 
                });
                break;
            }
        }

        const resultadoDiv = document.getElementById('resultado-envio');
        resultadoDiv.classList.remove('d-none');
        
        if (enviados === totalJogos) {
            dadosApp.dadosEnviados = true;
            dadosApp.erroInternet = false;
            dadosApp.ultimoErroEnvio = null;
            
            resultadoDiv.innerHTML = `
                <div class="alert alert-success">
                    <h6 class="alert-heading"><i class="bi bi-check-circle"></i> Envio Concluído com Sucesso!</h6>
                    <p class="mb-0">Todos os ${enviados} palpites foram enviados!</p>
                </div>`;
            document.getElementById('btn-fechar-envio-sucesso').classList.remove('d-none');
            
        } else {
            dadosApp.dadosEnviados = false;
            dadosApp.erroInternet = true;
            dadosApp.ultimoErroEnvio = {
                timestamp: new Date().toISOString(),
                dataHora: formatarDataHora(),
                mensagem: `Envio interrompido: ${enviados} de ${totalJogos} enviados`,
                rodada: configRodada.numeroRodada,
                isNetworkError: true
            };
            
            resultadoDiv.innerHTML = `
                <div class="alert alert-warning">
                    <h6 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> Envio Interrompido!</h6>
                    <p class="mb-0">
                        Apenas ${enviados} de ${totalJogos} palpites foram enviados.<br>
                        <small class="text-muted">Possível perda de conexão durante o envio.</small>
                    </p>
                </div>`;
            document.getElementById('btn-reiniciar-envio').classList.remove('d-none');
        }
        
        salvarDados();
        
    } catch (error) {
        const isNetworkError = error.message.includes('network') || 
                              error.message.includes('internet') || 
                              error.message.includes('offline') ||
                              error.message.includes('Failed to fetch') ||
                              error.name === 'TypeError';
        
        document.getElementById('resultado-envio').classList.remove('d-none');
        
        if (isNetworkError) {
            dadosApp.dadosEnviados = false;
            dadosApp.erroInternet = true;
            dadosApp.ultimoErroEnvio = {
                timestamp: new Date().toISOString(),
                dataHora: formatarDataHora(),
                mensagem: error.message,
                rodada: configRodada.numeroRodada,
                isNetworkError: true
            };
            
            document.getElementById('resultado-envio').innerHTML = `
                <div class="alert alert-info">
                    <h6 class="alert-heading"><i class="bi bi-wifi-off"></i> Sem conexão com internet!</h6>
                    <p class="mb-0">
                        O envio foi interrompido.<br>
                        Conecte-se à internet e clique em "Reiniciar Envio".
                    </p>
                </div>`;
            document.getElementById('btn-reiniciar-envio').classList.remove('d-none');
            
        } else {
            document.getElementById('resultado-envio').innerHTML = `
                <div class="alert alert-danger">
                    <h6 class="alert-heading"><i class="bi bi-x-circle"></i> Erro ao enviar palpites!</h6>
                    <p class="mb-0">
                        Tente novamente mais tarde.<br>
                        <small class="text-muted">Erro: ${error.message}</small>
                    </p>
                </div>`;
            document.getElementById('btn-fechar-envio-sucesso').classList.remove('d-none');
            
            dadosApp.ultimoErroEnvio = {
                timestamp: new Date().toISOString(),
                dataHora: formatarDataHora(),
                mensagem: error.message,
                rodada: configRodada.numeroRodada,
                isNetworkError: false
            };
        }
        
        salvarDados();
    }
}

function aplicarAjustesIOS() {
    if (isIOS()) {
        document.addEventListener('focusin', function(e) {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                document.body.style.fontSize = '16px';
            }
        });
        
        document.addEventListener('focusout', function(e) {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                setTimeout(() => {
                    document.body.style.fontSize = '';
                }, 100);
            }
        });
    }
}

aplicarAjustesIOS();
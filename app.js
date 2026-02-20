// app.js?v=4.8

// ====================
// 🔧 CONFIGURAÇÃO ÚNICA
// ====================

const VERSAO_ATUAL = "20260220_0800_R04";

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
        'entry.26241625',
        'entry.39347237',
        'entry.654774410',
        'entry.514438451',
        'entry.1360858266',
        'entry.1629904542',
        'entry.1686925319'
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
// 🔧 INICIALIZAÇÃO DOS EVENTOS
// ====================

document.addEventListener('DOMContentLoaded', function() {
    // iOS fixes
    document.addEventListener('touchmove', function(e) {
        if (e.target.tagName === 'SELECT') {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchstart', function() {}, { passive: true });
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar dados
    carregarDadosSalvos();
    atualizarInfoRodada();
    verificarEstadoAplicacao();
    
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            window.scrollTo(0, 0);
            atualizarDashboardHeader();
        }, 100);
    });
});

function configurarEventos() {
    // Formulário participante
    const formParticipante = document.getElementById('formParticipante');
    if (formParticipante) {
        formParticipante.addEventListener('submit', function(e) {
            e.preventDefault();
            onSubmitParticipante();
        });
    }
    
    // Formulário palpites
    const formPalpites = document.getElementById('formPalpites');
    if (formPalpites) {
        formPalpites.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarPalpites();
        });
    }
    
    // Botão inserir palpites
    const btnInserir = document.getElementById('btn-inserir-palpites');
    if (btnInserir) {
        btnInserir.addEventListener('click', function(e) {
            e.preventDefault();
            onSubmitParticipante();
        });
    }
    
    // Botões da tela de conclusão
    const btnEditar = document.getElementById('btn-editar-palpites');
    if (btnEditar) {
        btnEditar.addEventListener('click', function() {
            visualizarPalpitesSalvos();
        });
    }
    
    const btnCompartilhar = document.getElementById('btn-compartilhar-csv');
    if (btnCompartilhar) {
        btnCompartilhar.addEventListener('click', function() {
            compartilharCSV();
        });
    }
    
    const btnLimparConclusao = document.getElementById('btn-limpar-dados-conclusao');
    if (btnLimparConclusao) {
        btnLimparConclusao.addEventListener('click', function() {
            limparDados();
        });
    }
    
    const btnVoltarConclusao = document.getElementById('btn-voltar-conclusao');
    if (btnVoltarConclusao) {
        btnVoltarConclusao.addEventListener('click', function() {
            voltarConclusao();
        });
    }
    
    // Botões da tela de envio
    const btnFecharInternet = document.getElementById('btn-fechar-envio-internet');
    if (btnFecharInternet) {
        btnFecharInternet.addEventListener('click', function() {
            irParaConclusaoComErroInternet();
        });
    }
    
    const btnFecharSucesso = document.getElementById('btn-fechar-envio-sucesso');
    if (btnFecharSucesso) {
        btnFecharSucesso.addEventListener('click', function() {
            irParaConclusaoComSucesso();
        });
    }
    
    const btnReiniciar = document.getElementById('btn-reiniciar-envio');
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', function() {
            reiniciarEnvio();
        });
    }
}

function onSubmitParticipante() {
    const select = document.getElementById('nomeParticipante');
    dadosApp.participante = select.value;
    salvarDados();
    mostrarTela('tela-palpites');
    carregarJogos();
    carregarPalpitesSalvos();
    atualizarDashboardHeader();
}

// ====================
// 🆕 TOAST NOTIFICATION
// ====================

function mostrarToast(mensagem, tipo = 'success') {
    const toastExistente = document.querySelector('.toast-notification');
    if (toastExistente) {
        toastExistente.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${tipo}`;
    
    const icon = document.createElement('i');
    icon.className = tipo === 'success' ? 'bi bi-check-circle-fill' : 
                     tipo === 'warning' ? 'bi bi-exclamation-triangle-fill' : 
                     'bi bi-info-circle-fill';
    
    const span = document.createElement('span');
    span.className = 'flex-grow-1';
    span.textContent = mensagem;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => toast.remove();
    
    toast.appendChild(icon);
    toast.appendChild(span);
    toast.appendChild(closeBtn);
    
    document.body.appendChild(toast);
    
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
    
    if (placarA && placarB && placarA.value && placarB.value) {
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
            data_hora_palpite: '',
            participante: dadosApp.participante,
            rodada: configRodada.numeroRodada,
            palpites: palpites
        };

        if (dadosApp.palpitesSalvos.length > 0) {
            dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1] = palpiteRodada;
        } else {
            dadosApp.palpitesSalvos.push(palpiteRodada);
        }
        
        salvarDados();
        atualizarDestaquesJogos();
        
        const jogo = jogosRodada.find(j => j.id === jogoId);
        mostrarToast(`✅ Palpite do Jogo ${jogoId} (${jogo.timeA} x ${jogo.timeB}) salvo!`, 'success');
    }
}

// ====================
// 🟢 DESTAQUE DE JOGOS PREENCHIDOS
// ====================

function atualizarDestaquesJogos() {
    jogosRodada.forEach(jogo => {
        const placarA = document.querySelector(`select[name="placarA-${jogo.id}"]`);
        const placarB = document.querySelector(`select[name="placarB-${jogo.id}"]`);
        const jogoCard = placarA?.closest('.jogo-card');
        
        if (jogoCard) {
            const ambosPreenchidos = placarA?.value && placarB?.value;
            
            if (ambosPreenchidos) {
                jogoCard.classList.add('preenchido');
            } else {
                jogoCard.classList.remove('preenchido');
            }
        }
    });
}

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
        
        const totalPreenchidos = ultimoPalpite.palpites.filter(p => p.placarA && p.placarB).length;
        if (totalPreenchidos > 0) {
            mostrarToast(`📋 ${totalPreenchidos} palpites carregados do rascunho`, 'info');
        }
    }
}

// ====================
// 📊 ESTADO DA APLICAÇÃO
// ====================

function verificarEstadoAplicacao() {
    const statusRodada = verificarRodadaSalva();
    
    // Esconder todos
    ocultarTodosAlertas();
    
    if (!dadosApp.participante && dadosApp.palpitesSalvos.length === 0) {
        document.getElementById('formulario-inicial').classList.remove('d-none');
        return;
    }
    
    if (statusRodada === 'rodada_diferente') {
        exibirAlertaRodadaDiferente();
        return;
    }
    
    if (statusRodada === 'mesma_rodada') {
        if (dadosApp.dadosEnviados) {
            exibirAlertaEnviado();
        } else if (dadosApp.ultimoErroEnvio) {
            exibirAlertaErroEnvio();
        } else {
            exibirAlertaRascunho();
        }
    }
    
    const prazoValido = verificarPrazoValido();
    if (!prazoValido && dadosApp.participante && statusRodada === 'mesma_rodada' && !dadosApp.dadosEnviados) {
        exibirAlertaPrazoExpirado();
    }
}

function ocultarTodosAlertas() {
    document.getElementById('alert-rodada-diferente').classList.add('d-none');
    document.getElementById('alert-dados-enviados').classList.add('d-none');
    document.getElementById('alert-erro-envio').classList.add('d-none');
    document.getElementById('alert-prazo-expirado').classList.add('d-none');
    document.getElementById('formulario-inicial').classList.add('d-none');
    
    // Limpar conteúdos
    document.getElementById('alert-rodada-diferente').innerHTML = '';
    document.getElementById('alert-dados-enviados').innerHTML = '';
    document.getElementById('alert-erro-envio').innerHTML = '';
    document.getElementById('alert-prazo-expirado').innerHTML = '';
}

function exibirAlertaRodadaDiferente() {
    const alert = document.getElementById('alert-rodada-diferente');
    
    const heading = document.createElement('h6');
    heading.className = 'alert-heading';
    heading.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Dados de rodada diferente encontrados!';
    
    const texto = document.createElement('p');
    texto.className = 'mb-2';
    texto.innerHTML = `📋 Existem palpites salvos da <strong>${dadosApp.rodadaSalva}</strong> no seu dispositivo.<br>
                       Para acessar a <strong>${configRodada.numeroRodada}</strong>, limpe os dados salvos primeiro.`;
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-danger mt-1';
    btn.innerHTML = '<i class="bi bi-trash"></i> Limpar Dados';
    btn.onclick = () => limparDados();
    
    alert.appendChild(heading);
    alert.appendChild(texto);
    alert.appendChild(btn);
    alert.classList.remove('d-none');
}

function exibirAlertaEnviado() {
    const alert = document.getElementById('alert-dados-enviados');
    
    const heading = document.createElement('h6');
    heading.className = 'alert-heading';
    heading.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Palpites enviados com sucesso!';
    
    const texto = document.createElement('p');
    texto.className = 'mb-2';
    texto.innerHTML = `Seus palpites da <strong>${configRodada.numeroRodada}</strong> já foram enviados.`;
    
    const subtitulo = document.createElement('p');
    subtitulo.className = 'fw-semibold mb-2';
    subtitulo.textContent = 'Você pode visualizar ou alterar seus palpites:';
    
    const divBotoes = document.createElement('div');
    divBotoes.className = 'd-flex gap-2 flex-wrap';
    
    const btnVisualizar = document.createElement('button');
    btnVisualizar.className = 'btn btn-sm btn-outline-primary';
    btnVisualizar.innerHTML = '<i class="bi bi-eye"></i> Visualizar/Editar';
    btnVisualizar.onclick = () => visualizarPalpitesSalvos();
    
    const btnLimpar = document.createElement('button');
    btnLimpar.className = 'btn btn-sm btn-danger';
    btnLimpar.innerHTML = '<i class="bi bi-trash"></i> Limpar Dados';
    btnLimpar.onclick = () => limparDados();
    
    divBotoes.appendChild(btnVisualizar);
    divBotoes.appendChild(btnLimpar);
    
    alert.appendChild(heading);
    alert.appendChild(texto);
    alert.appendChild(subtitulo);
    alert.appendChild(divBotoes);
    alert.classList.remove('d-none');
}

function exibirAlertaErroEnvio() {
    const erroMsg = dadosApp.ultimoErroEnvio.mensagem || 'Erro desconhecido';
    const alert = document.getElementById('alert-erro-envio');
    
    const heading = document.createElement('h6');
    heading.className = 'alert-heading';
    
    if (dadosApp.erroInternet || erroMsg.includes('internet') || erroMsg.includes('network') || erroMsg.includes('conexão')) {
        heading.innerHTML = '<i class="bi bi-wifi-off"></i> Falta de conexão com a internet!';
    } else {
        heading.innerHTML = '<i class="bi bi-x-circle"></i> Erro no envio anterior!';
    }
    
    const texto = document.createElement('p');
    texto.className = 'mb-2';
    
    if (dadosApp.erroInternet || erroMsg.includes('internet') || erroMsg.includes('network') || erroMsg.includes('conexão')) {
        texto.innerHTML = `Seus palpites da <strong>${configRodada.numeroRodada}</strong> foram salvos,<br>
                          mas <strong>não foi possível enviá-los</strong>.<br>
                          Tente enviar novamente quando estiver conectado à internet.`;
    } else {
        texto.innerHTML = `Seus palpites da <strong>${configRodada.numeroRodada}</strong> estão salvos,<br>
                          mas o envio falhou.<br>
                          <small class="text-muted">Erro: ${erroMsg}</small>`;
    }
    
    const divBotoes = document.createElement('div');
    divBotoes.className = 'd-flex gap-2 flex-wrap';
    
    const btnTentar = document.createElement('button');
    btnTentar.className = 'btn btn-sm btn-primary';
    btnTentar.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Tentar Novamente';
    btnTentar.onclick = () => reenviarPalpites();
    
    const btnVerificar = document.createElement('button');
    btnVerificar.className = 'btn btn-sm btn-outline-primary';
    btnVerificar.innerHTML = '<i class="bi bi-eye"></i> Verificar';
    btnVerificar.onclick = () => visualizarPalpitesSalvos();
    
    const btnLimpar = document.createElement('button');
    btnLimpar.className = 'btn btn-sm btn-danger';
    btnLimpar.innerHTML = '<i class="bi bi-trash"></i> Limpar';
    btnLimpar.onclick = () => limparDados();
    
    divBotoes.appendChild(btnTentar);
    divBotoes.appendChild(btnVerificar);
    divBotoes.appendChild(btnLimpar);
    
    alert.appendChild(heading);
    alert.appendChild(texto);
    alert.appendChild(divBotoes);
    alert.classList.remove('d-none');
}

// ====================
// 📋 ALERTA DE RASCUNHO
// ====================

function exibirAlertaRascunho() {
    let totalPreenchidos = 0;
    if (dadosApp.palpitesSalvos.length > 0) {
        const ultimoPalpite = dadosApp.palpitesSalvos[dadosApp.palpitesSalvos.length - 1];
        totalPreenchidos = ultimoPalpite.palpites.filter(p => p.placarA && p.placarB).length;
    }
    
    const alert = document.getElementById('alert-dados-enviados');
    
    const heading = document.createElement('h6');
    heading.className = 'alert-heading';
    heading.innerHTML = '<i class="bi bi-save2 text-primary"></i> Palpites salvos no dispositivo!';
    
    const texto = document.createElement('p');
    texto.className = 'mb-2';
    
    const divBotoes = document.createElement('div');
    divBotoes.className = 'd-flex gap-2 flex-wrap';
    
    if (totalPreenchidos === 10) {
        // ✅ 10/10: 3 botões
        texto.innerHTML = `✅ Você já preencheu <strong>todos os 10 palpites</strong>!<br>
                          Agora é só enviar ou verificar seus palpites.`;
        
        const btnVisualizar = document.createElement('button');
        btnVisualizar.className = 'btn btn-sm btn-outline-primary';
        btnVisualizar.innerHTML = '<i class="bi bi-eye"></i> Visualizar/Editar';
        btnVisualizar.onclick = () => visualizarPalpitesSalvos();
        
        const btnEnviar = document.createElement('button');
        btnEnviar.className = 'btn btn-sm btn-success';
        btnEnviar.innerHTML = '<i class="bi bi-send"></i> Enviar Agora';
        btnEnviar.onclick = () => {
            visualizarPalpitesSalvos();
            setTimeout(() => {
                const btnSalvar = document.getElementById('btn-salvar-palpites');
                if (btnSalvar) btnSalvar.click();
            }, 500);
        };
        
        const btnLimpar = document.createElement('button');
        btnLimpar.className = 'btn btn-sm btn-danger';
        btnLimpar.innerHTML = '<i class="bi bi-trash"></i> Limpar Dados';
        btnLimpar.onclick = () => limparDados();
        
        divBotoes.appendChild(btnVisualizar);
        divBotoes.appendChild(btnEnviar);
        divBotoes.appendChild(btnLimpar);
        
    } else {
        // ✅ 0-9/10: 2 botões (Continuar + Limpar)
        texto.innerHTML = `📋 Você tem <strong>${totalPreenchidos} de 10</strong> palpites preenchidos.<br>
                          Continue preenchendo <strong>todos os jogos</strong> para enviar seus palpites.`;
        
        const btnContinuar = document.createElement('button');
        btnContinuar.className = 'btn btn-sm btn-primary';
        btnContinuar.innerHTML = '<i class="bi bi-play-circle"></i> Continuar Preenchendo';
        btnContinuar.onclick = () => visualizarPalpitesSalvos();
        
        const btnLimpar = document.createElement('button');
        btnLimpar.className = 'btn btn-sm btn-danger';
        btnLimpar.innerHTML = '<i class="bi bi-trash"></i> Limpar Dados';
        btnLimpar.onclick = () => limparDados();
        
        divBotoes.appendChild(btnContinuar);
        divBotoes.appendChild(btnLimpar);
    }
    
    alert.appendChild(heading);
    alert.appendChild(texto);
    alert.appendChild(divBotoes);
    alert.classList.remove('d-none');
}

function exibirAlertaPrazoExpirado() {
    const alert = document.getElementById('alert-prazo-expirado');
    
    const heading = document.createElement('h6');
    heading.className = 'alert-heading';
    heading.innerHTML = '<i class="bi bi-clock"></i> Prazo Expirado!';
    
    const texto = document.createElement('p');
    texto.className = 'mb-2';
    texto.innerHTML = `O prazo para envio dos palpites desta rodada já expirou em <strong>${configRodada.dataLimite}</strong>.<br>
                      Seus palpites foram salvos, mas <strong>não podem ser enviados</strong>.`;
    
    const divBotoes = document.createElement('div');
    divBotoes.className = 'd-flex gap-2 flex-wrap';
    
    const btnVisualizar = document.createElement('button');
    btnVisualizar.className = 'btn btn-sm btn-outline-primary';
    btnVisualizar.innerHTML = '<i class="bi bi-eye"></i> Visualizar Palpites';
    btnVisualizar.onclick = () => visualizarPalpitesSalvos();
    
    const btnLimpar = document.createElement('button');
    btnLimpar.className = 'btn btn-sm btn-danger';
    btnLimpar.innerHTML = '<i class="bi bi-trash"></i> Limpar Dados';
    btnLimpar.onclick = () => limparDados();
    
    divBotoes.appendChild(btnVisualizar);
    divBotoes.appendChild(btnLimpar);
    
    alert.appendChild(heading);
    alert.appendChild(texto);
    alert.appendChild(divBotoes);
    alert.classList.remove('d-none');
}

function atualizarBotoesConclusao() {
    const alertInternet = document.getElementById('alert-sem-internet-conclusao');
    const alertSucesso = document.getElementById('alert-envio-sucesso-conclusao');
    const alertPrazo = document.getElementById('alert-prazo-expirado-conclusao');
    const dataLimiteExibida = document.getElementById('data-limite-exibida');
    
    alertInternet.innerHTML = '';
    alertSucesso.innerHTML = '';
    alertPrazo.innerHTML = '';
    alertInternet.classList.add('d-none');
    alertSucesso.classList.add('d-none');
    alertPrazo.classList.add('d-none');
    
    const prazoValido = verificarPrazoValido();
    
    if (!prazoValido) {
        const heading = document.createElement('h6');
        heading.className = 'alert-heading';
        heading.innerHTML = '<i class="bi bi-clock"></i> Prazo Expirado!';
        
        const texto = document.createElement('p');
        texto.className = 'mb-0';
        texto.innerHTML = `O prazo para envio dos palpites desta rodada já expirou em 
                          <span class="fw-bold">${configRodada.dataLimite}</span>.`;
        
        alertPrazo.appendChild(heading);
        alertPrazo.appendChild(texto);
        alertPrazo.classList.remove('d-none');
        dataLimiteExibida.textContent = configRodada.dataLimite;
    } else if (dadosApp.dadosEnviados) {
        const heading = document.createElement('h6');
        heading.className = 'alert-heading';
        heading.innerHTML = '<i class="bi bi-check-circle"></i> Palpites enviados com sucesso!';
        
        const texto = document.createElement('p');
        texto.className = 'mb-0';
        texto.textContent = `Seus palpites da ${configRodada.numeroRodada} já foram enviados.`;
        
        alertSucesso.appendChild(heading);
        alertSucesso.appendChild(texto);
        alertSucesso.classList.remove('d-none');
    } else if (dadosApp.erroInternet) {
        const heading = document.createElement('h6');
        heading.className = 'alert-heading';
        heading.innerHTML = '<i class="bi bi-wifi-off"></i> Sem conexão com internet!';
        
        const texto = document.createElement('p');
        texto.className = 'mb-2';
        texto.textContent = 'Seus palpites foram salvos, mas não foi possível enviá-los.';
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Tentar Novamente';
        btn.onclick = () => iniciarEnvioGoogleForms();
        
        alertInternet.appendChild(heading);
        alertInternet.appendChild(texto);
        alertInternet.appendChild(btn);
        alertInternet.classList.remove('d-none');
    }
}

// ====================
// 🎯 FUNÇÕES PRINCIPAIS
// ====================

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
    return dadosApp.rodadaSalva === configRodada.numeroRodada ? 'mesma_rodada' : 'rodada_diferente';
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

// ====================
// 📊 ATUALIZAR BARRA DE PROGRESSO
// ====================

function atualizarDashboardHeader() {
    const barra = document.getElementById('header-barra-progresso-palpites');
    const textoBarra = document.getElementById('header-texto-barra');
    const bolaFutebol = document.getElementById('bola-futebol');
    
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
    
    bolaFutebol.style.left = posicaoBola === 0 ? '0%' : 
                             posicaoBola === 100 ? '100%' : posicaoBola + '%';
    
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
        setTimeout(() => bolaFutebol.classList.remove('animando'), 800);
    }
    
    barra.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    bolaFutebol.style.transition = 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

    atualizarDestaquesJogos();
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
    
    return { todosPreenchidos, jogosNaoPreenchidos };
}

// ====================
// 🎯 CARREGAR JOGOS (SEM DADOS SALVOS)
// ====================

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
                                    name="placarA-${jogo.id}">
                                ${gerarOpcoesSelect()}
                            </select>
                        </div>
                        <div class="col-2 text-center">
                            <div class="fw-bold fs-5">X</div>
                        </div>
                        <div class="col-5 text-center">
                            <div class="fw-bold mb-2 small">${jogo.timeB}</div>
                            <select class="form-control input-placar" 
                                    name="placarB-${jogo.id}">
                                ${gerarOpcoesSelect()}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
        
        // Adicionar eventos aos selects
        const selectA = card.querySelector(`select[name="placarA-${jogo.id}"]`);
        const selectB = card.querySelector(`select[name="placarB-${jogo.id}"]`);
        
        selectA.addEventListener('change', function() {
            atualizarDashboardHeader();
            salvarPalpiteAutomatico(jogo.id);
        });
        
        selectB.addEventListener('change', function() {
            atualizarDashboardHeader();
            salvarPalpiteAutomatico(jogo.id);
        });
    });

    setTimeout(() => {
        atualizarDestaquesJogos();
    }, 100);
}

// ====================
// 🎯 CARREGAR JOGOS COM DADOS SALVOS
// ====================

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
                                    name="placarA-${jogo.id}">
                                ${gerarOpcoesSelect(placarA)}
                            </select>
                        </div>
                        <div class="col-2 text-center">
                            <div class="fw-bold fs-5">X</div>
                        </div>
                        <div class="col-5 text-center">
                            <div class="fw-bold mb-2 small">${jogo.timeB}</div>
                            <select class="form-control input-placar" 
                                    name="placarB-${jogo.id}">
                                ${gerarOpcoesSelect(placarB)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
        
        const selectA = card.querySelector(`select[name="placarA-${jogo.id}"]`);
        const selectB = card.querySelector(`select[name="placarB-${jogo.id}"]`);
        
        selectA.addEventListener('change', function() {
            atualizarDashboardHeader();
            salvarPalpiteAutomatico(jogo.id);
        });
        
        selectB.addEventListener('change', function() {
            atualizarDashboardHeader();
            salvarPalpiteAutomatico(jogo.id);
        });
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

    setTimeout(() => {
        atualizarDestaquesJogos();
    }, 100);
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
        const resultadoDiv = document.getElementById('resultado-envio');
        resultadoDiv.innerHTML = `
            <div class="alert alert-warning">
                <h6 class="alert-heading"><i class="bi bi-clock"></i> Prazo Expirado!</h6>
                <p class="mb-0">
                    O prazo para envio dos palpites desta rodada já expirou em ${configRodada.dataLimite}.<br>
                    Seus palpites foram salvos, mas não podem ser enviados.
                </p>
            </div>
        `;
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
        setTimeout(() => document.body.style.overflow = '', 50);
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
    
    if (telaId === 'tela-participante') verificarEstadoAplicacao();
    if (telaId === 'tela-conclusao') atualizarBotoesConclusao();
    
    window.scrollTo(0, 0);
}

function visualizarPalpitesSalvos() {
    mostrarTela('tela-palpites');
    carregarJogosComDadosSalvos();
}

function visualizarPalpitesEnviados() {
    visualizarPalpitesSalvos();
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
        link.click();
        
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

function aplicarAjustesIOS() {
    if (isIOS()) {
        document.addEventListener('focusin', function(e) {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                document.body.style.fontSize = '16px';
            }
        });
        
        document.addEventListener('focusout', function(e) {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                setTimeout(() => document.body.style.fontSize = '', 100);
            }
        });
    }
}

aplicarAjustesIOS();
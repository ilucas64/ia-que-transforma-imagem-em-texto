window.onload = function () {
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');
    const output = document.getElementById('output');
    const mathInteraction = document.getElementById('mathInteraction');
    const mathQuestion = document.getElementById('mathQuestion');
    const mathAnswer = document.getElementById('mathAnswer');
    const toggleMathModeButton = document.getElementById('toggleMathMode');
    const toggleChatModeButton = document.getElementById('toggleChatMode');
    const chatInteraction = document.getElementById('chatInteraction');
    const chatInput = document.getElementById('chatInput');
    const chatOutput = document.getElementById('chatOutput');
    const processButton = document.querySelector('button[onclick="processImage()"]');
    const detectColorButton = document.querySelector('button[onclick="detectColor()"]');
    const dropArea = document.getElementById('dropArea');
    let mathMode = false;
    let chatMode = false;
    let extractedText = '';
    let loadedImage = null;
    let isProcessing = false;
    let chatHistory = [];

    // Verifica se as bibliotecas estão carregadas
    if (typeof Tesseract === 'undefined') {
        output.textContent = 'Erro: Tesseract.js não carregado. Verifique sua conexão.';
        output.classList.add('error');
        return;
    }
    if (typeof math === 'undefined') {
        output.textContent = 'Erro: Math.js não carregado. Verifique sua conexão.';
        output.classList.add('error');
        return;
    }

    processButton.disabled = true;
    detectColorButton.disabled = true;

    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        } else {
            output.textContent = 'Por favor, solte uma imagem válida.';
            output.classList.add('error');
        }
    });

    // Adiciona evento de Enter para o campo de pergunta matemática
    mathQuestion.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            answerMathQuestion();
        }
    });

    // Adiciona evento de Enter para o campo de chat
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    });

    function handleImageFile(file) {
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.style.display = 'block';
        loadedImage = file;
        processButton.disabled = false;
        detectColorButton.disabled = false;
        output.innerHTML = 'O texto extraído aparecerá aqui...';
        output.classList.remove('error', 'loading');
    }

    window.toggleMathMode = function () {
        if (chatMode) {
            toggleChatMode();
        }
        mathMode = !mathMode;
        toggleMathModeButton.textContent = mathMode ? 'Desativar Modo Matemático' : 'Ativar Modo Matemático';
        toggleMathModeButton.classList.toggle('active', mathMode);

        if (mathMode) {
            output.style.display = 'none';
            mathInteraction.style.display = 'flex';
            chatInteraction.style.display = 'none';
            mathAnswer.textContent = 'A resposta aparecerá aqui...';
        } else {
            output.style.display = 'block';
            mathInteraction.style.display = 'none';
            chatInteraction.style.display = chatMode ? 'flex' : 'none';
            output.textContent = extractedText || 'O texto extraído aparecerá aqui...';
        }
    };

    window.toggleChatMode = function () {
        if (mathMode) {
            mathMode = false;
            toggleMathModeButton.textContent = 'Ativar Modo Matemático';
            toggleMathModeButton.classList.remove('active');
            mathInteraction.style.display = 'none';
        }
        chatMode = !chatMode;
        toggleChatModeButton.textContent = chatMode ? 'Desativar Modo Conversa com IA' : 'Ativar Modo Conversa com IA';
        toggleChatModeButton.classList.toggle('active', chatMode);

        if (chatMode) {
            output.style.display = 'none';
            mathInteraction.style.display = 'none';
            chatInteraction.style.display = 'flex';
            chatOutput.innerHTML = 'Oi! Estou pronto para conversar ou responder suas dúvidas sobre o site. 😄 O que você quer saber?';
        } else {
            output.style.display = 'block';
            mathInteraction.style.display = mathMode ? 'flex' : 'none';
            chatInteraction.style.display = 'none';
            output.textContent = extractedText || 'O texto extraído aparecerá aqui...';
        }
    };

    window.resetFile = function () {
        imageInput.value = '';
        preview.src = '';
        preview.style.display = 'none';
        loadedImage = null;
        extractedText = '';
        output.innerHTML = 'O texto extraído aparecerá aqui...';
        output.classList.remove('error', 'loading');
        mathAnswer.textContent = 'A resposta aparecerá aqui...';
        chatOutput.textContent = 'A resposta da IA aparecerá aqui...';
        chatHistory = [];
    };

    window.processImage = async function () {
        if (!loadedImage) {
            output.textContent = 'Por favor, selecione uma imagem primeiro!';
            output.classList.add('error');
            return;
        }

        if (isProcessing) {
            output.textContent = 'Processamento em andamento, por favor aguarde...';
            output.classList.add('loading');
            return;
        }

        isProcessing = true;
        processButton.disabled = true;
        detectColorButton.disabled = true;

        output.textContent = 'Processando...';
        output.classList.add('loading');
        output.classList.remove('error');

        try {
            const { data: { text } } = await Tesseract.recognize(
                loadedImage,
                'eng+chi_sim',
                {
                    logger: (m) => console.log(m),
                    tessedit_char_whitelist: '0123456789+-*/= ',
                    tessedit_pageseg_mode: 6,
                    oem: 1,
                    tessedit_ocr_engine_mode: 1,
                    tessedit_char_blacklist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
                }
            );

            extractedText = text || 'Nenhum texto reconhecido.';
            if (!mathMode && !chatMode) {
                output.textContent = extractedText;
                output.classList.remove('loading');
            }
        } catch (error) {
            console.error('Erro ao processar a imagem:', error);
            output.textContent = 'Erro ao processar a imagem: ' + error.message;
            output.classList.add('error');
            output.classList.remove('loading');
        } finally {
            isProcessing = false;
            processButton.disabled = false;
            detectColorButton.disabled = false;
        }
    };

    window.detectColor = async function () {
        if (!loadedImage) {
            output.textContent = 'Por favor, selecione uma imagem primeiro!';
            output.classList.add('error');
            return;
        }

        if (isProcessing) {
            output.textContent = 'Processamento em andamento, por favor aguarde...';
            output.classList.add('loading');
            return;
        }

        isProcessing = true;
        processButton.disabled = true;
        detectColorButton.disabled = true;

        output.textContent = 'Carregando imagem para detecção de cores...';
        output.classList.add('loading');
        output.classList.remove('error');

        try {
            const img = new Image();
            img.src = URL.createObjectURL(loadedImage);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const step = 5;
            const uniqueColors = new Set();

            for (let y = 0; y < canvas.height; y += step) {
                for (let x = 0; x < canvas.width; x += step) {
                    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
                    if (a < 128) continue;
                    const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
                    uniqueColors.add(hex);
                    if (uniqueColors.size > 100) break;
                }
                if (uniqueColors.size > 100) break;
            }

            if (uniqueColors.size === 0) {
                throw new Error('Nenhuma cor visível detectada.');
            }

            let html = '<strong>Cores detectadas:</strong><br>';
            uniqueColors.forEach(hex => {
                html += `<div class="color-box" style="background-color: #${hex};"></div> #${hex}<br>`;
            });

            output.innerHTML = html;
            output.classList.remove('loading');
        } catch (error) {
            console.error('Erro ao detectar as cores:', error);
            output.textContent = 'Erro ao detectar as cores: ' + error.message;
            output.classList.add('error');
            output.classList.remove('loading');
        } finally {
            isProcessing = false;
            processButton.disabled = false;
            detectColorButton.disabled = false;
        }
    };

    window.answerMathQuestion = function () {
        const question = mathQuestion.value.trim();
        if (!question) {
            mathAnswer.textContent = 'Por favor, digite uma pergunta matemática.';
            return;
        }

        try {
            // Normaliza a entrada para lidar com variações
            let expr = question
                .replace(/÷/g, '/') // Substitui ÷ por /
                .replace(/×/g, '*') // Substitui × por *
                .replace(/x/g, '*') // Substitui x por *
                .replace(/\s+/g, '') // Remove espaços
                .replace(/=$/, ''); // Remove = no final

            // Extrai expressões de perguntas naturais
            if (question.toLowerCase().includes('quanto é') || question.toLowerCase().includes('qual é') || 
                question.toLowerCase().includes('calcula')) {
                const match = question.match(/(\d+\s*[+\-*/x÷]\s*\d+\s*[+\-*/x÷]\s*\d+[+\-*/x÷=]*\d*)/) || 
                             question.match(/(\d+\s*[+\-*/x÷]\s*\d+)/);
                if (match) {
                    expr = match[0]
                        .replace(/\s+/g, '')
                        .replace(/÷/g, '/')
                        .replace(/×/g, '*')
                        .replace(/x/g, '*');
                }
            }

            // Suporte a texto extraído da imagem
            if (question.toLowerCase().includes('texto') || question.toLowerCase().includes('imagem')) {
                const match = extractedText.match(/(\d+\s*[+\-*/]\s*\d+\s*[+\-*/]\s*\d+[+\-*/=]*\d*)|(\d+\s*[+\-*/]\s*\d+)/);
                if (match) {
                    expr = match[0]
                        .replace(/\s+/g, '')
                        .replace(/=$/, '');
                } else {
                    mathAnswer.textContent = 'Não encontrei um cálculo válido no texto extraído.';
                    return;
                }
            }

            // Valida a expressão
            if (!/^\d+[+\-*/]\d+[+\-*/\d]*$/.test(expr)) {
                mathAnswer.textContent = 'Desculpe, a expressão não parece válida. Tente algo como "2*2/2+2".';
                return;
            }

            // Avalia a expressão usando Math.js
            const evalResult = math.evaluate(expr);
            if (typeof evalResult === 'number' && !isNaN(evalResult)) {
                mathAnswer.textContent = `Resultado: ${expr} = ${evalResult}`;
                mathQuestion.value = '';
            } else {
                mathAnswer.textContent = 'Erro: Não consegui calcular a expressão. Verifique o formato.';
            }
        } catch (error) {
            console.error('Erro ao calcular:', error);
            mathAnswer.textContent = 'Erro ao calcular: ' + error.message;
        }
    };

    // Função para normalizar texto (lida com erros de digitação)
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[.,!?;]/g, '') // Remove pontuação
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
    }

    window.sendChatMessage = function () {
        const message = chatInput.value.trim();
        if (!message) {
            chatOutput.innerHTML = 'Por favor, digite uma mensagem.';
            return;
        }

        chatHistory.push({ user: message });
        if (chatHistory.length > 10) chatHistory.shift();

        chatOutput.innerHTML = 'Pensando...';

        setTimeout(() => {
            let response = '';
            const normalizedMessage = normalizeText(message);
            const lastUserMessage = chatHistory.length > 1 ? normalizeText(chatHistory[chatHistory.length - 2].user) : '';

            // Respostas sobre funcionalidades do site
            if (normalizedMessage.includes('o que voce faz') || normalizedMessage.includes('funcionalidades') || 
                normalizedMessage.includes('o que esse site faz') || normalizedMessage.includes('oque faz') || 
                normalizedMessage.includes('site faz') || normalizedMessage.includes('funciona site')) {
                response = 'Eu sou uma IA que torna o uso deste site mais fácil e divertido! 😊 O site tem quatro funções principais:\n' +
                          '- **Extrair texto de imagens**: Carregue uma imagem e clique em "Processar Imagem" para extrair números e símbolos matemáticos usando OCR.\n' +
                          '- **Detectar cores**: Clique em "Detectar Cor Predominante" para ver as cores de uma imagem com seus códigos hexadecimais.\n' +
                          '- **Modo Matemático**: Ative o modo para resolver cálculos simples ou complexos, como "2*2/2+2", ou usar o texto extraído.\n' +
                          '- **Conversa com IA**: Estou aqui para explicar tudo, responder dúvidas e até contar piadas! 😄\n' +
                          'Quer saber como alguma dessas funções funciona em detalhes?';
            } else if (normalizedMessage.includes('processar imagem') || normalizedMessage.includes('extrair texto') || 
                       normalizedMessage.includes('ocr') || normalizedMessage.includes('prosesar imagem') || 
                       normalizedMessage.includes('estrair testo') || normalizedMessage.includes('como extrai texto') || 
                       normalizedMessage.includes('como funciona ocr') || normalizedMessage.includes('botao processar')) {
                response = 'A função "Processar Imagem" é incrível para transformar imagens em texto! 📸 Veja como ela funciona:\n' +
                          '- **Passo 1**: Você carrega uma imagem arrastando-a para a área tracejada ou clicando em "Escolher arquivo".\n' +
                          '- **Passo 2**: Clica em "Processar Imagem".\n' +
                          '- **Nos bastidores**: O site usa uma biblioteca chamada Tesseract.js, que faz OCR (Reconhecimento Óptico de Caracteres). Ela analisa a imagem e identifica números (0-9) e símbolos matemáticos (+, -, *, /, =). Letras são ignoradas para focar em cálculos.\n' +
                          '- **Resultado**: O texto extraído, como "2 + 3 = 5", aparece na área de saída abaixo da imagem.\n' +
                          '- **Exemplo**: Se você carregar uma foto de um caderno com "10 - 4 = 6", o site vai mostrar exatamente isso. É perfeito para digitalizar equações ou contas escritas à mão!\n' +
                          '- **Dica**: Imagens nítidas com texto claro funcionam melhor.\n' +
                          'Quer testar com uma imagem ou saber mais sobre o OCR?';
            } else if (normalizedMessage.includes('detectar cor') || normalizedMessage.includes('cores') || 
                       normalizedMessage.includes('cor predominante') || normalizedMessage.includes('detetar cor') || 
                       normalizedMessage.includes('qual cor') || normalizedMessage.includes('como ve cor') || 
                       normalizedMessage.includes('como funciona cores') || normalizedMessage.includes('botao cores')) {
                response = 'A função "Detectar Cor Predominante" é ótima para explorar as cores de uma imagem! 🌈 Aqui está o que acontece:\n' +
                          '- **Passo 1**: Carregue uma imagem (arrastando ou escolhendo um arquivo).\n' +
                          '- **Passo 2**: Clique em "Detectar Cor Predominante".\n' +
                          '- **Nos bastidores**: O site usa JavaScript e a API Canvas para analisar a imagem pixel por pixel. Ele coleta amostras de cores (ignorando áreas transparentes) e converte cada cor para um código hexadecimal, como #FF0000 (vermelho).\n' +
                          '- **Resultado**: Uma lista de cores únicas aparece, cada uma com um quadradinho colorido e seu código hexadecimal. O site limita a 100 cores para não sobrecarregar.\n' +
                          '- **Exemplo**: Se você carregar uma foto de uma pintura com vermelho, azul e verde, verá quadradinhos para cada cor e códigos como #FF0000, #0000FF, etc.\n' +
                          '- **Dica**: Funciona bem com imagens coloridas, como fotos ou desenhos.\n' +
                          'Quer experimentar com uma imagem ou saber mais sobre os códigos hexadecimais?';
            } else if (normalizedMessage.includes('modo matematico') || normalizedMessage.includes('matematica') || 
                       normalizedMessage.includes('calcular') || normalizedMessage.includes('modu matematico') || 
                       normalizedMessage.includes('como calcula') || normalizedMessage.includes('calculo') || 
                       normalizedMessage.includes('como funciona matematica') || normalizedMessage.includes('botao matematico')) {
                response = 'O Modo Matemático é perfeito para cálculos rápidos e precisos! 🧮 Veja como ele funciona:\n' +
                          '- **Passo 1**: Clique em "Ativar Modo Matemático" (o botão fica verde).\n' +
                          '- **Passo 2**: Digite uma expressão no campo que aparece, como "2*2/2+2" ou "quanto é 10 - 4".\n' +
                          '- **Passo 3**: Pressione "Enter" ou clique em "Enviar Pergunta".\n' +
                          '- **Nos bastidores**: O site usa a biblioteca Math.js para interpretar e calcular expressões matemáticas. Ele suporta operações básicas (+, -, *, /) e segue a ordem de precedência (ex.: multiplicação antes de adição).\n' +
                          '- **Integração com imagens**: Se você processou uma imagem e o texto extraído tem um cálculo (ex.: "2*2/2+2"), pode perguntar "qual é o cálculo na imagem?" e eu resolvo.\n' +
                          '- **Resultado**: O cálculo é mostrado, como "2*2/2+2 = 4" ou "No texto extraído: 6 / 2 = 3".\n' +
                          '- **Exemplo**: Digite "2 + 2*3" e verá "2 + 2*3 = 8" (porque 2*3 é calculado primeiro).\n' +
                          'Quer tentar um cálculo ou saber mais sobre o Math.js?';
            } else if (normalizedMessage.includes('modo ia') || normalizedMessage.includes('conversa ia') || 
                       normalizedMessage.includes('como funciona ia') || normalizedMessage.includes('modu ia') || 
                       normalizedMessage.includes('como voce funciona') || normalizedMessage.includes('funciona conversa') || 
                       normalizedMessage.includes('botao conversa')) {
                response = 'O Modo Conversa com IA sou eu, seu assistente virtual! 😎 Aqui está como funciono:\n' +
                          '- **Passo 1**: Clique em "Ativar Modo Conversa com IA" (o botão fica laranja).\n' +
                          '- **Passo 2**: Digite sua pergunta ou mensagem no campo, como "O que você faz?" ou "Me conta uma piada".\n' +
                          '- **Passo 3**: Pressione "Enter" ou clique em "Enviar Mensagem".\n' +
                          '- **Nos bastidores**: Eu analiso sua mensagem usando JavaScript, procurando palavras-chave e padrões. Para lidar com erros de digitação, normalizo o texto (removo acentos, pontuação, etc.). Mantenho um histórico das últimas 10 mensagens para lembrar o contexto.\n' +
                          '- **O que posso fazer**: Explico todas as funções do site, respondo perguntas gerais, conto piadas e até converso sobre tecnologia ou jogos. Se você escrever com erros, como "oq faz", eu entendo do mesmo jeito!\n' +
                          '- **Exemplo**: Pergunte "Como funciona o modo matemático?" e eu explico em detalhes. Ou diga "Oi, tudo bem?" para um papo leve.\n' +
                          'Quer testar me perguntando algo ou saber mais sobre como fui programado?';
            } else if (normalizedMessage.includes('quem e voce') || normalizedMessage.includes('quem criou') || 
                       normalizedMessage.includes('quem fez') || normalizedMessage.includes('kem e voce') || 
                       normalizedMessage.includes('quem e o criador') || normalizedMessage.includes('sobre voce')) {
                response = 'Eu sou a IA conversacional deste site, seu guia virtual! 😊 Fui criado para ajudar a usar o site, explicar como ele funciona e tornar tudo mais divertido. Meu "nome" é IA do Site, e adoro responder dúvidas, contar piadas e conversar. Quer saber mais sobre alguma função do site ou prefere um papo descontraído?';
            } else if (normalizedMessage.includes('bom dia') || normalizedMessage.includes('ola') || 
                       normalizedMessage.includes('oi') || normalizedMessage.includes('bun dia') || 
                       normalizedMessage.includes('oie') || normalizedMessage.includes('hola')) {
                response = 'Oi! Bom dia pra você também! 😄 Como está o seu dia? Quer aprender mais sobre o site ou só conversar um pouco?';
            } else if (normalizedMessage.includes('tudo bem') || normalizedMessage.includes('como voce esta') || 
                       normalizedMessage.includes('ta bem') || normalizedMessage.includes('tudu bem') || 
                       normalizedMessage.includes('como ta') || normalizedMessage.includes('tá de boa')) {
                response = 'Tô de boa, e você? 😎 Estou aqui prontinho para ajudar com qualquer dúvida ou só jogar conversa fora. O que tá na sua cabeça hoje?';
            } else if (normalizedMessage.includes('obrigado') || normalizedMessage.includes('valeu') || 
                       normalizedMessage.includes('agradeco') || normalizedMessage.includes('brigado') || 
                       normalizedMessage.includes('obg') || normalizedMessage.includes('vlw')) {
                response = 'De nada, fico feliz em ajudar! 😊 Se precisar de mais alguma coisa, é só chamar!';
            } else if (normalizedMessage.includes('piada') || normalizedMessage.includes('engracado') || 
                       normalizedMessage.includes('me faz rir') || normalizedMessage.includes('piadinha') || 
                       normalizedMessage.includes('gracinha') || normalizedMessage.includes('conta piada')) {
                response = 'Tá querendo rir? 😄 Lá vai uma piada: Por que o astronauta terminou com a namorada? Porque ele precisava de espaço! 😂 Quer ouvir outra ou prefere falar sobre o site?';
            } else if (normalizedMessage.includes('como funciona') && lastUserMessage.includes('site')) {
                response = 'Quer mais detalhes sobre o site? 😄 Ele tem quatro funções principais:\n' +
                          '- **Extrair texto**: Carregue uma imagem e clique em "Processar Imagem" para ver números e cálculos.\n' +
                          '- **Detectar cores**: Use "Detectar Cor Predominante" para ver as cores da imagem com códigos hexadecimais.\n' +
                          '- **Modo Matemático**: Ative o modo e digite cálculos como "2*2/2+2" para obter resultados.\n' +
                          '- **Conversa com IA**: Fale comigo para entender o site ou bater um papo!\n' +
                          'Qual dessas funções você quer saber mais?';
            } else if (normalizedMessage.includes('o que mais') || normalizedMessage.includes('outra coisa') || 
                       normalizedMessage.includes('fazer mais') || normalizedMessage.includes('oq mais') || 
                       normalizedMessage.includes('outra koisas') || normalizedMessage.includes('tem mais')) {
                response = 'Quer saber mais? 😄 Além de extrair texto, detectar cores, fazer cálculos e conversar, posso te ajudar a explorar ideias para o site ou falar sobre tecnologia. Por exemplo, já pensou em adicionar novas funções? Me conta o que você tá pensando!';
            } else if (normalizedMessage.includes('jogo') || normalizedMessage.includes('games') || 
                       normalizedMessage.includes('jogar') || normalizedMessage.includes('jogu') || 
                       normalizedMessage.includes('game') || normalizedMessage.includes('joga')) {
                response = 'Curte jogos, hein? 😎 Este site não tem jogos, mas posso explicar como ele funciona ou conversar sobre seus jogos favoritos. Quem sabe até pensamos em como adicionar um jogo ao site no futuro? Qual é o seu jogo preferido?';
            } else if (normalizedMessage.includes('tecnologia') || normalizedMessage.includes('programacao') || 
                       normalizedMessage.includes('codigo') || normalizedMessage.includes('tecnolojia') || 
                       normalizedMessage.includes('programasao') || normalizedMessage.includes('codigu')) {
                response = 'Fã de tecnologia? 😄 Este site usa JavaScript, Tesseract.js para extrair texto, Math.js para cálculos e uma IA (eu!) para conversar. É uma combinação poderosa! Quer saber mais sobre como ele foi construído ou tem alguma ideia para adicionar novas funções?';
            } else {
                response = 'Hmm, interessante! 😄 Não sei tudo, mas posso tentar ajudar. Você está falando do site ou quer conversar sobre outra coisa? Me dá mais um detalhe para eu entender melhor!';
                if (chatHistory.length > 1) {
                    response += ' A propósito, você mencionou algo sobre "' + chatHistory[chatHistory.length - 2].user + '" antes. Quer continuar esse papo?';
                }
            }

            chatHistory.push({ ai: response });

            let chatDisplay = '';
            chatHistory.forEach(entry => {
                if (entry.user) {
                    chatDisplay += `<strong>Você:</strong> ${entry.user}<br>`;
                }
                if (entry.ai) {
                    chatDisplay += `<strong>IA:</strong> ${entry.ai}<br>`;
                }
            });

            chatOutput.innerHTML = chatDisplay;
            chatInput.value = '';
        }, 1000);
    };
};
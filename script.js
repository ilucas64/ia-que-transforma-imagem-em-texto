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
    const filterButton = document.querySelector('button[onclick="toggleFilters()"]');
    const exportButton = document.querySelector('button[onclick="exportToPDF()"]');
    const resetButton = document.querySelector('button[onclick="resetFile()"]');
    const dropArea = document.getElementById('dropArea');
    const filterControls = document.getElementById('filterControls');
    let mathMode = false;
    let chatMode = false;
    let extractedText = '';
    let detectedColors = [];
    let loadedImage = null;
    let isProcessing = false;
    let chatHistory = [];
    let lastMathResult = '';
    let currentFilter = 'none';
    let filteredImageData = null;

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
    if (typeof jspdf === 'undefined') {
        output.textContent = 'Erro: jsPDF não carregado. Verifique sua conexão.';
        output.classList.add('error');
        return;
    }

    processButton.disabled = true;
    detectColorButton.disabled = true;
    filterButton.disabled = true;
    exportButton.disabled = true;
    resetButton.disabled = true;

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
        filterButton.disabled = false;
        exportButton.disabled = false;
        resetButton.disabled = false;
        output.innerHTML = 'O texto extraído aparecerá aqui...';
        output.classList.remove('error', 'loading');
        detectedColors = [];
        currentFilter = 'none';
        filteredImageData = null;
        filterControls.style.display = 'none';
    }

    window.toggleFilters = function () {
        if (!loadedImage) {
            output.textContent = 'Por favor, selecione uma imagem primeiro!';
            output.classList.add('error');
            return;
        }
        filterControls.style.display = filterControls.style.display === 'none' ? 'flex' : 'none';
    };

    window.applyFilter = async function (filter) {
        if (!loadedImage) {
            output.textContent = 'Por favor, selecione uma imagem primeiro!';
            output.classList.add('error');
            return;
        }

        try {
            currentFilter = filter;
            const img = new Image();
            img.src = URL.createObjectURL(loadedImage);

            await new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('Imagem carregada com sucesso para aplicar filtro:', filter);
                    resolve();
                };
                img.onerror = () => {
                    console.error('Erro ao carregar a imagem para o filtro:', filter);
                    reject(new Error('Falha ao carregar a imagem.'));
                };
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                throw new Error('Não foi possível obter o contexto do canvas.');
            }

            ctx.drawImage(img, 0, 0);
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let data = imageData.data;

            if (filter === 'sepia') {
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
            } else if (filter === 'grayscale') {
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = data[i + 1] = data[i + 2] = avg;
                }
            } else if (filter === 'brightness') {
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 50);
                    data[i + 1] = Math.min(255, data[i + 1] + 50);
                    data[i + 2] = Math.min(255, data[i + 2] + 50);
                }
            } else if (filter === 'invert') {
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 255 - data[i];
                    data[i + 1] = 255 - data[i + 1];
                    data[i + 2] = 255 - data[i + 2];
                }
            }

            if (filter !== 'none') {
                ctx.putImageData(imageData, 0, 0);
                filteredImageData = canvas.toDataURL('image/png');
                preview.src = filteredImageData;
                console.log('Filtro aplicado com sucesso:', filter);
            } else {
                filteredImageData = null;
                preview.src = URL.createObjectURL(loadedImage);
                console.log('Filtro removido.');
            }

            output.textContent = `Filtro aplicado: ${filter === 'none' ? 'Nenhum' : filter.charAt(0).toUpperCase() + filter.slice(1)}`;
            output.classList.remove('error', 'loading');
        } catch (error) {
            console.error('Erro ao aplicar o filtro:', error);
            output.textContent = 'Erro ao aplicar o filtro: ' + error.message;
            output.classList.add('error');
        }
    };

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
            filterControls.style.display = 'none';
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
            filterControls.style.display = 'none';
            chatOutput.textContent = 'Oi! Estou pronto para conversar ou responder suas dúvidas sobre o site. O que você quer saber?';
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
        detectedColors = [];
        currentFilter = 'none';
        filteredImageData = null;
        filterControls.style.display = 'none';
        lastMathResult = '';
        output.innerHTML = 'O texto extraído aparecerá aqui...';
        output.classList.remove('error', 'loading');
        mathAnswer.textContent = 'A resposta aparecerá aqui...';
        chatOutput.textContent = 'A resposta da IA aparecerá aqui...';
        chatHistory = [];
        processButton.disabled = true;
        detectColorButton.disabled = true;
        filterButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;
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
        filterButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;

        output.textContent = 'Processando...';
        output.classList.add('loading');
        output.classList.remove('error');

        try {
            const imageToProcess = filteredImageData || loadedImage;
            const { data: { text } } = await Tesseract.recognize(
                imageToProcess,
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
            filterButton.disabled = false;
            exportButton.disabled = false;
            resetButton.disabled = false;
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
        filterButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;

        output.textContent = 'Carregando imagem para detecção de cores...';
        output.classList.add('loading');
        output.classList.remove('error');

        try {
            const img = new Image();
            img.src = filteredImageData || URL.createObjectURL(loadedImage);

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
            detectedColors = new Set();

            for (let y = 0; y < canvas.height; y += step) {
                for (let x = 0; x < canvas.width; x += step) {
                    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
                    if (a < 128) continue;
                    const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
                    detectedColors.add(hex);
                    if (detectedColors.size > 100) break;
                }
                if (detectedColors.size > 100) break;
            }

            if (detectedColors.size === 0) {
                throw new Error('Nenhuma cor visível detectada.');
            }

            let html = '<strong>Cores detectadas:</strong><br>';
            detectedColors.forEach(hex => {
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
            filterButton.disabled = false;
            exportButton.disabled = false;
            resetButton.disabled = false;
        }
    };

    window.exportToPDF = function () {
        if (!loadedImage && !extractedText && detectedColors.size === 0 && !lastMathResult && chatHistory.length === 0) {
            output.textContent = 'Nada para exportar! Tente processar uma imagem, detectar cores, aplicar filtros ou usar o modo matemático/IA primeiro.';
            output.classList.add('error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(16);
        doc.text('Resultados do Site', 20, y);
        y += 10;

        doc.setFontSize(12);
        if (currentFilter !== 'none') {
            doc.text(`Filtro Aplicado: ${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}`, 20, y);
            y += 10;
        }

        if (extractedText) {
            doc.text('Texto Extraído:', 20, y);
            y += 10;
            const splitText = doc.splitTextToSize(extractedText, 170);
            doc.text(splitText, 20, y);
            y += splitText.length * 10 + 10;
        }

        if (detectedColors.size > 0) {
            doc.text('Cores Detectadas:', 20, y);
            y += 10;
            let colorsText = Array.from(detectedColors).join(', ');
            const splitColors = doc.splitTextToSize(colorsText, 170);
            doc.text(splitColors, 20, y);
            y += splitColors.length * 10 + 10;
        }

        if (lastMathResult) {
            doc.text('Último Cálculo Matemático:', 20, y);
            y += 10;
            doc.text(lastMathResult, 20, y);
            y += 20;
        }

        if (chatHistory.length > 0) {
            doc.text('Histórico do Chat:', 20, y);
            y += 10;
            chatHistory.forEach(entry => {
                if (entry.user) {
                    doc.text(`Você: ${entry.user}`, 20, y);
                    y += 10;
                }
                if (entry.ai) {
                    const splitAi = doc.splitTextToSize(`IA: ${entry.ai}`, 170);
                    doc.text(splitAi, 20, y);
                    y += splitAi.length * 10;
                }
            });
        }

        doc.save('resultados_site.pdf');
        output.textContent = 'PDF exportado com sucesso!';
        output.classList.remove('error', 'loading');
    };

    window.answerMathQuestion = function () {
        const question = mathQuestion.value.trim();
        if (!question) {
            mathAnswer.textContent = 'Por favor, digite uma pergunta matemática.';
            return;
        }

        try {
            let expr = question
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/x/g, '*')
                .replace(/\s+/g, '')
                .replace(/=$/, '');

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

            if (!/^\d+[+\-*/]\d+[+\-*/\d]*$/.test(expr)) {
                mathAnswer.textContent = 'Desculpe, a expressão não parece válida. Tente algo como "2*2/2+2".';
                return;
            }

            const evalResult = math.evaluate(expr);
            if (typeof evalResult === 'number' && !isNaN(evalResult)) {
                lastMathResult = `${expr} = ${evalResult}`;
                mathAnswer.textContent = `Resultado: ${lastMathResult}`;
                mathQuestion.value = '';
            } else {
                mathAnswer.textContent = 'Erro: Não consegui calcular a expressão. Verifique o formato.';
            }
        } catch (error) {
            console.error('Erro ao calcular:', error);
            mathAnswer.textContent = 'Erro ao calcular: ' + error.message;
        }
    };

    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,!?;]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    window.sendChatMessage = function () {
        const message = chatInput.value.trim();
        if (!message) {
            chatOutput.textContent = 'Por favor, digite uma mensagem.';
            return;
        }

        chatHistory.push({ user: message });
        if (chatHistory.length > 10) chatHistory.shift();

        chatOutput.textContent = 'Pensando...';

        setTimeout(() => {
            let response = '';
            const normalizedMessage = normalizeText(message);
            const lastUserMessage = chatHistory.length > 1 ? normalizeText(chatHistory[chatHistory.length - 2].user) : '';

            if (normalizedMessage.includes('o que voce faz') || normalizedMessage.includes('funcionalidades') || 
                normalizedMessage.includes('o que esse site faz') || normalizedMessage.includes('oque faz') || 
                normalizedMessage.includes('site faz') || normalizedMessage.includes('funciona site')) {
                response = 'Eu sou a IA que facilita o uso deste site! O site tem cinco funções principais:\n' +
                          '* Extrair texto de imagens: Carregue uma imagem e clique em "Extrair Texto" para obter números e símbolos matemáticos via OCR.\n' +
                          '* Detectar cores: Clique em "Detectar Cores" para ver os códigos hexadecimais das cores da imagem.\n' +
                          '* Aplicar filtros: Use "Aplicar Filtros" para mudar a imagem com efeitos como Sépia ou Preto e Branco.\n' +
                          '* Exportar como PDF: Salve os resultados (texto, cores, cálculos ou chat) em um arquivo PDF.\n' +
                          '* Modo Matemático e IA: Resolva cálculos como "2*2/2+2" ou converse comigo para dúvidas e dicas!\n' +
                          'Quer saber mais sobre alguma função?';
            } else if (normalizedMessage.includes('processar imagem') || normalizedMessage.includes('extrair texto') || 
                       normalizedMessage.includes('ocr') || normalizedMessage.includes('prosesar imagem') || 
                       normalizedMessage.includes('estrair testo') || normalizedMessage.includes('como extrai texto') || 
                       normalizedMessage.includes('como funciona ocr') || normalizedMessage.includes('botao extrair')) {
                response = 'A função "Extrair Texto" transforma imagens em texto! Veja como funciona:\n' +
                          '* Passo 1: Arraste uma imagem ou clique em "Escolher arquivo".\n' +
                          '* Passo 2: Clique em "Extrair Texto" no canto superior direito.\n' +
                          '* Nos bastidores: Usamos Tesseract.js para OCR, focando em números (0-9) e símbolos (+, -, *, /, =).\n' +
                          '* Resultado: O texto, como "2 + 3 = 5", aparece na saída.\n' +
                          '* Dica: Tente aplicar um filtro como "Preto e Branco" para melhorar o contraste em imagens claras.\n' +
                          'Quer testar ou saber mais sobre OCR?';
            } else if (normalizedMessage.includes('detectar cor') || normalizedMessage.includes('cores') || 
                       normalizedMessage.includes('cor predominante') || normalizedMessage.includes('detetar cor') || 
                       normalizedMessage.includes('qual cor') || normalizedMessage.includes('como ve cor') || 
                       normalizedMessage.includes('como funciona cores') || normalizedMessage.includes('botao cores')) {
                response = 'A função "Detectar Cores" mostra as cores de uma imagem! Confira:\n' +
                          '* Passo 1: Carregue uma imagem.\n' +
                          '* Passo 2: Clique em "Detectar Cores" no canto superior direito.\n' +
                          '* Nos bastidores: Usamos a API Canvas para analisar pixels e gerar códigos hexadecimais (ex.: #FF0000).\n' +
                          '* Resultado: Veja até 100 cores com quadradinhos e seus códigos.\n' +
                          '* Dica: Aplique um filtro como "Inverter Cores" para ver como as cores mudam!\n' +
                          'Quer testar ou entender códigos hexadecimais?';
            } else if (normalizedMessage.includes('aplicar filtros') || normalizedMessage.includes('filtro') || 
                       normalizedMessage.includes('como aplicar filtro') || normalizedMessage.includes('filtros imagem') || 
                       normalizedMessage.includes('sepio') || normalizedMessage.includes('preto e branco') || 
                       normalizedMessage.includes('brilho') || normalizedMessage.includes('inverter cores') || 
                       normalizedMessage.includes('como funciona filtros') || normalizedMessage.includes('botao filtros')) {
                response = 'A função "Aplicar Filtros" deixa sua imagem com efeitos visuais! Veja como usar:\n' +
                          '* Passo 1: Carregue uma imagem.\n' +
                          '* Passo 2: Clique em "Aplicar Filtros" no canto superior direito.\n' +
                          '* Passo 3: Escolha um filtro (Sépia, Preto e Branco, Brilho, Inverter Cores) ou "Remover Filtro".\n' +
                          '* Nos bastidores: Usamos Canvas para alterar os pixels da imagem em tempo real.\n' +
                          '* Resultado: A imagem na prévia muda, e você pode usá-la para extrair texto ou detectar cores.\n' +
                          '* Exemplo: Aplique "Sépia" para um tom vintage ou "Preto e Branco" para mais contraste.\n' +
                          '* Dica: Filtros como "Preto e Branco" podem melhorar a extração de texto em imagens claras.\n' +
                          'Quer testar um filtro ou saber mais sobre algum?';
            } else if (normalizedMessage.includes('exportar pdf') || normalizedMessage.includes('salvar resultados') || 
                       normalizedMessage.includes('como exportar') || normalizedMessage.includes('exporta pdf') || 
                       normalizedMessage.includes('como salvar') || normalizedMessage.includes('botao exportar')) {
                response = 'A função "Exportar como PDF" salva seus resultados num arquivo! Veja como usar:\n' +
                          '* Passo 1: Use alguma função (extrair texto, detectar cores, aplicar filtros, modo matemático ou IA).\n' +
                          '* Passo 2: Clique em "Exportar como PDF" no canto superior direito.\n' +
                          '* Nos bastidores: Usamos jsPDF para criar um PDF com o texto extraído, cores detectadas, filtro aplicado, cálculos ou histórico do chat.\n' +
                          '* Resultado: Um arquivo "resultados_site.pdf" é baixado automaticamente.\n' +
                          '* Exemplo: Aplique um filtro e extraia texto, e o PDF mostrará o filtro usado.\n' +
                          '* Dica: Quanto mais resultados, mais completo o PDF!\n' +
                          'Quer testar a exportação ou saber mais?';
            } else if (normalizedMessage.includes('modo matematico') || normalizedMessage.includes('matematica') || 
                       normalizedMessage.includes('calcular') || normalizedMessage.includes('modu matematico') || 
                       normalizedMessage.includes('como calcula') || normalizedMessage.includes('calculo') || 
                       normalizedMessage.includes('como funciona matematica') || normalizedMessage.includes('botao matematico')) {
                response = 'O Modo Matemático resolve cálculos rapidinho! Veja o passo a passo:\n' +
                          '* Passo 1: Clique em "Ativar Modo Matemático" (botão verde).\n' +
                          '* Passo 2: Digite algo como "2*2/2+2" ou "quanto é 10 - 4".\n' +
                          '* Passo 3: Pressione "Enter" ou clique em "Enviar Pergunta".\n' +
                          '* Nos bastidores: Math.js calcula, respeitando a ordem de precedência.\n' +
                          '* Integração com imagens: Pergunte "qual é o cálculo na imagem?" para usar o texto extraído.\n' +
                          '* Resultado: Veja algo como "2*2/2+2 = 4".\n' +
                          '* Dica: Aplique um filtro como "Preto e Branco" para melhorar a extração de texto antes de calcular.\n' +
                          'Quer calcular algo ou saber mais sobre Math.js?';
            } else if (normalizedMessage.includes('modo ia') || normalizedMessage.includes('conversa ia') || 
                       normalizedMessage.includes('como funciona ia') || normalizedMessage.includes('modu ia') || 
                       normalizedMessage.includes('como voce funciona') || normalizedMessage.includes('funciona conversa') || 
                       normalizedMessage.includes('botao conversa')) {
                response = 'O Modo Conversa com IA sou eu, seu ajudante virtual! Como funciona:\n' +
                          '* Passo 1: Clique em "Ativar Modo Conversa com IA" (botão laranja).\n' +
                          '* Passo 2: Digite uma mensagem, como "O que você faz?" ou "Conta uma piada".\n' +
                          '* Passo 3: Pressione "Enter" ou clique em "Enviar Mensagem".\n' +
                          '* Nos bastidores: Analiso sua mensagem com JavaScript, lidando com erros de digitação e mantendo um histórico de até 10 mensagens.\n' +
                          '* O que posso fazer: Explicar o site, responder dúvidas, contar piadas ou conversar sobre tecnologia.\n' +
                          '* Exemplo: Pergunte "Como funciona o filtro sépia?" ou "Oi, tudo bem?".\n' +
                          'Quer testar uma pergunta ou saber como fui programado?';
            } else if (normalizedMessage.includes('quem e voce') || normalizedMessage.includes('quem criou') || 
                       normalizedMessage.includes('quem fez') || normalizedMessage.includes('kem e voce') || 
                       normalizedMessage.includes('quem e o criador') || normalizedMessage.includes('sobre voce')) {
                response = 'Eu sou a IA do site, seu guia virtual! Estou aqui para ajudar com o site, explicar funções e trazer um pouco de diversão. Quer saber mais sobre os filtros ou bater um papo?';
            } else if (normalizedMessage.includes('bom dia') || normalizedMessage.includes('ola') || 
                       normalizedMessage.includes('oi') || normalizedMessage.includes('bun dia') || 
                       normalizedMessage.includes('oie') || normalizedMessage.includes('hola')) {
                response = 'Bom dia, fera! Tô pronto pra ajudar. Quer brincar com filtros ou explorar outra função do site?';
            } else if (normalizedMessage.includes('tudo bem') || normalizedMessage.includes('como voce esta') || 
                       normalizedMessage.includes('ta bem') || normalizedMessage.includes('tudu bem') || 
                       normalizedMessage.includes('como ta') || normalizedMessage.includes('tá de boa')) {
                response = 'Tô de boa, e tu? Qual é a vibe hoje? Quer aplicar um filtro maneiro ou só papear?';
            } else if (normalizedMessage.includes('obrigado') || normalizedMessage.includes('valeu') || 
                       normalizedMessage.includes('agradeco') || normalizedMessage.includes('brigado') || 
                       normalizedMessage.includes('obg') || normalizedMessage.includes('vlw')) {
                response = 'Valeu pelo carinho! Tô aqui pra ajudar sempre que precisar!';
            } else if (normalizedMessage.includes('piada') || normalizedMessage.includes('engracado') || 
                       normalizedMessage.includes('me faz rir') || normalizedMessage.includes('piadinha') || 
                       normalizedMessage.includes('gracinha') || normalizedMessage.includes('conta piada')) {
                response = 'Bora rir? Por que a imagem usou o filtro sépia? Porque queria parecer vintage no PDF! Quer outra piada ou testar um filtro?';
            } else if (normalizedMessage.includes('como funciona') && lastUserMessage.includes('site')) {
                response = 'Quer saber mais do site? Ele tem cinco funções principais:\n' +
                          '* Extrair texto: Carregue uma imagem e clique em "Extrair Texto" para números e cálculos.\n' +
                          '* Detectar cores: Use "Detectar Cores" para códigos hexadecimais.\n' +
                          '* Aplicar filtros: Mude a imagem com efeitos como Sépia ou Brilho.\n' +
                          '* Exportar como PDF: Salve resultados em um arquivo PDF.\n' +
                          '* Modo Matemático e IA: Faça cálculos ou converse comigo!\n' +
                          'Qual função você quer explorar?';
            } else if (normalizedMessage.includes('o que mais') || normalizedMessage.includes('outra coisa') || 
                       normalizedMessage.includes('fazer mais') || normalizedMessage.includes('oq mais') || 
                       normalizedMessage.includes('outra koisas') || normalizedMessage.includes('tem mais')) {
                response = 'Curioso, hein? Além de extrair texto, detectar cores, aplicar filtros, exportar PDFs e conversar, posso ajudar com ideias pro site ou falar de tecnologia. Que tal testar o filtro "Inverter Cores"?';
            } else if (normalizedMessage.includes('jogo') || normalizedMessage.includes('games') || 
                       normalizedMessage.includes('jogar') || normalizedMessage.includes('jogu') || 
                       normalizedMessage.includes('game') || normalizedMessage.includes('joga')) {
                response = 'Viciado em jogos? O site não tem jogos, mas os filtros são bem divertidos, tipo brincar com a imagem! Qual seu jogo preferido?';
            } else if (normalizedMessage.includes('tecnologia') || normalizedMessage.includes('programacao') || 
                       normalizedMessage.includes('codigo') || normalizedMessage.includes('tecnolojia') || 
                       normalizedMessage.includes('programasao') || normalizedMessage.includes('codigu')) {
                response = 'Tech lover? O site usa JavaScript, Tesseract.js, Math.js, jsPDF e Canvas para os filtros. Eu sou a IA que dá vida ao papo! Quer saber mais da programação ou sugerir algo?';
            } else {
                response = 'Opa, interessante! Não peguei tudo, mas posso ajudar. Tá falando do site ou quer papear sobre outro rolê? Me dá um detalhe a mais!';
                if (chatHistory.length > 1) {
                    response += '\nA propósito, você falou sobre "' + chatHistory[chatHistory.length - 2].user + '" antes. Quer seguir nessa?';
                }
            }

            chatHistory.push({ ai: response });

            let chatDisplay = '';
            chatHistory.forEach(entry => {
                if (entry.user) {
                    chatDisplay += `Você: ${entry.user}\n`;
                }
                if (entry.ai) {
                    chatDisplay += `IA: ${entry.ai}\n`;
                }
            });

            chatOutput.textContent = chatDisplay;
            chatInput.value = '';
            chatOutput.scrollTop = chatOutput.scrollHeight;
        }, 1000);
    };
};
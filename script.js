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
    const recognizeObjectsButton = document.querySelector('button[onclick="recognizeObjects()"]');
    const exportButton = document.querySelector('button[onclick="exportToPDF()"]');
    const resetButton = document.querySelector('button[onclick="resetFile()"]');
    const dropArea = document.getElementById('dropArea');
    let mathMode = false;
    let chatMode = false;
    let extractedText = '';
    let detectedColors = [];
    let loadedImage = null;
    let isProcessing = false;
    let chatHistory = [];
    let lastMathResult = '';
    let recognizedObjects = [];

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
    recognizeObjectsButton.disabled = true;
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
        recognizeObjectsButton.disabled = false;
        exportButton.disabled = false;
        resetButton.disabled = false;
        output.innerHTML = 'O texto extraído aparecerá aqui...';
        output.classList.remove('error', 'loading');
        detectedColors = [];
        recognizedObjects = [];
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
        recognizedObjects = [];
        output.innerHTML = 'O texto extraído aparecerá aqui...';
        output.classList.remove('error', 'loading');
        mathAnswer.textContent = 'A resposta aparecerá aqui...';
        chatOutput.textContent = 'A resposta da IA aparecerá aqui...';
        chatHistory = [];
        processButton.disabled = true;
        detectColorButton.disabled = true;
        recognizeObjectsButton.disabled = true;
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
        recognizeObjectsButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;

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
            recognizeObjectsButton.disabled = false;
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
        recognizeObjectsButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;

        output.textContent = 'Carregando imagem para detecção de cores...';
        output.classList.add('loading');
        output.classList.remove('error');

        try {
            const img = new Image();
            img.src = URL.createObjectURL(loadedImage);

            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = () => {
                    throw new Error('Falha ao carregar a imagem.');
                };
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
            recognizeObjectsButton.disabled = false;
            exportButton.disabled = false;
            resetButton.disabled = false;
        }
    };

    window.recognizeObjects = async function () {
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
        recognizeObjectsButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;

        output.textContent = 'Reconhecendo objetos...';
        output.classList.add('loading');
        output.classList.remove('error');

        try {
            const img = new Image();
            img.src = URL.createObjectURL(loadedImage);

            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = () => {
                    throw new Error('Falha ao carregar a imagem.');
                };
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            // Pré-processamento: Converter para escala de cinza
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b; // Fórmula de luminância
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            ctx.putImageData(imageData, 0, 0);

            // Binarização: Aplicar threshold pra destacar bordas
            const threshold = 128;
            const binaryData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const binary = binaryData.data;
            for (let i = 0; i < binary.length; i += 4) {
                const gray = binary[i];
                const value = gray > threshold ? 255 : 0;
                binary[i] = value;
                binary[i + 1] = value;
                binary[i + 2] = value;
            }
            ctx.putImageData(binaryData, 0, 0);

            // Detecção de bordas simples (Sobel-like)
            const edgeData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const edge = new Uint8ClampedArray(canvas.width * canvas.height);
            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    const i = (y * canvas.width + x) * 4;
                    const gx = -binary[i - 4] + binary[i + 4]; // Diferença horizontal
                    const gy = -binary[i - canvas.width * 4] + binary[i + canvas.width * 4]; // Diferença vertical
                    const magnitude = Math.sqrt(gx * gx + gy * gy);
                    edge[y * canvas.width + x] = magnitude > 50 ? 255 : 0;
                }
            }

            // Encontrar contornos
            const contours = [];
            const visited = new Set();
            const minArea = 500; // Aumentado pra filtrar contornos pequenos

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = y * canvas.width + x;
                    if (edge[idx] === 255 && !visited.has(idx)) {
                        // Iniciar rastreamento de contorno
                        const contour = [];
                        const stack = [[x, y]];
                        let minX = x, maxX = x, minY = y, maxY = y;
                        let area = 0;

                        while (stack.length > 0) {
                            const [cx, cy] = stack.pop();
                            const cidx = cy * canvas.width + cx;
                            if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height || visited.has(cidx) || edge[cidx] !== 255) {
                                continue;
                            }

                            visited.add(cidx);
                            contour.push([cx, cy]);
                            area++;
                            minX = Math.min(minX, cx);
                            maxX = Math.max(maxX, cx);
                            minY = Math.min(minY, cy);
                            maxY = Math.max(maxY, cy);

                            // Adicionar vizinhos
                            stack.push([cx + 1, cy]);
                            stack.push([cx - 1, cy]);
                            stack.push([cx, cy + 1]);
                            stack.push([cx, cy - 1]);
                        }

                        // Filtrar contornos pequenos e evitar sobreposição
                        if (area > minArea) {
                            let isOverlap = false;
                            for (let existing of contours) {
                                const overlapX = maxX > existing.boundingBox.minX && minX < existing.boundingBox.maxX;
                                const overlapY = maxY > existing.boundingBox.minY && minY < existing.boundingBox.maxY;
                                if (overlapX && overlapY && Math.abs(area - existing.area) < 200) {
                                    isOverlap = true;
                                    break;
                                }
                            }
                            if (!isOverlap) {
                                contours.push({ points: contour, area, boundingBox: { minX, maxX, minY, maxY } });
                            }
                        }
                    }
                }
            }

            // Classificar objetos (simples, apenas contar como "objeto")
            recognizedObjects = [];
            if (contours.length > 0) {
                recognizedObjects.push(`${contours.length} objeto${contours.length > 1 ? 's' : ''}`);
            }

            if (recognizedObjects.length === 0) {
                output.textContent = 'Nenhum objeto reconhecido.';
            } else {
                output.textContent = `Objetos detectados: ${recognizedObjects.join(', ')}.`;
            }
            output.classList.remove('loading');
        } catch (error) {
            console.error('Erro ao reconhecer objetos:', error);
            output.textContent = 'Erro ao reconhecer objetos: ' + error.message;
            output.classList.add('error');
            output.classList.remove('loading');
        } finally {
            isProcessing = false;
            processButton.disabled = false;
            detectColorButton.disabled = false;
            recognizeObjectsButton.disabled = false;
            exportButton.disabled = false;
            resetButton.disabled = false;
        }
    };

    window.exportToPDF = function () {
        if (!loadedImage && !extractedText && detectedColors.size === 0 && !lastMathResult && chatHistory.length === 0 && recognizedObjects.length === 0) {
            output.textContent = 'Nada para exportar! Tente processar uma imagem, detectar cores, reconhecer objetos ou usar o modo matemático/IA primeiro.';
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

        if (recognizedObjects.length > 0) {
            doc.text('Objetos Detectados:', 20, y);
            y += 10;
            doc.text(recognizedObjects.join(', '), 20, y);
            y += 10;
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
                          '* Reconhecer objetos: Use "Reconhecer Objetos" para identificar itens na imagem.\n' +
                          '* Exportar como PDF: Salve os resultados (texto, cores, objetos, cálculos ou chat) em um arquivo PDF.\n' +
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
                          'Quer testar ou entender códigos hexadecimais?';
            } else if (normalizedMessage.includes('reconhecer objetos') || normalizedMessage.includes('objetos') || 
                       normalizedMessage.includes('como reconhecer objetos') || normalizedMessage.includes('reconhecer imagem') || 
                       normalizedMessage.includes('como funciona objetos') || normalizedMessage.includes('botao objetos')) {
                response = 'A função "Reconhecer Objetos" identifica itens na imagem! Veja como usar:\n' +
                          '* Passo 1: Carregue uma imagem.\n' +
                          '* Passo 2: Clique em "Reconhecer Objetos" no canto superior direito.\n' +
                          '* Nos bastidores: Usamos Canvas pra detectar contornos e identificar objetos genéricos.\n' +
                          '* Resultado: Aparece na saída, tipo "Objetos detectados: 3 objetos".\n' +
                          '* Dica: Funciona melhor com imagens claras e objetos bem definidos.\n' +
                          'Quer testar com uma imagem ou saber mais?';
            } else if (normalizedMessage.includes('exportar pdf') || normalizedMessage.includes('salvar resultados') || 
                       normalizedMessage.includes('como exportar') || normalizedMessage.includes('exporta pdf') || 
                       normalizedMessage.includes('como salvar') || normalizedMessage.includes('botao exportar')) {
                response = 'A função "Exportar como PDF" salva seus resultados num arquivo! Veja como usar:\n' +
                          '* Passo 1: Use alguma função (extrair texto, detectar cores, reconhecer objetos, modo matemático ou IA).\n' +
                          '* Passo 2: Clique em "Exportar como PDF" no canto superior direito.\n' +
                          '* Nos bastidores: Usamos jsPDF pra criar um PDF com os resultados.\n' +
                          '* Resultado: Um arquivo "resultados_site.pdf" é baixado.\n' +
                          'Quer testar a exportação?';
            } else if (normalizedMessage.includes('modo matematico') || normalizedMessage.includes('matematica') || 
                       normalizedMessage.includes('calcular') || normalizedMessage.includes('modu matematico') || 
                       normalizedMessage.includes('como calcula') || normalizedMessage.includes('calculo') || 
                       normalizedMessage.includes('como funciona matematica') || normalizedMessage.includes('botao matematico')) {
                response = 'O Modo Matemático resolve cálculos rapidinho! Veja o passo a passo:\n' +
                          '* Passo 1: Clique em "Ativar Modo Matemático" (botão verde).\n' +
                          '* Passo 2: Digite algo como "2*2/2+2".\n' +
                          '* Passo 3: Pressione "Enter" ou clique em "Enviar Pergunta".\n' +
                          '* Nos bastidores: Math.js calcula.\n' +
                          '* Resultado: Veja algo como "2*2/2+2 = 4".\n' +
                          'Quer calcular algo?';
            } else if (normalizedMessage.includes('modo ia') || normalizedMessage.includes('conversa ia') || 
                       normalizedMessage.includes('como funciona ia') || normalizedMessage.includes('modu ia') || 
                       normalizedMessage.includes('como voce funciona') || normalizedMessage.includes('funciona conversa') || 
                       normalizedMessage.includes('botao conversa')) {
                response = 'O Modo Conversa com IA sou eu, seu ajudante virtual! Como funciona:\n' +
                          '* Passo 1: Clique em "Ativar Modo Conversa com IA" (botão laranja).\n' +
                          '* Passo 2: Digite uma mensagem, como "O que você faz?".\n' +
                          '* Passo 3: Pressione "Enter" ou clique em "Enviar Mensagem".\n' +
                          '* O que posso fazer: Explicar o site ou responder dúvidas.\n' +
                          'Quer testar uma pergunta?';
            } else if (normalizedMessage.includes('quem e voce') || normalizedMessage.includes('quem criou') || 
                       normalizedMessage.includes('quem fez') || normalizedMessage.includes('kem e voce') || 
                       normalizedMessage.includes('quem e o criador') || normalizedMessage.includes('sobre voce')) {
                response = 'Eu sou a IA do site, seu guia virtual! Estou aqui pra ajudar com o site e trazer um pouco de diversão. Quer saber mais sobre as funções?';
            } else if (normalizedMessage.includes('bom dia') || normalizedMessage.includes('ola') || 
                       normalizedMessage.includes('oi') || normalizedMessage.includes('bun dia') || 
                       normalizedMessage.includes('oie') || normalizedMessage.includes('hola')) {
                response = 'Bom dia, fera! Tô pronto pra ajudar. Quer testar o reconhecimento de objetos?';
            } else if (normalizedMessage.includes('tudo bem') || normalizedMessage.includes('como voce esta') || 
                       normalizedMessage.includes('ta bem') || normalizedMessage.includes('tudu bem') || 
                       normalizedMessage.includes('como ta') || normalizedMessage.includes('tá de boa')) {
                response = 'Tô de boa, e tu? Que tal experimentar o reconhecimento de objetos?';
            } else if (normalizedMessage.includes('obrigado') || normalizedMessage.includes('valeu') || 
                       normalizedMessage.includes('agradeco') || normalizedMessage.includes('brigado') || 
                       normalizedMessage.includes('obg') || normalizedMessage.includes('vlw')) {
                response = 'Valeu pelo carinho! Tô aqui pra ajudar sempre que precisar!';
            } else {
                response = 'Opa, interessante! Não peguei tudo, mas posso ajudar. Tá falando do site? Me dá mais um detalhe!';
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

            chatOutput.textContent = chatDisplay.trim();
            chatInput.value = '';
            chatOutput.scrollTop = chatOutput.scrollHeight;
        }, 1000);
    };
};
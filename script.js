window.onload = function () {
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');
    const output = document.getElementById('output');
    const mathInteraction = document.getElementById('mathInteraction');
    const mathQuestion = document.getElementById('mathQuestion');
    const mathAnswer = document.getElementById('mathAnswer');
    const toggleMathModeButton = document.getElementById('toggleMathMode');
    const processButton = document.querySelector('button[onclick="processImage()"]');
    const detectColorButton = document.querySelector('button[onclick="detectColor()"]');
    const dropArea = document.getElementById('dropArea');
    let mathMode = false;
    let extractedText = '';
    let loadedImage = null;
    let isProcessing = false;

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
        mathMode = !mathMode;
        toggleMathModeButton.textContent = mathMode ? 'Desativar Modo Matemático' : 'Ativar Modo Matemático';
        toggleMathModeButton.classList.toggle('active', mathMode);

        if (mathMode) {
            output.style.display = 'none';
            mathInteraction.style.display = 'flex';
            mathAnswer.textContent = 'A resposta aparecerá aqui...';
        } else {
            output.style.display = 'block';
            mathInteraction.style.display = 'none';
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
        processButton.disabled = true;
        detectColorButton.disabled = true;
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
            if (!mathMode) {
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
            if (typeof math === 'undefined') {
                throw new Error('math.js não está carregado.');
            }

            const cleanExpr = question.replace(/\s+/g, '');
            if (/^\d+[+\-*/]\d+$/.test(cleanExpr)) {
                const evalResult = math.evaluate(cleanExpr);
                mathAnswer.textContent = `Resultado: ${cleanExpr} = ${evalResult}`;
                return;
            }

            if (question.toLowerCase().includes('quanto é') || question.toLowerCase().includes('qual é')) {
                const match = question.match(/\d+\s*[+\-*/]\s*\d+/);
                if (match) {
                    const expr = match[0].replace(/\s+/g, '');
                    const evalResult = math.evaluate(expr);
                    mathAnswer.textContent = `Resultado: ${expr} = ${evalResult}`;
                    return;
                }
            }

            if (question.toLowerCase().includes('texto') || question.toLowerCase().includes('imagem')) {
                const match = extractedText.match(/\d+\s*[+\-*/]\s*\d+\s*=?\s*/);
                if (match) {
                    const expr = match[0].replace(/\s+/g, '').replace(/=$/, '');
                    const evalResult = math.evaluate(expr);
                    mathAnswer.textContent = `No texto extraído: ${expr} = ${evalResult}`;
                    return;
                }
            }

            mathAnswer.textContent = 'Desculpe, não consegui entender a pergunta.';
        } catch (error) {
            console.error('Erro ao calcular:', error);
            mathAnswer.textContent = 'Erro ao calcular: ' + error.message;
        }
    };
};

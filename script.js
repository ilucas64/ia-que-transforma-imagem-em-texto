const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const output = document.getElementById('output');
const mathInteraction = document.getElementById('mathInteraction');
const mathQuestion = document.getElementById('mathQuestion');
const mathAnswer = document.getElementById('mathAnswer');
const toggleMathModeButton = document.getElementById('toggleMathMode');
let mathMode = false;
let extractedText = '';
let loadedImage = null;

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
        loadedImage = file;
    }
});

function toggleMathMode() {
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
}

function resetFile() {
    imageInput.value = '';
    preview.src = '';
    preview.style.display = 'none';
    extractedText = '';
    loadedImage = null;
    output.textContent = 'O texto extraído aparecerá aqui...';
    output.classList.remove('error', 'loading');
    mathAnswer.textContent = 'A resposta aparecerá aqui...';
}

async function preprocessImage(file) {
    try {
        const image = await Jimp.read(URL.createObjectURL(file));
        const processedImageClone = image.clone();
        processedImageClone
            .resize(1200, Jimp.AUTO)
            .grayscale()
            .contrast(1)
            .normalize()
            .blur(0.3)
            .threshold({ max: 70 });
        const processedImage = await processedImageClone.getBase64Async(Jimp.MIME_PNG);
        return { processedImage, originalImage: image };
    } catch (error) {
        console.error('Erro ao pré-processar a imagem:', error);
        return { processedImage: URL.createObjectURL(file), originalImage: null };
    }
}

async function processImage() {
    if (!loadedImage) {
        output.textContent = 'Por favor, selecione uma imagem primeiro!';
        output.classList.add('error');
        return;
    }

    output.textContent = 'Processando...';
    output.classList.add('loading');
    output.classList.remove('error');
    try {
        const { processedImage } = await preprocessImage(loadedImage);
        const { data: { text } } = await Tesseract.recognize(
            processedImage,
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

        if (!text) {
            extractedText = 'Nenhum texto reconhecido.';
        } else {
            extractedText = text;
        }

        if (!mathMode) {
            output.textContent = extractedText;
            output.classList.remove('loading');
        }
    } catch (error) {
        output.textContent = 'Erro ao processar a imagem: ' + error.message;
        output.classList.add('error');
        output.classList.remove('loading');
    }
}

async function detectColor() {
    if (!loadedImage) {
        output.textContent = 'Por favor, selecione uma imagem primeiro!';
        output.classList.add('error');
        return;
    }

    output.textContent = 'Carregando imagem para detecção de cor...';
    output.classList.add('loading');
    output.classList.remove('error');

    try {
        // Tentar ler a imagem diretamente do arquivo carregado
        console.log('Iniciando leitura da imagem com Jimp...');
        const image = await Jimp.read(URL.createObjectURL(loadedImage));
        console.log('Imagem carregada com sucesso:', image.bitmap.width, 'x', image.bitmap.height);

        output.textContent = 'Analisando cores...';
        // Amostragem de pixels com passo ajustado
        const colorCounts = {};
        const step = Math.max(1, Math.floor(Math.min(image.bitmap.width, image.bitmap.height) / 100)); // Ajustar passo dinamicamente
        console.log('Amostrando pixels com passo:', step);

        for (let x = 0; x < image.bitmap.width; x += step) {
            for (let y = 0; y < image.bitmap.height; y += step) {
                const idx = image.getPixelIndex(x, y);
                const r = image.bitmap.data[idx];
                const g = image.bitmap.data[idx + 1];
                const b = image.bitmap.data[idx + 2];
                const hex = Jimp.rgbaToInt(r, g, b, 255).toString(16).padStart(6, '0');
                colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }
        }

        console.log('Contagem de cores concluída:', colorCounts);
        const predominantColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
        const r = parseInt(predominantColor.substr(0, 2), 16);
        const g = parseInt(predominantColor.substr(2, 2), 16);
        const b = parseInt(predominantColor.substr(4, 2), 16);

        output.textContent = `Cor predominante:\nHex: #${predominantColor}\nRGB: (${r}, ${g}, ${b})`;
        output.classList.remove('loading');
    } catch (error) {
        console.error('Erro ao detectar a cor predominante:', error);
        output.textContent = 'Erro ao detectar a cor predominante: ' + error.message;
        output.classList.add('error');
        output.classList.remove('loading');
    }
}

function answerMathQuestion() {
    const question = mathQuestion.value.trim();
    if (!question) {
        mathAnswer.textContent = 'Por favor, digite uma pergunta matemática.';
        return;
    }

    try {
        const cleanExpr = question.replace(/\s+/g, '');
        if (/^\d+[+\-*/]\d+$/.test(cleanExpr)) {
            const evalResult = math.evaluate(cleanExpr);
            if (typeof evalResult !== 'undefined' && !isNaN(evalResult)) {
                mathAnswer.textContent = `Resultado: ${cleanExpr} = ${evalResult}`;
                return;
            }
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

        mathAnswer.textContent = 'Desculpe, não consegui entender a pergunta. Tente algo como "Quanto é 2 + 2?" ou "Qual é o resultado do texto?"';
    } catch (e) {
        mathAnswer.textContent = 'Erro ao calcular: ' + e.message;
    }
}
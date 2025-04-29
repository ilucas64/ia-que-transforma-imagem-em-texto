const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const output = document.getElementById('output');
const mathInteraction = document.getElementById('mathInteraction');
const mathQuestion = document.getElementById('mathQuestion');
const mathAnswer = document.getElementById('mathAnswer');
const toggleMathModeButton = document.getElementById('toggleMathMode');
let mathMode = false;
let extractedText = '';

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
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
    output.textContent = 'O texto extraído aparecerá aqui...';
    mathAnswer.textContent = 'A resposta aparecerá aqui...';
}

async function preprocessImage(file) {
    try {
        const image = await Jimp.read(URL.createObjectURL(file));
        image
            .resize(1200, Jimp.AUTO)
            .grayscale()
            .contrast(1)
            .normalize()
            .blur(0.3)
            .threshold({ max: 70 });
        const processedImage = await image.getBase64Async(Jimp.MIME_PNG);
        return { processedImage, originalImage: image };
    } catch (error) {
        console.error('Erro ao pré-processar a imagem:', error);
        return { processedImage: URL.createObjectURL(file), originalImage: null };
    }
}

async function processImage() {
    const file = imageInput.files[0];
    if (!file) {
        alert('Por favor, selecione uma imagem primeiro!');
        return;
    }

    output.textContent = 'Processando...';
    try {
        const { processedImage } = await preprocessImage(file);
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
        }
    } catch (error) {
        output.textContent = 'Erro ao processar a imagem: ' + error.message;
    }
}

async function detectColor() {
    const file = imageInput.files[0];
    if (!file) {
        alert('Por favor, selecione uma imagem primeiro!');
        return;
    }

    output.textContent = 'Detectando cor predominante...';
    try {
        const { originalImage } = await preprocessImage(file);
        if (!originalImage) throw new Error('Não foi possível carregar a imagem.');

        // Calcular a cor predominante
        const colorCounts = {};
        originalImage.scan(0, 0, originalImage.bitmap.width, originalImage.bitmap.height, (x, y, idx) => {
            const r = originalImage.bitmap.data[idx];
            const g = originalImage.bitmap.data[idx + 1];
            const b = originalImage.bitmap.data[idx + 2];
            const hex = Jimp.rgbaToInt(r, g, b, 255).toString(16).padStart(6, '0');
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        });

        const predominantColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
        const r = parseInt(predominantColor.substr(0, 2), 16);
        const g = parseInt(predominantColor.substr(2, 2), 16);
        const b = parseInt(predominantColor.substr(4, 2), 16);

        output.textContent = `Cor predominante:\nHex: #${predominantColor}\nRGB: (${r}, ${g}, ${b})`;
    } catch (error) {
        output.textContent = 'Erro ao detectar a cor: ' + error.message;
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
import os

import flask
import torch
import torchaudio
import whisper
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForSequenceClassification
from transformers import BertTokenizerFast
from transformers import HubertForSequenceClassification, Wav2Vec2FeatureExtractor
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)
audio_uploads_dir = './audio_uploads'
if not os.path.exists(audio_uploads_dir):
    os.makedirs(audio_uploads_dir)

app.config['UPLOAD_FOLDER'] = audio_uploads_dir

device = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
print(f"Текущее устройство {device}")

# Whisper для транскрибации
whisper_speech_to_text = whisper.load_model("base").to(device)

# RuBERT для распознавания тональности
sentiment_tokenizer = BertTokenizerFast.from_pretrained('blanchefort/rubert-base-cased-sentiment')
sentiment_classifier = AutoModelForSequenceClassification.from_pretrained('blanchefort/rubert-base-cased-sentiment',
                                                                          return_dict=True)

# HuBERT для классификации эмоций
emotion_feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained("facebook/hubert-large-ls960-ft")
emotion_classifier = HubertForSequenceClassification.from_pretrained(
    "xbgoose/hubert-large-speech-emotion-recognition-russian-dusha-finetuned")
num2emotion = {0: 'нейтральная', 1: 'злая', 2: 'позитивная', 3: 'грустная', 4: 'другое'}


def convert_webm_to_wav(webm_path, wav_path):
    """
    Так как с фронта аудиофайл отправляется в формате .webm, его надо конвертировать в .wav
    :param webm_path: путь к файлу .webm
    :param wav_path: путь к целевому файлу .wav
    """
    command = f"ffmpeg -i {webm_path} {wav_path} -y"
    os.system(command)


def rec_emotion(filepath: str) -> str:
    """
    Функция, использующая HuBERT, предобученный на датасете Dusha для распознавания эмоций
    :param filepath: путь к аудиофайлу
    :return: эмоция (нейтральная, злая, позитивная, грустная, другое)
    """
    waveform, sample_rate = torchaudio.load(filepath, normalize=True)
    transform = torchaudio.transforms.Resample(sample_rate, 16000)
    waveform = transform(waveform)

    inputs = emotion_feature_extractor(
        waveform,
        sample_rate=emotion_feature_extractor.sampling_rate,
        return_tensors='pt',
        padding=True,
        max_length=16000 * 10,
        truncation=True
    )
    logits = emotion_classifier(inputs['input_values'][0]).logits
    predictions = torch.argmax(logits, dim=1)
    predicted_emotion = num2emotion[predictions.numpy()[0]]
    return predicted_emotion


@torch.no_grad()
def predict_sentiment(text):
    """
    Функция, использующая RuBERT для распознавания тональности
    :param text: текст, тональность которого нужно получить
    :return: тональность (нейтральная, положительная, отрицательная)
    """
    inputs = sentiment_tokenizer(text, max_length=512, padding=True, truncation=True, return_tensors='pt')
    outputs = sentiment_classifier(**inputs)
    predicted = torch.nn.functional.softmax(outputs.logits, dim=1)
    predicted = torch.argmax(predicted, dim=1).numpy()

    labels = {
        0: 'нейтральная',
        1: 'положительная',
        2: 'отрицательная',
    }
    return labels[predicted[0]]


@app.route('/stt', methods=['POST'])
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']

    if audio_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if audio_file:
        filename = secure_filename(audio_file.filename)
        filepath = app.config['UPLOAD_FOLDER'] + "/" + filename

        webm_file_path = filepath + ".webm"
        wav_file_path = filepath + ".wav"

        audio_file.save(webm_file_path)
        convert_webm_to_wav(webm_file_path, wav_file_path)

        try:
            result = whisper_speech_to_text.transcribe(wav_file_path)
            result["sentiment"] = predict_sentiment(result["text"])
            result["emotion"] = rec_emotion(wav_file_path)
            return jsonify(result)
        except BaseException as e:
            return jsonify({'error': f'Speech Recognition request failed: {str(e)}', "text": "<ERROR>"}), 500

    return jsonify({'error': f'Unknown', "text": "<ERROR>"}), 500


@app.route('/')
def index():
    return flask.render_template("index.html")


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=8050)

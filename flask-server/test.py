import torchaudio


waveform, sample_rate = torchaudio.load("./audio_uploads/blob.webm")
print(waveform)
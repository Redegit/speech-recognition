import React, { useState, useRef, useEffect } from 'react';
import "./app.scss"
import GitHub from './GitHub';
import Mic from './Mic';

const App = () => {
  const [seconds, setSeconds] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState("initial");
  const [requestBody, setRequestBody] = useState({});

  useEffect(() => {
    let timer;

    if (status === 'recording') {
      timer = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => clearInterval(timer);
  }, [status]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);
      audioChunksRef.current = [];

      const formData = new FormData();
      formData.append('audio', audioBlob);
      setRequestBody(formData);


      setStatus('idle')
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setStatus('recording');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const sendToServer = async () => {
    setStatus('waiting');
    try {
      const server_address = '' // прописать адрес сервера, для дев-сервера || для билда - пустая строка
      const response = await fetch(`${server_address}/stt`, {
        method: 'POST',
        body: requestBody,
      });
      const data = await response.json();
      console.log(data);
      setResult(data);
    } catch (error) {
      console.error('Error during server request:', error);
    }
    setStatus('idle');
  }

  return (
    <div className='container'>
      <div className="title">Распознавание аудио на основе OpenAI Whisper и RuBERT</div>
      <button className='mic-button' data-recording={status === 'recording'} disabled={status === 'waiting'} onClick={status === 'recording' ? stopRecording : startRecording}>
        <Mic />
      </button>
      {status === 'idle' && <button onClick={sendToServer} className="send-button">{"Отправить >"}</button>}

      <div className='time' data-recording={status === 'recording'} >{status === 'waiting' ? "Распознавание речи..." : `Время записи: ${seconds} с.`}</div>


      {['idle'].includes(status) && <div className="audio-player">
        <audio src={audioSrc} controls />
      </div>}


      {result && status === 'idle'
        ? <div className="text">
          <div>Язык: {result.language}</div>
          <div className='transcription'>Транскрипция: {result.text}</div>
          <div>Тональность: {result.sentiment}</div>
          <div>Эмоция: {result.emotion}</div>
        </div>
        : status === 'initial' && "Нажмите на микрофон, чтобы начать запись"
      }

      <GitHub />
    </div>
  );
};

export default App;

import React, { useState, useRef, useEffect } from 'react';
import "./app.scss"
import GitHub from './GitHub';
import Mic from './Mic';

const App = () => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [result, setResult] = useState(null)
  const [waitingResponse, setWaitingResponse] = useState(false);

  useEffect(() => {
    let timer;

    if (recording) {
      timer = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => clearInterval(timer);
  }, [recording]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      setWaitingResponse(true)
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioChunksRef.current = [];

  
      // console.log("Продолжительность аудио: ", );

      const formData = new FormData();
      formData.append('audio', audioBlob);

      try {
        const response = await fetch('/stt', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        setResult(data)
      } catch (error) {
        setResult({text: "test"})
        console.error('Error during server request:', error);
      }
      setWaitingResponse(false)
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };


  return (
    <div className='container'>
      <div className="title">Распознавание аудио на основе OpenAI Whisper и RuBERT</div>
      <button className={recording ? 'active' : ''} disabled={waitingResponse} onClick={recording ? stopRecording : startRecording}>
        <Mic />
      </button>
      <p className='time' data-recording={recording} >{waitingResponse ? "Распознавание речи..." : `Время записи: ${seconds} с.`}</p>


      <div className="audio-player">
        <audio ref={audioRef} controls />
      </div>


      {result
        ? <div className="text">
          <div>Язык: {result.language}</div>
          <div className='transcription'>Транскрипция: {result.text}</div>
          <div>Тональность: {result.sentiment}</div>
          <div>Эмоция: {result.emotion}</div>
        </div>
        : !result && !recording && !waitingResponse && "Нажмите на микрофон, чтобы начать запись"
      }

      <GitHub />
    </div>
  );
};

export default App;

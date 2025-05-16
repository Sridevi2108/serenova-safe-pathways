import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import FloatingLabelTextarea from '../components/FloatingLabelTextarea';
import { useToast } from '@/hooks/use-toast';

const ReportIncidentPage = () => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    location: '',
    type: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f43f5e';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      source.connect(analyser);

      analyserRef.current = analyser;
      audioContextRef.current = audioContext;

      drawWaveform();

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setRecordedChunks([]);
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };

      recorder.start();
    } catch (err) {
      console.error('Mic access denied:', err);
      toast({
        title: 'Microphone Permission Denied',
        description: 'Please allow microphone access to record audio.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    }
  };

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'audio/webm; codecs=opus' });
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
      setAudioFile(file);
      const audioUrl = URL.createObjectURL(blob);
      setAudioPreviewUrl(audioUrl);
      console.log('Preview URL:', audioUrl);
    }
  }, [isRecording]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location || !formData.type || !formData.description) {
      toast({
        title: 'Missing information',
        description: 'Please complete all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: 'Image Required',
        description: 'Please upload an image as evidence.',
        variant: 'destructive',
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('location', formData.location);
    formDataToSend.append('incidentType', formData.type);
    formDataToSend.append('description', formData.description);
    if (imageFile) formDataToSend.append('image', imageFile);
    if (audioFile) formDataToSend.append('audio', audioFile);

    try {
      const res = await fetch('http://localhost:5000/api/report_incident', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: `Risk Level: ${data.risk_level}`,
          description: `NLP Score: ${data.nlp_score}, Image Score: ${data.image_score}`,
        });
      } else {
        toast({
          title: 'Prediction Failed',
          description: data.error || 'Unable to determine threat level.',
          variant: 'destructive',
        });
      }

      setFormData({ location: '', type: '', description: '' });
      setImageFile(null);
      setImagePreview(null);
      setAudioFile(null);
      setAudioPreviewUrl(null);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Server Error',
        description: 'Something went wrong while submitting the report.',
        variant: 'destructive',
      });
    }
  };

  const incidentTypes = [
    { value: '', label: 'Select an incident type' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'theft', label: 'Theft' },
    { value: 'assault', label: 'Assault' },
    { value: 'suspicious', label: 'Suspicious Activity' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <h1 className="page-header">Report an Incident Anonymously</h1>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <FloatingLabelInput
              id="location"
              name="location"
              type="text"
              label="Location (street address or landmark)"
              value={formData.location}
              onChange={handleChange}
            />

            <div className="input-field mb-4">
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-serenova-200"
              >
                {incidentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <label htmlFor="type" className={formData.type ? "-top-2 text-xs bg-white text-serenova-600" : ""}>
                Incident Type
              </label>
            </div>

            <FloatingLabelTextarea
              id="description"
              name="description"
              label="Description (what happened?)"
              value={formData.description}
              onChange={handleChange}
            />

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload an Image <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-2 h-32 object-cover border rounded"
                />
              )}
            </div>

            {/* Audio Recording */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Record Audio (Optional)
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-4 py-2 rounded-full font-medium ${
                      isRecording ? 'bg-red-600 text-white' : 'bg-serenova-100 text-serenova-700'
                    }`}
                  >
                    {isRecording ? 'Stop ⏹️' : 'Record 🎙️'}
                  </button>

                  {audioPreviewUrl && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Preview Audio:</p>
                      <audio ref={audioRef} controls className="w-full">
                        <source src={audioPreviewUrl} type="audio/webm; codecs=opus" />
                        <source src={audioPreviewUrl} type="audio/ogg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>
                <canvas
                  ref={canvasRef}
                  className="w-full h-24 bg-white border rounded cursor-pointer"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.play();
                    }
                  }}
                ></canvas>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-serenova-500 focus:ring-serenova-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-600">
                  I understand that this report will be anonymous and may be used to alert other users.
                </span>
              </label>
            </div>

            <button type="submit" className="btn-primary w-full">
              Submit Report
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ReportIncidentPage;

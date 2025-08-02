/**
 * Agente de Percepción Local - Acceso real a cámara, micrófono y archivos
 */

import { LocalCognitiveFabric } from '../../core/local/LocalCognitiveFabric';

export interface SensorCapabilities {
  camera: boolean;
  microphone: boolean;
  fileSystem: boolean;
  geolocation: boolean;
}

export interface PerceptionData {
  type: 'visual' | 'audio' | 'file' | 'location';
  data: any;
  confidence: number;
  timestamp: Date;
  metadata?: any;
}

export class LocalPerceptionAgent {
  private fabric: LocalCognitiveFabric;
  private capabilities: SensorCapabilities;
  private isRunning = false;
  private mediaStream?: MediaStream;
  private audioContext?: AudioContext;

  constructor(fabric: LocalCognitiveFabric) {
    this.fabric = fabric;
    this.capabilities = {
      camera: false,
      microphone: false,
      fileSystem: false,
      geolocation: false
    };
  }

  async initialize(): Promise<void> {
    await this.detectCapabilities();
    
    await this.fabric.subscribe('perception.commands', (event) => {
      this.handleCommand(event.payload);
    });

    this.isRunning = true;
    console.log('Local Perception Agent initialized');
  }

  private async detectCapabilities(): Promise<void> {
    // Detectar cámara
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.capabilities.camera = devices.some(device => device.kind === 'videoinput');
      this.capabilities.microphone = devices.some(device => device.kind === 'audioinput');
    } catch (error) {
      console.warn('Media devices not accessible');
    }

    // Detectar File System Access API
    this.capabilities.fileSystem = 'showOpenFilePicker' in window;

    // Detectar geolocalización
    this.capabilities.geolocation = 'geolocation' in navigator;
  }

  async startCameraCapture(): Promise<void> {
    if (!this.capabilities.camera) {
      throw new Error('Camera not available');
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });

      const video = document.createElement('video');
      video.srcObject = this.mediaStream;
      video.play();

      // Capturar frames periódicamente
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const captureFrame = () => {
        if (!this.isRunning) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        this.fabric.publish('perception.visual', {
          type: 'visual',
          data: imageData,
          confidence: 0.9,
          timestamp: new Date(),
          metadata: { width: canvas.width, height: canvas.height }
        });
        
        setTimeout(captureFrame, 1000); // 1 FPS
      };
      
      video.onloadedmetadata = captureFrame;
      
    } catch (error) {
      throw new Error(`Camera access failed: ${error}`);
    }
  }

  async startAudioCapture(): Promise<void> {
    if (!this.capabilities.microphone) {
      throw new Error('Microphone not available');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const processAudio = () => {
        if (!this.isRunning) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calcular nivel de audio
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        
        this.fabric.publish('perception.audio', {
          type: 'audio',
          data: { level: average, frequencies: Array.from(dataArray) },
          confidence: 0.8,
          timestamp: new Date(),
          metadata: { sampleRate: this.audioContext!.sampleRate }
        });
        
        setTimeout(processAudio, 100); // 10 Hz
      };
      
      processAudio();
      
    } catch (error) {
      throw new Error(`Microphone access failed: ${error}`);
    }
  }

  async readLocalFiles(): Promise<void> {
    if (!this.capabilities.fileSystem) {
      throw new Error('File System Access not available');
    }

    try {
      const fileHandles = await (window as any).showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: 'Text files',
            accept: { 'text/*': ['.txt', '.md', '.json', '.csv'] }
          }
        ]
      });

      for (const fileHandle of fileHandles) {
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        this.fabric.publish('perception.file', {
          type: 'file',
          data: {
            name: file.name,
            size: file.size,
            type: file.type,
            content: content.substring(0, 10000) // Limitar a 10KB
          },
          confidence: 1.0,
          timestamp: new Date(),
          metadata: { lastModified: new Date(file.lastModified) }
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw new Error(`File access failed: ${error}`);
      }
    }
  }

  async getLocation(): Promise<void> {
    if (!this.capabilities.geolocation) {
      throw new Error('Geolocation not available');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.fabric.publish('perception.location', {
            type: 'location',
            data: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed
            },
            confidence: Math.min(1.0, 100 / position.coords.accuracy),
            timestamp: new Date(),
            metadata: { timestamp: position.timestamp }
          });
          resolve();
        },
        (error) => reject(new Error(`Geolocation failed: ${error.message}`)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  private async handleCommand(payload: any): Promise<void> {
    switch (payload.command) {
      case 'start_camera':
        await this.startCameraCapture();
        break;
      case 'start_audio':
        await this.startAudioCapture();
        break;
      case 'read_files':
        await this.readLocalFiles();
        break;
      case 'get_location':
        await this.getLocation();
        break;
      case 'get_capabilities':
        await this.fabric.publish('perception.capabilities', this.capabilities);
        break;
    }
  }

  getCapabilities(): SensorCapabilities {
    return { ...this.capabilities };
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
    }
  }
}
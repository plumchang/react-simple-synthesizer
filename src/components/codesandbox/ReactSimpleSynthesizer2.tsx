import { useState, useRef, useEffect } from "react";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

type WaveType = "sine" | "square" | "sawtooth" | "triangle";

const ReactSimpleSynthesizer2 = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [volume, setVolume] = useState(0.5);
  const [waveType, setWaveType] = useState<WaveType>("sine");

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        volume,
        audioContextRef.current?.currentTime || 0
      );
    }
  }, [volume]);

  const toggleSound = () => {
    if (isPlaying) {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
    } else {
      oscillatorRef.current = audioContextRef.current!.createOscillator();
      oscillatorRef.current.type = waveType;
      oscillatorRef.current.frequency.setValueAtTime(
        frequency,
        audioContextRef.current!.currentTime
      );
      oscillatorRef.current.connect(gainNodeRef.current!);
      oscillatorRef.current.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleFrequencyChange = (_: Event, newFrequency: number | number[]) => {
    const frequency = Array.isArray(newFrequency)
      ? newFrequency[0]
      : newFrequency;
    setFrequency(frequency);
    if (oscillatorRef.current) {
      oscillatorRef.current.frequency.setValueAtTime(
        frequency,
        audioContextRef.current!.currentTime
      );
    }
  };

  const handleVolumeChange = (_: Event, newVolume: number | number[]) => {
    const volume = Array.isArray(newVolume) ? newVolume[0] : newVolume;
    setVolume(volume);
  };

  const handleWaveTypeChange = (event: SelectChangeEvent) => {
    const newWaveType = event.target.value as WaveType;
    setWaveType(newWaveType);
    if (oscillatorRef.current) {
      oscillatorRef.current.type = newWaveType;
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-2xl font-bold text-center">
        React Simple Synthesizer 2
      </h1>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Wave Type
        </label>
        <Select size="small" value={waveType} onChange={handleWaveTypeChange}>
          <MenuItem value="sine">Sine</MenuItem>
          <MenuItem value="square">Square</MenuItem>
          <MenuItem value="sawtooth">Sawtooth</MenuItem>
          <MenuItem value="triangle">Triangle</MenuItem>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Frequency: {frequency.toFixed(0)} Hz
        </label>
        <Slider
          min={20}
          max={2000}
          step={1}
          value={[frequency]}
          onChange={handleFrequencyChange}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Volume: {(volume * 100).toFixed(0)}%
        </label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onChange={handleVolumeChange}
        />
      </div>
      <Button variant="contained" onClick={toggleSound} className="w-full">
        {isPlaying ? "Stop" : "Play"}
      </Button>
    </div>
  );
};

export default ReactSimpleSynthesizer2;

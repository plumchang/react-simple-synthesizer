import React, { useState, useRef, useEffect } from "react";
import Slider from "@mui/material/Slider";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

type WaveType = "sine" | "square" | "sawtooth" | "triangle";
type Note =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

const noteToFrequency = (note: Note, octave: number): number => {
  const notes: Note[] = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const baseFreq = 440; // A4
  const semitones =
    notes.indexOf(note) - notes.indexOf("A") + (octave - 4) * 12;
  return baseFreq * Math.pow(2, semitones / 12);
};

const ReactSimpleSynthesizer3 = () => {
  const [frequency, setFrequency] = useState(440);
  const [volume, setVolume] = useState(0.5);
  const [waveType, setWaveType] = useState<WaveType>("sine");
  const [note, setNote] = useState<Note>("A");
  const [octave, setOctave] = useState(4);

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

  useEffect(() => {
    const newFrequency = noteToFrequency(note, octave);
    setFrequency(newFrequency);
  }, [note, octave]);

  const startSound = (noteToPlay?: Note) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    oscillatorRef.current = ctx.createOscillator();
    oscillatorRef.current.type = waveType;
    if (noteToPlay) {
      oscillatorRef.current.frequency.setValueAtTime(
        noteToFrequency(noteToPlay, octave),
        ctx.currentTime
      );
    } else {
      oscillatorRef.current.frequency.setValueAtTime(
        frequency,
        ctx.currentTime
      );
    }
    oscillatorRef.current.connect(gainNodeRef.current!);
    oscillatorRef.current.start();
  };

  const stopSound = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
  };

  const handleNotePress =
    (noteToPlay: Note) => (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      setNote(noteToPlay);
      startSound(noteToPlay);

      const handleRelease = () => {
        stopSound();
        document.removeEventListener("mouseup", handleRelease);
        document.removeEventListener("touchend", handleRelease);
      };

      document.addEventListener("mouseup", handleRelease);
      document.addEventListener("touchend", handleRelease);
    };

  const handleVolumeChange = (_: Event, newVolume: number | number[]) => {
    const volume = Array.isArray(newVolume) ? newVolume[0] : newVolume;
    setVolume(volume);
  };

  const handleWaveTypeChange = (event: SelectChangeEvent) => {
    const newWaveType = event.target.value as WaveType;
    setWaveType(newWaveType);
  };

  const notes: Note[] = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-2xl font-bold text-center">
        React Simple Synthesizer 3
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
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <div className="flex justify-center">
          {notes.map((n) => (
            <button
              key={n}
              onMouseDown={handleNotePress(n)}
              onTouchStart={handleNotePress(n)}
              className={`w-8 h-24 border border-gray-300 ${
                n.includes("#")
                  ? "bg-black text-white -mx-2 z-10 h-16"
                  : "bg-white"
              } ${note === n ? "bg-blue-200" : ""}`}
              aria-pressed={note === n}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-center space-x-2 mt-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((o) => (
            <button
              key={o}
              onClick={() => setOctave(o)}
              className={`px-2 py-1 border rounded ${
                octave === o ? "bg-blue-500 text-white" : "bg-white"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Frequency: {frequency.toFixed(2)} Hz
        </p>
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
    </div>
  );
};

export default ReactSimpleSynthesizer3;

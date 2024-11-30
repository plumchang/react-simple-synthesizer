"use client";

import React, { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

const Synthesizer = () => {
  const [frequency, setFrequency] = useState(440);
  const [volume, setVolume] = useState(0.5);
  const [waveType, setWaveType] = useState<WaveType>("sine");
  const [note, setNote] = useState<Note>("A");
  const [octave, setOctave] = useState(4);
  const [useNote, setUseNote] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attack, setAttack] = useState(0.1);
  const [decay, setDecay] = useState(0.1);
  const [sustain, setSustain] = useState(0.5);
  const [release, setRelease] = useState(0.5);
  const [reverbAmount, setReverbAmount] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const envelopeGainNodeRef = useRef<GainNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const dryGainNodeRef = useRef<GainNode | null>(null);
  const wetGainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    gainNodeRef.current = audioContextRef.current.createGain();
    envelopeGainNodeRef.current = audioContextRef.current.createGain();
    convolverNodeRef.current = audioContextRef.current.createConvolver();
    dryGainNodeRef.current = audioContextRef.current.createGain();
    wetGainNodeRef.current = audioContextRef.current.createGain();

    // Create impulse response for reverb
    const impulseLength = 2 * audioContextRef.current.sampleRate;
    const impulse = audioContextRef.current.createBuffer(
      2,
      impulseLength,
      audioContextRef.current.sampleRate
    );
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < impulseLength; i++) {
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
    }
    convolverNodeRef.current.buffer = impulse;

    // Connect nodes
    envelopeGainNodeRef.current.connect(dryGainNodeRef.current);
    envelopeGainNodeRef.current.connect(convolverNodeRef.current);
    convolverNodeRef.current.connect(wetGainNodeRef.current);
    dryGainNodeRef.current.connect(gainNodeRef.current);
    wetGainNodeRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioContextRef.current.destination);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.type = waveType;
    }
  }, [waveType]);

  useEffect(() => {
    if (dryGainNodeRef.current && wetGainNodeRef.current) {
      dryGainNodeRef.current.gain.setValueAtTime(
        1 - reverbAmount,
        audioContextRef.current?.currentTime || 0
      );
      wetGainNodeRef.current.gain.setValueAtTime(
        reverbAmount,
        audioContextRef.current?.currentTime || 0
      );
    }
  }, [reverbAmount]);

  useEffect(() => {
    if (useNote) {
      const newFrequency = noteToFrequency(note, octave);
      setFrequency(newFrequency);
    }
  }, [note, octave, useNote]);

  const startSound = (noteToPlay?: Note) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    oscillatorRef.current = ctx.createOscillator();
    oscillatorRef.current.type = waveType;
    if (useNote && noteToPlay) {
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
    oscillatorRef.current.connect(envelopeGainNodeRef.current!);

    // Apply ADSR envelope
    const now = ctx.currentTime;
    envelopeGainNodeRef.current!.gain.cancelScheduledValues(now);
    envelopeGainNodeRef.current!.gain.setValueAtTime(0, now);
    envelopeGainNodeRef.current!.gain.linearRampToValueAtTime(1, now + attack);
    envelopeGainNodeRef.current!.gain.linearRampToValueAtTime(
      sustain,
      now + attack + decay
    );

    oscillatorRef.current.start();
  };

  const stopSound = () => {
    if (oscillatorRef.current && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      envelopeGainNodeRef.current!.gain.cancelScheduledValues(now);
      envelopeGainNodeRef.current!.gain.setValueAtTime(
        envelopeGainNodeRef.current!.gain.value,
        now
      );
      envelopeGainNodeRef.current!.gain.linearRampToValueAtTime(
        0,
        now + release
      );
      oscillatorRef.current.stop(now + release);
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

  const handleFrequencyChange = (newFrequency: number[]) => {
    setFrequency(newFrequency[0]);
    if (oscillatorRef.current) {
      oscillatorRef.current.frequency.setValueAtTime(
        newFrequency[0],
        audioContextRef.current!.currentTime
      );
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0]);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        newVolume[0],
        audioContextRef.current!.currentTime
      );
    }
  };

  const handleWaveTypeChange = (newWaveType: WaveType) => {
    setWaveType(newWaveType);
    if (oscillatorRef.current) {
      oscillatorRef.current.type = newWaveType;
    }
  };

  const toggleSound = () => {
    if (isPlaying) {
      stopSound();
    } else {
      startSound(note);
    }
    setIsPlaying(!isPlaying);
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
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-2xl font-bold text-center">
        React Simple Synthesizer
      </h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Wave Type
          </label>
          <Select onValueChange={handleWaveTypeChange} value={waveType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select wave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sine">Sine</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="sawtooth">Sawtooth</SelectItem>
              <SelectItem value="triangle">Triangle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="use-note"
            checked={useNote}
            onCheckedChange={setUseNote}
          />
          <Label htmlFor="use-note">Use Note</Label>
        </div>
      </div>
      {useNote ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
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
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Frequency: {frequency.toFixed(0)} Hz
          </label>
          <Slider
            min={20}
            max={2000}
            step={1}
            value={[frequency]}
            onValueChange={handleFrequencyChange}
          />
        </div>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Volume: {(volume * 100).toFixed(0)}%
        </label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={handleVolumeChange}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Attack: {attack.toFixed(2)}s
          </label>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={[attack]}
            onValueChange={(value) => setAttack(value[0])}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Decay: {decay.toFixed(2)}s
          </label>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={[decay]}
            onValueChange={(value) => setDecay(value[0])}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Sustain: {sustain.toFixed(2)}
          </label>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[sustain]}
            onValueChange={(value) => setSustain(value[0])}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Release: {release.toFixed(2)}s
          </label>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={[release]}
            onValueChange={(value) => setRelease(value[0])}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Reverb: {(reverbAmount * 100).toFixed(0)}%
        </label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[reverbAmount]}
          onValueChange={(value) => setReverbAmount(value[0])}
        />
      </div>
      {!useNote && (
        <Button
          onClick={toggleSound}
          className="w-full"
          aria-pressed={isPlaying}
        >
          {isPlaying ? "Stop" : "Play"}
        </Button>
      )}
    </div>
  );
};

export default Synthesizer;

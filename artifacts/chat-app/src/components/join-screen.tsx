import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function JoinScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onJoin(trimmed);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-zinc-50 relative overflow-hidden font-sans">
      
      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 md:p-10 bg-white rounded-[2rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100 z-10"
      >
        <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-primary/20">
          <Activity className="w-7 h-7" />
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 mb-3">
          Join Pulse
        </h1>
        <p className="text-base text-zinc-500 mb-10 leading-relaxed">
          The studio break room is alive. Enter your name to jump into the conversation.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">
              Display Name
            </Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we call you?"
              className="h-14 px-5 text-lg rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-zinc-400"
              autoFocus
              autoComplete="off"
              maxLength={32}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!name.trim()}
            className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
          >
            Step Inside <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
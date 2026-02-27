'use client';

import React, { useState } from 'react';

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Şifre',
  disabled = false,
  className = '',
  'aria-label': ariaLabel = 'Şifre alanı',
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby="password-toggle-desc"
        className={`w-full border border-[#e2e8f0] rounded-xl px-4 py-3.5 pr-12 text-base text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#15803d] disabled:opacity-70 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none p-1 text-[#64748b] hover:text-[#0f172a]"
      >
        {visible ? '🙈' : '👁'}
      </button>
      <span id="password-toggle-desc" className="sr-only">
        {visible ? 'Şifre görünür. Gizlemek için butona tıklayın.' : 'Şifre gizli. Göstermek için butona tıklayın.'}
      </span>
    </div>
  );
}

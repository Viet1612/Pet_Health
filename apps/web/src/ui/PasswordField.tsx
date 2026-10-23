import { forwardRef, useState } from 'react';

import { TextField, type TextFieldProps } from './TextField';

/** Ô mật khẩu có nút chữ "Hiện"/"Ẩn" bên phải (aria-pressed). */
export const PasswordField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, 'type' | 'trailing'>
>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => {
            setVisible((v) => !v);
          }}
          className="text-small text-text-muted min-h-11 px-3 font-semibold"
        >
          {visible ? 'Ẩn' : 'Hiện'}
        </button>
      }
      {...props}
    />
  );
});

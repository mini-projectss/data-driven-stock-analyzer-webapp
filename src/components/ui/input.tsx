// src/components/ui/input.tsx
import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  // add any custom props your project uses here (optional)
};

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  // allow className override and keep other props
  const { className = "", ...rest } = props;

  return (
    <input
      ref={ref}
      {...rest}
      // default styling — adjust to your theme if needed
      className={`w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-white placeholder:text-neutral-text/60 focus:outline-none focus:ring-2 focus:ring-accent-teal ${className}`}
    />
  );
});

Input.displayName = "Input";

export { Input };
export default Input;

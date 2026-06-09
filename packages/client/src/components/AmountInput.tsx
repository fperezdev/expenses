import type { ChangeEvent } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function AmountInput({ value, onChange }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw);
  };

  return (
    <div className="relative mt-1">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-400">
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value ? Number(value).toLocaleString("es-CL") : ""}
        onChange={handleChange}
        placeholder="0"
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-8 text-right text-lg font-semibold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
      />
    </div>
  );
}
